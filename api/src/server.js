import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { z } from 'zod'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { moneyKzt, normalizePhone, toAdminApplication, toPublicSession } from './utils.js'
import { downloadWhatsappMedia, sendTemplateMessage, sendTextMessage } from './whatsapp.js'
import { signSession, verifyPassword, verifySession, hashPassword } from './auth.js'
import { initStorage, putReceipt, getReceipt } from './storage.js'

const adminPasswordHash = hashPassword(config.adminPassword)

await initStorage()

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || config.corsOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`Origin ${origin} is not allowed`))
  },
}))
app.use(express.json({ limit: '2mb' }))

app.get('/uploads/:key', async (req, res, next) => {
  try {
    const { stream, contentType, size } = await getReceipt(req.params.key)
    if (contentType) res.setHeader('Content-Type', contentType)
    if (size) res.setHeader('Content-Length', size)
    res.setHeader('Cache-Control', 'private, max-age=300')
    stream.pipe(res)
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Receipt not found' })
    if (err.statusCode === 400) return res.status(400).json({ error: err.message })
    next(err)
  }
})

const requireAdmin = (req, res, next) => {
  const bearer = req.header('authorization') || ''
  if (bearer.startsWith('Bearer ')) {
    const session = verifySession(bearer.slice(7).trim(), config.sessionSecret)
    if (session?.sub) {
      req.adminUser = session.sub
      return next()
    }
  }
  const token = req.header('x-admin-token') || req.query.adminToken
  if (token && token === config.adminToken) {
    req.adminUser = 'token'
    return next()
  }
  return res.status(401).json({ error: 'Unauthorized' })
}

const asyncRoute = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    next(error)
  }
}

const applicationInclude = {
  lead: true,
  session: { include: { applications: true } },
  payments: { orderBy: { createdAt: 'desc' } },
}

const getApplication = (id) =>
  prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
  })

const logAudit = (action, entity, entityId, payload = {}, actor = 'admin') =>
  prisma.auditLog.create({ data: { action, entity, entityId, payload, actor } })

const ruWeekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

const parseSessionDate = (date) => new Date(`${date}T00:00:00.000Z`)

const inferDay = (date) => ruWeekdays[parseSessionDate(date).getUTCDay()]

const createOutboundLog = async ({ application, templateName, body, result }) =>
  prisma.whatsappMessage.create({
    data: {
      leadId: application.leadId,
      applicationId: application.id,
      direction: 'OUTBOUND',
      templateName,
      body,
      status: result?.skipped ? 'QUEUED' : 'SENT',
      waMessageId: result?.messages?.[0]?.id,
      payload: result || {},
    },
  })

const sendConfiguredTemplate = async ({ application, templateName, parameters, fallbackBody }) => {
  const to = application.lead?.whatsapp || application.lead?.phone
  if (!to) return null

  const result = templateName
    ? await sendTemplateMessage({ to, templateName, parameters })
    : { skipped: true, reason: 'WhatsApp template is not configured' }

  return createOutboundLog({ application, templateName, body: fallbackBody, result })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'growvibe-api' })
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const body = loginSchema.parse(req.body)
  const usernameOk = body.username === config.adminUsername
  const passwordOk = verifyPassword(body.password, adminPasswordHash)
  if (!usernameOk || !passwordOk) {
    return res.status(401).json({ error: 'Неверный логин или пароль' })
  }
  const ttl = config.sessionTtlSeconds
  const token = signSession({ sub: body.username, role: 'admin' }, config.sessionSecret, ttl)
  res.json({
    token,
    username: body.username,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  })
}))

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ username: req.adminUser })
})

app.get('/api/public/config', (_req, res) => {
  res.json({
    kaspiPhone: config.kaspiPhone,
    kaspiAmount: config.kaspiAmount,
    publicBaseUrl: config.publicBaseUrl,
  })
})

app.get('/api/public/sessions', asyncRoute(async (_req, res) => {
  const sessions = await prisma.trainingSession.findMany({
    where: {
      status: { notIn: ['CANCELLED'] },
    },
    include: { applications: true },
    orderBy: { date: 'asc' },
  })
  res.json({ sessions: sessions.map(toPublicSession) })
}))

const applicationSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  whatsapp: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  instagram: z.string().optional().default(''),
  source: z.string().optional().default('landing'),
  sessionPublicId: z.string().min(1),
  flowCompleted: z.boolean().optional().default(false),
  readinessConfirmed: z.boolean().optional().default(false),
  conditionsConfirmed: z.boolean().optional().default(false),
  comment: z.string().optional().default(''),
})

app.post('/api/public/applications', asyncRoute(async (req, res) => {
  const body = applicationSchema.parse(req.body)
  const phone = normalizePhone(body.phone)
  const whatsapp = normalizePhone(body.whatsapp || body.phone)

  const session = await prisma.trainingSession.findUnique({
    where: { publicId: body.sessionPublicId },
    include: { applications: true },
  })

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const paidCount = session.applications.filter((item) => ['PAID', 'CONFIRMED', 'ATTENDED'].includes(item.status)).length
  if (paidCount >= session.seatsTotal || ['FULL', 'CLOSED', 'CANCELLED'].includes(session.status)) {
    return res.status(409).json({ error: 'Session is full' })
  }

  const lead = await prisma.lead.upsert({
    where: { phone },
    update: {
      name: body.name,
      whatsapp,
      email: body.email || null,
      instagram: body.instagram || null,
      source: body.source,
    },
    create: {
      name: body.name,
      phone,
      whatsapp,
      email: body.email || null,
      instagram: body.instagram || null,
      source: body.source,
    },
  })

  let application = await prisma.application.findFirst({
    where: {
      leadId: lead.id,
      sessionId: session.id,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: applicationInclude,
  })

  if (!application) {
    application = await prisma.application.create({
      data: {
        leadId: lead.id,
        sessionId: session.id,
        status: 'PAYMENT_PENDING',
        flowCompleted: body.flowCompleted,
        readinessConfirmed: body.readinessConfirmed,
        conditionsConfirmed: body.conditionsConfirmed,
        comment: body.comment || null,
        nextStep: 'Ожидает оплату и чек',
        payments: {
          create: {
            amountKzt: session.priceKzt,
            status: 'PENDING',
          },
        },
      },
      include: applicationInclude,
    })

    await logAudit('application.created', 'Application', application.id, {
      leadId: lead.id,
      sessionId: session.id,
    }, 'public')
  }

  await sendConfiguredTemplate({
    application,
    templateName: config.whatsapp.templates.applicationReceived,
    parameters: [body.name, session.city, session.day, session.time, moneyKzt(session.priceKzt)],
    fallbackBody: `Заявка принята: ${session.city}, ${session.day}, ${session.time}. Для закрепления места отправьте чек оплаты ${moneyKzt(session.priceKzt)}.`,
  })

  res.status(201).json({
    applicationId: application.id,
    status: application.status,
    payment: {
      amountKzt: session.priceKzt,
      kaspiPhone: config.kaspiPhone,
      comment: `${session.city} ${session.day} ${body.name}`,
    },
  })
}))

app.post('/api/public/applications/:id/payment-proof', upload.single('receipt'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Receipt file is required' })

  const application = await getApplication(req.params.id)
  if (!application) return res.status(404).json({ error: 'Application not found' })

  const { url: receiptUrl } = await putReceipt({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
  })
  const payment = application.payments[0]
    ? await prisma.payment.update({
        where: { id: application.payments[0].id },
        data: {
          status: 'PROOF_UPLOADED',
          receiptUrl,
          receiptMime: req.file.mimetype,
          receiptOriginalName: req.file.originalname,
          rejectedReason: null,
        },
      })
    : await prisma.payment.create({
        data: {
          applicationId: application.id,
          amountKzt: application.session.priceKzt,
          status: 'PROOF_UPLOADED',
          receiptUrl,
          receiptMime: req.file.mimetype,
          receiptOriginalName: req.file.originalname,
        },
      })

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: 'PROOF_UPLOADED',
      nextStep: 'Проверить чек в админке',
    },
    include: applicationInclude,
  })

  await logAudit('payment_proof.uploaded', 'Payment', payment.id, { receiptUrl }, 'public')
  await sendConfiguredTemplate({
    application: updated,
    templateName: config.whatsapp.templates.proofReceived,
    parameters: [updated.lead.name || 'участник'],
    fallbackBody: 'Чек получили. Организатор проверит оплату и подтвердит место.',
  })

  res.json({ ok: true, paymentId: payment.id, status: updated.status })
}))

