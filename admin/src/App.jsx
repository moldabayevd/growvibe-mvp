import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const SESSION_KEY = 'vibe42_admin_session'

const requestStatusLabels = {
  NEW: 'Новая',
  CONTACTED: 'Связались',
  ASSIGNED: 'В группе',
  WON: 'Закрыли',
  LOST: 'Отказ',
}
const requestStatusOptions = Object.keys(requestStatusLabels)
const requestBadgeClass = {
  NEW: 'badge new',
  CONTACTED: 'badge contacted',
  ASSIGNED: 'badge assigned',
  WON: 'badge won',
  LOST: 'badge lost',
}

const sessionStatusLabels = {
  OPEN: 'Открыта',
  RISK: 'Риск недобора',
  CONFIRMED: 'Подтверждена',
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
  location: 'Уточняется',
  seatsTotal: 20,
  status: 'OPEN',
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const formatShortDate = (value) =>
  value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'

const formatPhoneDisplay = (digits) => {
  if (!digits) return '—'
  const d = String(digits).replace(/\D/g, '')
  if (d.length !== 11) return digits
  return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
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

  const [tab, setTab] = useState('requests')

  const [requests, setRequests] = useState([])
  const [requestStatusFilter, setRequestStatusFilter] = useState('')

  const [sessions, setSessions] = useState([])
  const [sessionForm, setSessionForm] = useState(defaultSessionForm)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    setRequests([])
    setSessions([])
    setEditingSessionId(null)
    setEditForm(null)
  }

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
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
      const [reqData, sumData] = await Promise.all([
        request(`/api/admin/requests${requestStatusFilter ? `?status=${requestStatusFilter}` : ''}`),
        request('/api/admin/summary'),
      ])
      setRequests(reqData.requests || [])
      setSessions(sumData.sessions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [session?.token, requestStatusFilter])

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

  // ── Заявки ────────────────────────────────────────────────────────────────
  const patchRequest = async (id, payload, successMsg) => {
    try {
      await request(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      if (successMsg) showToast(successMsg)
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const deleteRequest = async (req) => {
    if (!window.confirm(`Удалить заявку "${req.orgName}"? Действие необратимо.`)) return
    try {
      await request(`/api/admin/requests/${req.id}`, { method: 'DELETE' })
      showToast('Заявка удалена')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  // ── Группы ────────────────────────────────────────────────────────────────
  const createSession = async (event) => {
    event.preventDefault()
    try {
      await request('/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          ...sessionForm,
          seatsTotal: Number(sessionForm.seatsTotal),
          seatsMin: 1,
          priceKzt: 0,
        }),
      })
      setSessionForm(defaultSessionForm)
      showToast('Группа создана')
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const deleteSession = async (sessionItem) => {
    const label = `${sessionItem.city} · ${sessionItem.day}, ${formatShortDate(sessionItem.date)}`
    if (!window.confirm(`Удалить группу "${label}"? Действие необратимо.`)) return
    try {
      await request(`/api/admin/sessions/${sessionItem.publicId}`, { method: 'DELETE' })
      showToast(`Группа удалена`)
      await load()
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    }
  }

  const updateSessionStatus = async (sessionId, status) => {
    try {
      await request(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      showToast(`Статус: ${sessionStatusLabels[status] || status}`)
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
      seatsTotal: sessionItem.seatsTotal,
      status: sessionItem.adminStatus,
    })
  }
  const cancelEdit = () => { setEditingSessionId(null); setEditForm(null) }
  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editingSessionId || !editForm) return
    try {
      await request(`/api/admin/sessions/${editingSessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          seatsTotal: Number(editForm.seatsTotal),
          seatsMin: 1,
          priceKzt: 0,
        }),
      })
      cancelEdit()
      showToast('Группа обновлена')
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
          <p className="eyebrow">Vibe 42 Admin</p>
          <h1>Вход в админку</h1>
          <p className="muted">Введите логин и пароль администратора (см. <code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code> в <code>.env</code>).</p>
          <form onSubmit={submitLogin}>
            <label className="login-label">
              Логин
              <input
                type="text"
                autoComplete="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
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
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="пароль"
                required
              />
            </label>
            {loginError && <div className="error" style={{ marginTop: 12 }}>{loginError}</div>}
            <button type="submit" className="primary" disabled={loginLoading} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
              {loginLoading ? 'Входим…' : 'Войти'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  const newCount = requests.filter((r) => r.status === 'NEW').length
  const inWorkCount = requests.filter((r) => ['CONTACTED', 'ASSIGNED'].includes(r.status)).length
  const totalEmployees = requests
    .filter((r) => ['CONTACTED', 'ASSIGNED', 'WON'].includes(r.status))
    .reduce((s, r) => s + (r.employeeCount || 0), 0)

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Vibe 42 Admin</p>
          <h1>Заявки от организаций и группы</h1>
          <small className="muted">Вы вошли как <strong>{session.username}</strong></small>
        </div>
        <div className="topbar-actions">
          <button type="button" className="secondary" onClick={load} disabled={loading}>
            {loading ? 'Обновляем…' : 'Обновить'}
          </button>
          <button type="button" className="ghost" onClick={logout}>Выйти</button>
        </div>
      </header>

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">{toast.message}</div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Заявки {newCount > 0 && `(${newCount} новых)`}
        </button>
        <button
          type="button"
          className={`tab ${tab === 'groups' ? 'active' : ''}`}
          onClick={() => setTab('groups')}
        >
          Группы ({sessions.length})
        </button>
      </div>

      {tab === 'requests' && (
        <>
          <section className="stats-grid">
            <article className="stat-card">
              <span>Новые заявки</span>
              <strong>{newCount}</strong>
              <small className="muted">Ждут первого контакта</small>
            </article>
            <article className="stat-card">
              <span>В работе</span>
              <strong>{inWorkCount}</strong>
              <small className="muted">Связались или назначены в группу</small>
            </article>
            <article className="stat-card">
              <span>Сотрудников всего</span>
              <strong>{totalEmployees}</strong>
              <small className="muted">По активным заявкам</small>
            </article>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Заявки от организаций</h2>
                <p className="muted">Здесь видны все заявки с лендинга. Меняйте статус, оставляйте комментарий, назначайте в группу.</p>
              </div>
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
              >
                <option value="">Все статусы</option>
                {requestStatusOptions.map((s) => (
                  <option key={s} value={s}>{requestStatusLabels[s]}</option>
                ))}
              </select>
            </div>

            <div className="requests">
              {requests.map((r) => (
                <article key={r.id} className="request-card">
                  <div className="request-main">
                    <div>
                      <div className="request-title">
                        <strong style={{ fontSize: 17 }}>{r.orgName}</strong>
                        <span className={requestBadgeClass[r.status] || 'badge'}>
                          {requestStatusLabels[r.status] || r.status}
                        </span>
                      </div>
                      <p className="muted" style={{ margin: '6px 0' }}>
                        <strong>{r.employeeCount}</strong> сотрудников ·{' '}
                        <a href={`tel:${r.contactPhone}`} style={{ color: '#0F1218', textDecoration: 'none', fontWeight: 600 }}>
                          {formatPhoneDisplay(r.contactPhone)}
                        </a>
                      </p>
                      {r.session && (
                        <p className="muted" style={{ margin: '4px 0' }}>
                          Назначена в группу: <strong>{r.session.city} · {r.session.day}, {formatShortDate(r.session.date)} · {r.session.time}</strong>
                        </p>
                      )}
                      <small className="muted">Получена: {formatDate(r.createdAt)}</small>

                      <textarea
                        placeholder="Комментарий менеджера (что обсудили, договорённости…)"
                        defaultValue={r.comment || ''}
                        onBlur={(e) => {
                          const next = e.target.value
                          if ((r.comment || '') !== next) {
                            patchRequest(r.id, { comment: next }, 'Комментарий сохранён')
                          }
                        }}
                        rows={2}
                        style={{ width: '100%', marginTop: 10 }}
                      />
                    </div>

                    <div className="request-actions">
                      <select
                        value={r.status}
                        onChange={(e) => patchRequest(r.id, { status: e.target.value }, 'Статус обновлён')}
                      >
                        {requestStatusOptions.map((s) => (
                          <option key={s} value={s}>{requestStatusLabels[s]}</option>
                        ))}
                      </select>
                      <select
                        value={r.session?.publicId || ''}
                        onChange={(e) => patchRequest(r.id, { sessionPublicId: e.target.value || null }, 'Группа назначена')}
                      >
                        <option value="">— без группы —</option>
                        {sessions.map((s) => (
                          <option key={s.publicId} value={s.publicId}>
                            {s.city} · {formatShortDate(s.date)} · {s.time}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteRequest(r)}
                      >
                        Удалить заявку
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!requests.length && !loading && (
                <div className="empty">Заявок пока нет.</div>
              )}
            </div>
          </section>
        </>
      )}

      {tab === 'groups' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Группы обучения</h2>
              <p className="muted">Создавайте группы (когорты) и назначайте в них заявки. Видны только в админке — на лендинге не отображаются.</p>
            </div>
          </div>

          <form className="session-form" onSubmit={createSession}>
            <label>
              Город
              <input
                value={sessionForm.city}
                onChange={(e) => setSessionForm({ ...sessionForm, city: e.target.value })}
              />
            </label>
            <label>
              Дата
              <input
                type="date"
                required
                value={sessionForm.date}
                onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
              />
            </label>
            <label>
              Время
              <input
                value={sessionForm.time}
                onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })}
              />
            </label>
            <label>
              Формат
              <input
                value={sessionForm.format}
                onChange={(e) => setSessionForm({ ...sessionForm, format: e.target.value })}
              />
            </label>
            <label>
              Кол-во мест
              <input
                type="number"
                min="1"
                value={sessionForm.seatsTotal}
                onChange={(e) => setSessionForm({ ...sessionForm, seatsTotal: e.target.value })}
              />
            </label>
            <label className="wide">
              Место проведения
              <input
                value={sessionForm.location}
                onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
              />
            </label>
            <div className="submit-cell">
              <button type="submit" className="primary">+ Создать группу</button>
            </div>
          </form>

          <div className="sessions-list">
            {sessions.map((sessionItem) => {
              const isEditing = editingSessionId === sessionItem.publicId
              if (isEditing && editForm) {
                return (
                  <article key={sessionItem.publicId} className="session-row editing">
                    <form className="session-form edit-form" onSubmit={saveEdit}>
                      <label>
                        Город
                        <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                      </label>
                      <label>
                        Дата
                        <input type="date" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                      </label>
                      <label>
                        Время
                        <input value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
                      </label>
                      <label>
                        Длительность
                        <input value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
                      </label>
                      <label>
                        Формат
                        <input value={editForm.format} onChange={(e) => setEditForm({ ...editForm, format: e.target.value })} />
                      </label>
                      <label>
                        Кол-во мест
                        <input type="number" min="1" value={editForm.seatsTotal} onChange={(e) => setEditForm({ ...editForm, seatsTotal: e.target.value })} />
                      </label>
                      <label>
                        Статус
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                          {sessionStatusOptions.map((s) => (
                            <option key={s} value={s}>{sessionStatusLabels[s]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="wide">
                        Место
                        <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                      </label>
                      <div className="edit-actions">
                        <button type="submit" className="primary">Сохранить</button>
                        <button type="button" className="secondary" onClick={cancelEdit}>Отменить</button>
                      </div>
                    </form>
                  </article>
                )
              }
              return (
                <article key={sessionItem.publicId} className="session-row">
                  <div>
                    <strong>{sessionItem.city} · {sessionItem.day}, {formatShortDate(sessionItem.date)}</strong>
                    <p>{sessionItem.time} · {sessionItem.format} · {sessionItem.location}</p>
                    <small className="muted">
                      Мест: {sessionItem.seatsTotal} · статус: {sessionStatusLabels[sessionItem.adminStatus] || sessionItem.adminStatus}
                    </small>
                  </div>
                  <div className="session-row-actions">
                    <select
                      value={sessionItem.adminStatus}
                      onChange={(e) => updateSessionStatus(sessionItem.publicId, e.target.value)}
                    >
                      {sessionStatusOptions.map((s) => (
                        <option key={s} value={s}>{sessionStatusLabels[s]}</option>
                      ))}
                    </select>
                    <button type="button" className="secondary" onClick={() => startEdit(sessionItem)}>Редактировать</button>
                    <button type="button" className="danger" onClick={() => deleteSession(sessionItem)}>Удалить</button>
                  </div>
                </article>
              )
            })}

            {!sessions.length && !loading && (
              <div className="empty">Групп пока нет. Создайте первую сверху.</div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
