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
  res.json({ ok: true, service: 'vibe42-api' })
})

const toAdminOrgRequest = (req) => ({
  id: req.id,
  orgName: req.orgName,
  employeeCount: req.employeeCount,
  contactPhone: req.contactPhone,
  status: req.status,
  comment: req.comment,
  sessionId: req.sessionId,
  session: req.session
    ? {
        publicId: req.session.publicId,
        city: req.session.city,
        date: req.session.date,
        day: req.session.day,
        time: req.session.time,
      }
    : null,
  createdAt: req.createdAt,
  updatedAt: req.updatedAt,
})

const orgRequestSchema = z.object({
  orgName: z.string().min(2).max(200),
  employeeCount: z.coerce.number().int().min(1).max(100000),
  contactPhone: z.string().min(5).max(40),
})

app.post('/api/public/requests', asyncRoute(async (req, res) => {
  const body = orgRequestSchema.parse(req.body)
  const phone = normalizePhone(body.contactPhone)

  const created = await prisma.organizationRequest.create({
    data: {
      orgName: body.orgName.trim(),
      employeeCount: body.employeeCount,
      contactPhone: phone,
      status: 'NEW',
    },
  })

  await logAudit('org_request.created', 'OrganizationRequest', created.id, {
    orgName: created.orgName,
    employeeCount: created.employeeCount,
  }, 'public')

  res.status(201).json({ ok: true, requestId: created.id })
}))

const CHAT_SYSTEM_PROMPT = `Ты — AI-помощник Vibe 42, движения по обучению вайб-кодингу для команд.

ВАЖНО (всегда подчёркивай при первой возможности):
- Vibe 42 — это НЕ курсы и НЕ бизнес. Это нонпрофит движение.
- Vibe 42 создано на базе Федерации спорт программирования Казахстана — официально некоммерческой организации.
- Федерация в 2026 году проводит мировую Олимпиаду по спортивному программированию.
- 100% доходов от корпоративных практикумов реинвестируются в развитие AI-образования (бесплатные программы для школьников/студентов, олимпиады, открытые материалы).
- Манифест: Adapt · Amplify · Stay Human — Адаптируйся, Усиливай себя, Оставайся человеком.

ЧТО ТАКОЕ VIBE 42:
Vibe 42 — движение адаптации человека к эпохе ИИ. Первый этап: корпоративный практикум по вайб-кодингу. Сотрудники описывают задачи обычными словами, AI помогает собрать сайт, приложение, форму, прототип или внутренний инструмент. Знание программирования не нужно. Цель — превратить пассивных потребителей ИИ в активных создателей.

ПАРТНЁРЫ ДВИЖЕНИЯ:
Kazakhtelecom, Samruk Business Academy, Федерация спорт программирования Казахстана.

ДЛЯ КОГО:
- Продуктовые команды — быстро проверяют идеи и прототипы без разработчиков
- Маркетинг и продажи — сами делают лендинги, формы, инструменты под кампании
- HR и операционные отделы — автоматизируют рутину, делают формы и опросы
- Руководители — команда за день собирает MVP вместо двух недель ТЗ
- Аналитики и менеджеры — превращают идеи в работающие интерфейсы
- Стартапы — учат всю команду делать продукты с AI без раздувания штата

ЧТО ПОЛУЧИТ КОМАНДА:
1. Поймут, что такое вайб-кодинг и где он реально помогает
2. Научатся ставить задачи AI и получать рабочий результат
3. Каждый сделает свой первый цифровой проект на практике
4. Освоят Claude и базовые инструменты вайб-кодинга
5. Научатся работать с GitHub и сохранять наработки
6. Получат набор готовых промптов под рабочие задачи
7. Научатся дорабатывать результат итерациями
8. Поймут, как применить вайб-кодинг в своих процессах

ФОРМАТ:
- Офлайн (в офисе клиента) или онлайн — на выбор
- Длительность и количество встреч согласуем после заявки
- Программу подбираем под задачи конкретной команды

СТОИМОСТЬ:
Рассчитывается индивидуально: зависит от количества сотрудников, формата и программы. Точную цифру даём после заявки.

ЧТО НУЖНО ОТ КОМПАНИИ:
Ноутбуки для участников и место (если офлайн). Программу, материалы и ведущего берём на себя.

КАК ОСТАВИТЬ ЗАЯВКУ:
Форма заявки находится ПРЯМО НА ЭТОЙ СТРАНИЦЕ — нужно просто прокрутить вниз. В форме 3 поля: название организации, количество сотрудников, контактный телефон. После отправки мы свяжемся и обсудим детали.

ДОМЕН САЙТА: vibe42.kz (НЕ .ru, НЕ .com — только .kz!)

СТИЛЬ ОТВЕТОВ:
- Отвечай коротко и по делу, без лишних вводных
- Используй конкретные примеры из описания выше
- Если спрашивают про цену — объясни, что рассчитывается индивидуально, и предложи оставить заявку
- Если хотят записаться или спрашивают про ссылку — говори "форма прямо на этой странице, прокрутите вниз" (НЕ выдумывай URL и НЕ давай внешние ссылки)
- Если ОЧЕНЬ нужно дать ссылку — только https://vibe42.kz, других доменов НЕ существует
- Пиши на русском языке`

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).default([]),
})