app.get('/api/admin/summary', requireAdmin, asyncRoute(async (_req, res) => {
  const sessions = await prisma.trainingSession.findMany({
    include: { applications: true },
    orderBy: { date: 'asc' },
  })
  const applicationCounts = await prisma.application.groupBy({
    by: ['status'],
    _count: { status: true },
  })
  const pendingProofs = await prisma.payment.count({ where: { status: 'PROOF_UPLOADED' } })
  res.json({
    sessions: sessions.map(toPublicSession),
    applicationCounts,
    pendingProofs,
  })
}))

app.get('/api/admin/sessions', requireAdmin, asyncRoute(async (_req, res) => {
  const sessions = await prisma.trainingSession.findMany({
    include: { applications: true },
    orderBy: { date: 'asc' },
  })
  res.json({ sessions: sessions.map(toPublicSession) })
}))

const sessionSchema = z.object({
  publicId: z.string().optional(),
  city: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: z.string().optional(),
  time: z.string().min(4),
  duration: z.string().min(2).default('3 часа'),
  format: z.string().min(2),
  location: z.string().min(2),
  priceKzt: z.coerce.number().int().positive().default(50000),
  seatsTotal: z.coerce.number().int().min(1).max(200).default(20),
  seatsMin: z.coerce.number().int().min(1).max(200).default(15),
  status: z.enum(['OPEN', 'RISK', 'CONFIRMED', 'ALMOST_FULL', 'FULL', 'CLOSED', 'CANCELLED']).default('OPEN'),
})

app.post('/api/admin/sessions', requireAdmin, asyncRoute(async (req, res) => {
  const body = sessionSchema.parse(req.body)
  const session = await prisma.trainingSession.create({
    data: {
      publicId: body.publicId || `session-${Date.now()}`,
      city: body.city,
      date: parseSessionDate(body.date),
      day: body.day || inferDay(body.date),
      time: body.time,
      duration: body.duration,
      format: body.format,
      location: body.location,
      priceKzt: body.priceKzt,
      seatsTotal: body.seatsTotal,
      seatsMin: body.seatsMin,
      status: body.status,
    },
    include: { applications: true },
  })
  await logAudit('session.created', 'TrainingSession', session.id, body)
  res.status(201).json({ session: toPublicSession(session) })
}))

