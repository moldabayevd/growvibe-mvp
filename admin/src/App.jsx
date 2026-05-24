import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const SESSION_KEY = 'growvibe_admin_session'

const statusLabels = {
  NEW: 'Новый',
  FLOW_COMPLETED: 'Флоу пройден',
  PAYMENT_PENDING: 'Ждет оплату',
  PROOF_UPLOADED: 'Чек на проверке',
  PAID: 'Оплачен',
  CONFIRMED: 'Подтвержден',
  ATTENDED: 'Посетил',
  NO_SHOW: 'Не пришел',
  RESCHEDULED: 'Перенос',
  CANCELLED: 'Отменен',
}

const statusOptions = Object.keys(statusLabels)

const sessionStatusLabels = {
  OPEN: 'Открыта для регистрации',
  RISK: 'Риск недобора',
  CONFIRMED: 'Группа подтверждена',
  ALMOST_FULL: 'Почти заполнена',
  FULL: 'Заполнена',
  CLOSED: 'Закрыта',
  CANCELLED: 'Отменена',
}

const sessionStatusOptions = Object.keys(sessionStatusLabels)

const defaultSessionForm = {
  city: 'Астана',
  date: '',
  time: '19:00–22:00',
  duration: '3 часа',
  format: 'Вечерняя группа',
  location: 'Кафе, адрес после оплаты',
  priceKzt: 50000,
  seatsTotal: 20,
  seatsMin: 15,
  status: 'OPEN',
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const fileUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_URL}${url}`
}

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const isoToDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export default function App() {
  const [session, setSession] = useState(loadSession)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [applications, setApplications] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [sessionForm, setSessionForm] = useState(defaultSessionForm)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [messageDrafts, setMessageDrafts] = useState({})
  const [sendingApplicationId, setSendingApplicationId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() })
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const headers = useMemo(
    () => ({
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      'Content-Type': 'application/json',
    }),
    [session?.token],
  )

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setSummary(null)
    setApplications([])
    setEditingSessionId(null)
    setEditForm(null)
  }

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    })
    if (response.status === 401) {
      logout()
      throw new Error('Сессия истекла, войдите снова')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса')
    return data
  }

  const load = async () => {
    if (!session?.token) return
    setLoading(true)
    setError('')
    try {
      const [summaryData, applicationsData] = await Promise.all([
        request('/api/admin/summary'),
        request(`/api/admin/applications${statusFilter ? `?status=${statusFilter}` : ''}`),
      ])
      setSummary(summaryData)
      setApplications(applicationsData.applications)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [session?.token, statusFilter])

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Ошибка входа')
      const next = { token: data.token, username: data.username, expiresAt: data.expiresAt }
      localStorage.setItem(SESSION_KEY, JSON.stringify(next))
      setSession(next)
      setLoginForm({ username: '', password: '' })
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const verifyPayment = async (paymentId, applicationName) => {
    if (!window.confirm(`Подтвердить оплату для заявки "${applicationName || ''}"?\n\nЗаявка перейдёт в статус "Оплачен" и клиенту уйдёт уведомление в WhatsApp (если настроены шаблоны).`)) return
    try {
      await request(`/api/admin/payments/${paymentId}/verify`, { method: 'POST', body: '{}' })
      showToast('Оплата подтверждена', 'success')
      await load()
    } catch (err) {
      if (err.message?.includes('overbooking') || err.message?.includes('заполнена')) {
        if (window.confirm(`${err.message}\n\nПодтвердить всё равно?`)) {
          await request(`/api/admin/payments/${paymentId}/verify?force=1`, { method: 'POST', body: '{}' })
          showToast('Оплата подтверждена (форсированно)', 'success')
          await load()
        }
      } else {
        setError(err.message)
        showToast(err.message, 'error')
      }
    }
  }

  const rejectPayment = async (paymentId) => {
    const reason = window.prompt('Причина отклонения чека', 'Чек не подтвержден')
    if (reason === null) return
    try {
      await request(`/api/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      showToast('Чек отклонён', 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const updateStatus = async (applicationId, status) => {
    try {
      await request(`/api/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      showToast(`Статус: ${statusLabels[status] || status}`, 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const createSession = async (event) => {
    event.preventDefault()
    try {
      await request('/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionForm),
      })
      setSessionForm(defaultSessionForm)
      showToast('Группа создана', 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const deleteSession = async (sessionItem) => {
    const label = `${sessionItem.city} · ${sessionItem.day}, ${new Date(sessionItem.date).toLocaleDateString('ru-RU')}`
    if (!window.confirm(`Удалить группу "${label}"?\n\nЭто удалит её вместе со всеми заявками и сообщениями. Действие необратимо.`)) return
    try {
      await request(`/api/admin/sessions/${sessionItem.publicId}`, { method: 'DELETE' })
      showToast(`Группа "${label}" удалена`, 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const sendMessage = async (applicationId) => {
    const body = (messageDrafts[applicationId] || '').trim()
    if (!body) return
    setSendingApplicationId(applicationId)
    try {
      const res = await request(`/api/admin/applications/${applicationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      setMessageDrafts({ ...messageDrafts, [applicationId]: '' })
      const status = res?.message?.status
      showToast(status === 'SENT' ? 'Сообщение отправлено' : 'Сообщение в очереди (WhatsApp креды не настроены)', 'success')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSendingApplicationId(null)
    }
  }

  const updateSessionStatus = async (sessionId, status) => {
    try {
      await request(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      showToast(`Статус группы: ${sessionStatusLabels[status] || status}`, 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const startEdit = (sessionItem) => {
    setEditingSessionId(sessionItem.publicId)
    setEditForm({
      city: sessionItem.city,
      date: isoToDateInput(sessionItem.date),
      time: sessionItem.time,
      duration: sessionItem.duration || '3 часа',
      format: sessionItem.format,
      location: sessionItem.location,
      priceKzt: sessionItem.priceKzt,
      seatsTotal: sessionItem.seatsTotal,
      seatsMin: sessionItem.seatsMin ?? 15,
      status: sessionItem.adminStatus,
    })
  }

  const cancelEdit = () => {
    setEditingSessionId(null)
    setEditForm(null)
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editingSessionId || !editForm) return
    try {
      await request(`/api/admin/sessions/${editingSessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          priceKzt: Number(editForm.priceKzt),
          seatsTotal: Number(editForm.seatsTotal),
          seatsMin: Number(editForm.seatsMin),
        }),
      })
      cancelEdit()
      showToast('Группа обновлена', 'success')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  if (!session?.token) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <p className="eyebrow">GrowVibe Admin</p>
          <h1>Вход в админку</h1>
          <p className="muted">Введите логин и пароль администратора (см. <code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code> в <code>.env</code>).</p>
          <form onSubmit={submitLogin}>
            <label className="login-label">
              Логин
              <input
                type="text"
                autoComplete="username"
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                placeholder="admin"
                required
              />
            </label>
            <label className="login-label">
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="пароль"
                required
              />
            </label>
            {loginError && <div className="error" style={{ marginTop: 12 }}>{loginError}</div>}
            <button type="submit" disabled={loginLoading} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
              {loginLoading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">GrowVibe Admin</p>
          <h1>Заявки, чеки и группы</h1>
          <small className="muted">Вы вошли как <strong>{session.username}</strong></small>
        </div>
        <div className="topbar-actions">
          <button type="button" className="secondary" onClick={load} disabled={loading}>
            {loading ? 'Обновляем...' : 'Обновить'}
          </button>
          <button type="button" className="ghost" onClick={logout}>Выйти</button>
        </div>
      </header>

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.message}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {summary && (
        <section className="stats-grid">
          <article className="stat-card">
            <span>Чеки на проверке</span>
            <strong>{summary.pendingProofs}</strong>
          </article>
          {summary.sessions.map((session) => (
            <article key={session.publicId} className={`stat-card ${session.launchRisk ? 'risk' : ''}`}>
              <span>{session.city} · {session.day} · {session.time}</span>
              <strong>{session.paidCount}/{session.seatsTotal}</strong>
              <small>{session.status} · заявок {session.applicationCount} · чеков {session.proofCount}</small>
            </article>
          ))}
        </section>
      )}

      <section className="panel sessions-panel">
        <div className="panel-head">
          <div>
            <h2>Доступные дни регистрации</h2>
            <p className="muted">Откройте дату здесь — она появится на лендинге. Закройте или отмените — клиент не сможет записаться. «Редактировать» меняет любое поле.</p>
          </div>
        </div>

        <form className="session-form" onSubmit={createSession}>
          <label>
            Город
            <select value={sessionForm.city} onChange={(event) => setSessionForm({ ...sessionForm, city: event.target.value })}>
              <option>Астана</option>
              <option>Алматы</option>
            </select>
          </label>
          <label>
            Дата
            <input type="date" required value={sessionForm.date} onChange={(event) => setSessionForm({ ...sessionForm, date: event.target.value })} />
          </label>
          <label>
            Время
            <input value={sessionForm.time} onChange={(event) => setSessionForm({ ...sessionForm, time: event.target.value })} />
          </label>
          <label>
            Формат
            <select value={sessionForm.format} onChange={(event) => setSessionForm({ ...sessionForm, format: event.target.value })}>
              <option>Вечерняя группа</option>
              <option>Суббота</option>
              <option>Воскресенье</option>
            </select>
          </label>
          <label>
            Мест
            <input type="number" min="1" value={sessionForm.seatsTotal} onChange={(event) => setSessionForm({ ...sessionForm, seatsTotal: event.target.value })} />
          </label>
          <label>
            Цена, ₸
            <input type="number" min="1" value={sessionForm.priceKzt} onChange={(event) => setSessionForm({ ...sessionForm, priceKzt: event.target.value })} />
          </label>
          <label className="wide">
            Место
            <input value={sessionForm.location} onChange={(event) => setSessionForm({ ...sessionForm, location: event.target.value })} />
          </label>
          <button type="submit">Открыть дату</button>
        </form>

        <div className="sessions-list">
          {(summary?.sessions || []).map((sessionItem) => {
            const isEditing = editingSessionId === sessionItem.publicId
            if (isEditing && editForm) {
              return (
                <article key={sessionItem.publicId} className="session-row editing">
                  <form className="session-form edit-form" onSubmit={saveEdit}>
                    <label>
                      Город
                      <select value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })}>
                        <option>Астана</option>
                        <option>Алматы</option>
                      </select>
                    </label>
                    <label>
                      Дата
                      <input type="date" required value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} />
                    </label>
                    <label>
                      Время
                      <input value={editForm.time} onChange={(event) => setEditForm({ ...editForm, time: event.target.value })} />
                    </label>
                    <label>
                      Длительность
                      <input value={editForm.duration} onChange={(event) => setEditForm({ ...editForm, duration: event.target.value })} />
                    </label>
                    <label>
                      Формат
                      <select value={editForm.format} onChange={(event) => setEditForm({ ...editForm, format: event.target.value })}>
                        <option>Вечерняя группа</option>
                        <option>Суббота</option>
                        <option>Воскресенье</option>
                      </select>
                    </label>
                    <label>
                      Мест всего
                      <input type="number" min="1" value={editForm.seatsTotal} onChange={(event) => setEditForm({ ...editForm, seatsTotal: event.target.value })} />
                    </label>
                    <label>
                      Мест минимум
                      <input type="number" min="1" value={editForm.seatsMin} onChange={(event) => setEditForm({ ...editForm, seatsMin: event.target.value })} />
                    </label>
                    <label>
                      Цена, ₸
                      <input type="number" min="1" value={editForm.priceKzt} onChange={(event) => setEditForm({ ...editForm, priceKzt: event.target.value })} />
                    </label>
                    <label>
                      Статус
                      <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                        {sessionStatusOptions.map((status) => (
                          <option key={status} value={status}>{sessionStatusLabels[status]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      Место
                      <input value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} />
                    </label>
                    <div className="edit-actions">
                      <button type="submit">Сохранить</button>
                      <button type="button" className="secondary" onClick={cancelEdit}>Отменить</button>
                    </div>
                  </form>
                </article>
              )
            }
            return (
              <article key={sessionItem.publicId} className={`session-row ${sessionItem.registrationOpen ? 'open' : 'closed'}`}>
                <div>
                  <strong>{sessionItem.city} · {sessionItem.day}, {new Date(sessionItem.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong>
                  <p>{sessionItem.time} · {sessionItem.format} · {sessionItem.location}</p>
                  <small>
                    На лендинге: {sessionItem.registrationOpen ? 'доступна регистрация' : 'закрыто'} ·
                    мест {sessionItem.seatsLeft}/{sessionItem.seatsTotal} · оплачено {sessionItem.paidCount} · цена {Number(sessionItem.priceKzt).toLocaleString('ru-RU')} ₸
                  </small>
                </div>
                <div className="session-row-actions">
                  <select value={sessionItem.adminStatus} onChange={(event) => updateSessionStatus(sessionItem.publicId, event.target.value)}>
                    {sessionStatusOptions.map((status) => (
                      <option key={status} value={status}>{sessionStatusLabels[status]}</option>
                    ))}
                  </select>
                  <button type="button" className="secondary" onClick={() => startEdit(sessionItem)}>Редактировать</button>
                  <button type="button" className="danger" onClick={() => deleteSession(sessionItem)}>Удалить</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Заявки</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Все статусы</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </select>
        </div>

        <div className="applications">
          {applications.map((application) => {
            const payment = application.payments?.[0]
            return (
              <article key={application.id} className="application-card">
                <div className="application-main">
                  <div>
                    <div className="lead-line">
                      <strong>{application.lead?.name || 'Без имени'}</strong>
                      <span>{statusLabels[application.status] || application.status}</span>
                    </div>
                    <p className="muted">
                      {application.lead?.phone} · {application.lead?.email || 'email не указан'}
                    </p>
                    <p>
                      {application.session?.city} · {application.session?.day} · {application.session?.time}
                    </p>
                    <small>Создано: {formatDate(application.createdAt)}</small>
                  </div>

                  <div className="actions">
                    <select value={application.status} onChange={(event) => updateStatus(application.id, event.target.value)}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                    {payment?.receiptUrl && (
                      <a className="button secondary" href={fileUrl(payment.receiptUrl)} target="_blank" rel="noreferrer">
                        Открыть чек
                      </a>
                    )}
                    {payment?.status === 'PROOF_UPLOADED' && (
                      <>
                        <button type="button" onClick={() => verifyPayment(payment.id, application.lead?.name)}>Подтвердить оплату</button>
                        <button type="button" className="danger" onClick={() => rejectPayment(payment.id)}>Отклонить</button>
                      </>
                    )}
                  </div>
                </div>

                {payment && (
                  <div className="payment-row">
                    <span>Оплата: {payment.status}</span>
                    <span>{payment.amountKzt?.toLocaleString('ru-RU')} ₸</span>
                    <span>{payment.receiptOriginalName || 'чек не загружен'}</span>
                  </div>
                )}

                <div className="message-row">
                  <textarea
                    rows={2}
                    placeholder={`Написать в WhatsApp на ${application.lead?.whatsapp || application.lead?.phone || 'клиента'}...`}
                    value={messageDrafts[application.id] || ''}
                    onChange={(event) => setMessageDrafts({ ...messageDrafts, [application.id]: event.target.value })}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => sendMessage(application.id)}
                    disabled={sendingApplicationId === application.id || !(messageDrafts[application.id] || '').trim()}
                  >
                    {sendingApplicationId === application.id ? 'Отправляем...' : 'Отправить'}
                  </button>
                </div>
              </article>
            )
          })}

          {!applications.length && !loading && (
            <div className="empty">Заявок пока нет.</div>
          )}
        </div>
      </section>
    </main>
  )
}