app.post('/api/public/chat', asyncRoute(async (req, res) => {
  if (!config.anthropicApiKey) {
    return res.status(503).json({ error: 'AI-помощник временно недоступен' })
  }
  const { message, history } = chatSchema.parse(req.body)
  const baseUrl = config.litellmBaseUrl || 'https://api.anthropic.com'
  const endpoint = `${baseUrl}/v1/chat/completions`
  const aiRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.anthropicApiKey}`,
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen3-VL-32B-Instruct',
      max_tokens: 512,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message },
      ],
    }),
  })
  const data = await aiRes.json()
  if (!aiRes.ok) {
    console.error('LiteLLM error:', data)
    return res.status(502).json({ error: 'AI-помощник временно недоступен' })
  }
  res.json({ response: data.choices[0].message.content })
}))

const CONTEXT_EXPLAIN_PROMPT = `Ты — помощник Vibe 42. Человек описал свою роль или занятие.
Напиши 3-4 предложения: объясни конкретно, как вайб-кодинг поможет ИМЕННО этому человеку в его работе.
Используй примеры, релевантные его роли. Не начинай с "Вайб-кодинг — это...".
Сразу к делу, говори лично с ним. Не больше 80 слов. Пиши на русском.`

app.post('/api/public/chat-stream', asyncRoute(async (req, res) => {
  if (!config.anthropicApiKey) {
    return res.status(503).json({ error: 'AI временно недоступен' })
  }
  const { message } = z.object({ message: z.string().min(1).max(300) }).parse(req.body)
  const baseUrl = config.litellmBaseUrl || 'https://api.anthropic.com'
  const aiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.anthropicApiKey}` },
    body: JSON.stringify({
      model: 'Qwen/Qwen3-VL-32B-Instruct',
      max_tokens: 200,
      stream: true,
      messages: [
        { role: 'system', content: CONTEXT_EXPLAIN_PROMPT },
        { role: 'user', content: message },
      ],
    }),
  })
  if (!aiRes.ok) return res.status(502).json({ error: 'AI временно недоступен' })
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  const reader = aiRes.body.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
  } finally {
    res.end()
  }
}))

app.get('/api/admin/requests', requireAdmin, asyncRoute(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const requests = await prisma.organizationRequest.findMany({
    where: status ? { status } : undefined,
    include: { session: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ requests: requests.map(toAdminOrgRequest) })
}))

const orgRequestPatchSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'ASSIGNED', 'WON', 'LOST']).optional(),
  comment: z.string().max(2000).optional().nullable(),
  sessionPublicId: z.string().nullable().optional(),
})

app.patch('/api/admin/requests/:id', requireAdmin, asyncRoute(async (req, res) => {
  const body = orgRequestPatchSchema.parse(req.body)
  const data = {}
  if (body.status !== undefined) data.status = body.status
  if (body.comment !== undefined) data.comment = body.comment ?? null
  if (body.sessionPublicId !== undefined) {
    if (body.sessionPublicId === null || body.sessionPublicId === '') {
      data.sessionId = null
    } else {
      const session = await prisma.trainingSession.findUnique({
        where: { publicId: body.sessionPublicId },
      })
      if (!session) return res.status(404).json({ error: 'Session not found' })
      data.sessionId = session.id
      if (data.status === undefined) data.status = 'ASSIGNED'
    }
  }

  const updated = await prisma.organizationRequest.update({
    where: { id: req.params.id },
    data,
    include: { session: true },
  })
  await logAudit('org_request.updated', 'OrganizationRequest', updated.id, body)
  res.json({ request: toAdminOrgRequest(updated) })
}))

app.delete('/api/admin/requests/:id', requireAdmin, asyncRoute(async (req, res) => {
  await prisma.organizationRequest.delete({ where: { id: req.params.id } })
  await logAudit('org_request.deleted', 'OrganizationRequest', req.params.id, {})
  res.json({ ok: true })
}))

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