app.patch('/api/admin/sessions/:id', requireAdmin, asyncRoute(async (req, res) => {
  const body = sessionSchema.partial().parse(req.body)
  const existing = await prisma.trainingSession.findUnique({
    where: { publicId: req.params.id },
  })
  if (!existing) return res.status(404).json({ error: 'Session not found' })

  const session = await prisma.trainingSession.update({
    where: { publicId: req.params.id },
    data: {
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.date !== undefined ? { date: parseSessionDate(body.date), day: body.day || inferDay(body.date) } : {}),
      ...(body.day !== undefined && body.date === undefined ? { day: body.day } : {}),
      ...(body.time !== undefined ? { time: body.time } : {}),
      ...(body.duration !== undefined ? { duration: body.duration } : {}),
      ...(body.format !== undefined ? { format: body.format } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.priceKzt !== undefined ? { priceKzt: body.priceKzt } : {}),
      ...(body.seatsTotal !== undefined ? { seatsTotal: body.seatsTotal } : {}),
      ...(body.seatsMin !== undefined ? { seatsMin: body.seatsMin } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    include: { applications: true },
  })
  await logAudit('session.updated', 'TrainingSession', session.id, body)
  res.json({ session: toPublicSession(session) })
}))

app.delete('/api/admin/sessions/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await prisma.trainingSession.findUnique({
    where: { publicId: req.params.id },
    include: { applications: true },
  })
  if (!existing) return res.status(404).json({ error: 'Session not found' })

  const blockingStatuses = ['PAID', 'CONFIRMED', 'ATTENDED']
  const blocking = existing.applications.filter((item) => blockingStatuses.includes(item.status))
  if (blocking.length > 0) {
    return res.status(409).json({
      error: `Нельзя удалить группу: есть ${blocking.length} оплаченных/подтверждённых заявок. Сначала переведите заявки в другую группу или отмените их.`,
    })
  }

  await prisma.$transaction(async (tx) => {
    const apps = await tx.application.findMany({ where: { sessionId: existing.id }, select: { id: true } })
    const appIds = apps.map((a) => a.id)
    if (appIds.length) {
      await tx.payment.deleteMany({ where: { applicationId: { in: appIds } } })
      await tx.whatsappMessage.deleteMany({ where: { applicationId: { in: appIds } } })
      await tx.application.deleteMany({ where: { id: { in: appIds } } })
    }
    await tx.trainingSession.delete({ where: { id: existing.id } })
  })

  await logAudit('session.deleted', 'TrainingSession', existing.id, { publicId: req.params.id })
  res.json({ ok: true })
}))

app.get('/api/admin/applications', requireAdmin, asyncRoute(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const applications = await prisma.application.findMany({
    where: status ? { status } : undefined,
    include: applicationInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ applications: applications.map(toAdminApplication) })
}))

const statusSchema = z.object({
  status: z.enum(['NEW', 'FLOW_COMPLETED', 'PAYMENT_PENDING', 'PROOF_UPLOADED', 'PAID', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED']),
  nextStep: z.string().optional(),
})

app.patch('/api/admin/applications/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const body = statusSchema.parse(req.body)
  const application = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status: body.status,
      nextStep: body.nextStep || null,
    },
    include: applicationInclude,
  })
  await logAudit('application.status_updated', 'Application', application.id, body)
  res.json({ application: toAdminApplication(application) })
}))

app.post('/api/admin/payments/:id/verify', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { application: { include: { session: { include: { applications: true } } } } },
  })
  if (!existing) return res.status(404).json({ error: 'Payment not found' })

  const session = existing.application.session
  const paidCount = session.applications.filter(
    (a) => ['PAID', 'CONFIRMED', 'ATTENDED'].includes(a.status) && a.id !== existing.applicationId,
  ).length
  const force = req.query.force === '1' || req.body?.force === true
  if (!force && paidCount >= session.seatsTotal) {
    return res.status(409).json({
      error: `Группа уже заполнена (${paidCount}/${session.seatsTotal}). Подтверждение приведёт к overbooking. Передайте ?force=1 чтобы всё равно подтвердить.`,
    })
  }

  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: req.header('x-admin-name') || 'admin',
      rejectedReason: null,
    },
    include: {
      application: {
        include: applicationInclude,
      },
    },
  })

  const application = await prisma.application.update({
    where: { id: payment.applicationId },
    data: {
      status: 'PAID',
      nextStep: 'Отправить адрес и финальную памятку',
    },
    include: applicationInclude,
  })

  await logAudit('payment.verified', 'Payment', payment.id, { applicationId: application.id })
  await sendConfiguredTemplate({
    application,
    templateName: config.whatsapp.templates.paymentVerified,
    parameters: [application.lead.name || 'участник', application.session.city, application.session.day, application.session.time],
    fallbackBody: `Оплата подтверждена. Вы в группе: ${application.session.city}, ${application.session.day}, ${application.session.time}.`,
  })

  res.json({ application: toAdminApplication(application) })
}))

const rejectSchema = z.object({ reason: z.string().optional().default('Чек не подтвержден') })

