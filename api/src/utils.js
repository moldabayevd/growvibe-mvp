export const normalizePhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '')
  if (digits.length === 10) return `7${digits}`
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

export const moneyKzt = (amount) => `${Number(amount || 0).toLocaleString('ru-RU')} ₸`

export const toPublicSession = (session) => {
  const applications = session.applications || []
  const paidCount = applications.filter((app) => ['PAID', 'CONFIRMED', 'ATTENDED'].includes(app.status)).length
  const proofCount = applications.filter((app) => app.status === 'PROOF_UPLOADED').length
  const applicationCount = applications.length
  const seatsLeft = Math.max(0, session.seatsTotal - paidCount)
  const isClosed = ['FULL', 'CLOSED', 'CANCELLED'].includes(session.status)
  const isFull = paidCount >= session.seatsTotal || isClosed
  const status = isFull
    ? 'Набор закрыт'
    : session.status === 'ALMOST_FULL' || seatsLeft <= 2
      ? 'Почти заполнено'
      : 'Есть места'
  const launchRisk = paidCount < session.seatsMin
  const registrationOpen = !isClosed && paidCount < session.seatsTotal

  return {
    id: Number(session.publicId) || session.publicId,
    publicId: session.publicId,
    city: session.city,
    date: session.date.toISOString().slice(0, 10),
    day: session.day,
    time: session.time,
    duration: session.duration,
    format: session.format,
    location: session.location,
    seatsTotal: session.seatsTotal,
    seatsMin: session.seatsMin,
    seatsLeft,
    paidCount,
    proofCount,
    applicationCount,
    price: moneyKzt(session.priceKzt),
    priceKzt: session.priceKzt,
    adminStatus: session.status,
    status,
    launchRisk,
    registrationOpen,
  }
}

export const toAdminApplication = (application) => ({
  id: application.id,
  status: application.status,
  flowCompleted: application.flowCompleted,
  readinessConfirmed: application.readinessConfirmed,
  conditionsConfirmed: application.conditionsConfirmed,
  comment: application.comment,
  nextStep: application.nextStep,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
  lead: application.lead,
  session: application.session ? toPublicSession({ ...application.session, applications: [application] }) : null,
  payments: application.payments,
})