app.post('/api/admin/payments/:id/reject', requireAdmin, asyncRoute(async (req, res) => {
  const body = rejectSchema.parse(req.body)
  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: 'REJECTED',
      rejectedReason: body.reason,
    },
  })
  const application = await prisma.application.update({
    where: { id: payment.applicationId },
    data: {
      status: 'PAYMENT_PENDING',
      nextStep: 'Попросить повторно отправить чек',
    },
    include: applicationInclude,
  })
  await logAudit('payment.rejected', 'Payment', payment.id, body)
  res.json({ application: toAdminApplication(application) })
}))

const adminMessageSchema = z.object({
  body: z.string().min(1),
})

app.post('/api/admin/applications/:id/messages', requireAdmin, asyncRoute(async (req, res) => {
  const body = adminMessageSchema.parse(req.body)
  const application = await getApplication(req.params.id)
  if (!application) return res.status(404).json({ error: 'Application not found' })

  const result = await sendTextMessage({
    to: application.lead.whatsapp || application.lead.phone,
    body: body.body,
  })
  const message = await createOutboundLog({ application, body: body.body, result })
  res.json({ message })
}))

app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    return res.status(200).send(challenge)
  }
  return res.sendStatus(403)
})

const statusMap = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
}

app.post('/webhooks/whatsapp', asyncRoute(async (req, res) => {
  const entries = req.body?.entry || []

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {}

      for (const status of value.statuses || []) {
        await prisma.whatsappMessage.updateMany({
          where: { waMessageId: status.id },
          data: { status: statusMap[status.status] || 'QUEUED', payload: status },
        })
      }

      for (const message of value.messages || []) {
        const contact = value.contacts?.find((item) => item.wa_id === message.from)
        const phone = normalizePhone(message.from)
        const lead = await prisma.lead.upsert({
          where: { phone },
          update: {
            whatsapp: phone,
            name: contact?.profile?.name || undefined,
          },
          create: {
            phone,
            whatsapp: phone,
            name: contact?.profile?.name || null,
            source: 'whatsapp',
          },
        })

        const body = message.text?.body || message.image?.caption || message.document?.caption || `[${message.type}]`
        await prisma.whatsappMessage.create({
          data: {
            leadId: lead.id,
            direction: 'INBOUND',
            waMessageId: message.id,
            body,
            status: 'RECEIVED',
            payload: message,
          },
        })

        const mediaId = message.image?.id || message.document?.id
        if (mediaId) {
          const latestApplication = await prisma.application.findFirst({
            where: {
              leadId: lead.id,
              status: { in: ['PAYMENT_PENDING', 'PROOF_UPLOADED'] },
            },
            include: applicationInclude,
            orderBy: { createdAt: 'desc' },
          })

          if (latestApplication) {
            const media = await downloadWhatsappMedia({ mediaId })
            if (!media.skipped) {
              const stored = await putReceipt({
                buffer: media.buffer,
                originalName: media.originalName,
                mimetype: media.mime,
              })
              const payment = latestApplication.payments[0]
                ? await prisma.payment.update({
                    where: { id: latestApplication.payments[0].id },
                    data: {
                      status: 'PROOF_UPLOADED',
                      receiptUrl: stored.url,
                      receiptMime: media.mime,
                      receiptOriginalName: media.originalName,
                    },
                  })
                : await prisma.payment.create({
                    data: {
                      applicationId: latestApplication.id,
                      amountKzt: latestApplication.session.priceKzt,
                      status: 'PROOF_UPLOADED',
                      receiptUrl: stored.url,
                      receiptMime: media.mime,
                      receiptOriginalName: media.originalName,
                    },
                  })

              await prisma.application.update({
                where: { id: latestApplication.id },
                data: {
                  status: 'PROOF_UPLOADED',
                  nextStep: 'Проверить чек из WhatsApp',
                },
              })
              await logAudit('payment_proof.whatsapp_uploaded', 'Payment', payment.id, { mediaId }, 'whatsapp')
            }
          }
        }
      }
    }
  }

  res.sendStatus(200)
}))

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation error', details: error.flatten() })
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: error.message || 'Internal server error' })
})

app.listen(config.port, () => {
  console.log(`GrowVibe API listening on http://localhost:${config.port}`)
})
