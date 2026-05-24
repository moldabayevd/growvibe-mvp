import { useState } from 'react'
import { sessions as fallbackSessions } from '../data/sessions'

const API_URL      = import.meta.env.VITE_API_URL            || 'http://localhost:4000'
const KASPI_PHONE  = import.meta.env.VITE_KASPI_PHONE        || '+7 (777) 000-00-00'
const KASPI_AMOUNT = import.meta.env.VITE_KASPI_AMOUNT       || '50 000'

// Маска +7 (XXX) XXX-XX-XX. Принимает любой ввод, нормализует к 11 цифрам с лидирующей 7.
function formatPhone(input) {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)
  const a = digits.slice(1, 4)
  const b = digits.slice(4, 7)
  const c = digits.slice(7, 9)
  const d = digits.slice(9, 11)
  let out = '+7'
  if (a) out += ' (' + a
  if (a.length === 3) out += ')'
  if (b) out += ' ' + b
  if (c) out += '-' + c
  if (d) out += '-' + d
  return out
}

function phoneDigits(input) {
  return String(input || '').replace(/\D/g, '')
}

const isPhoneValid = (input) => phoneDigits(input).length === 11

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
}

// Генерирует .ics файл и скачивает его
function downloadICS(session) {
  const [startH, endH] = session.time.split('–')
  const d = new Date(session.date)
  const pad = n => String(n).padStart(2, '0')
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const toTime = t => t.replace(':', '') + '00'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GrowVibe//RU',
    'BEGIN:VEVENT',
    `DTSTART:${dateStr}T${toTime(startH)}`,
    `DTEND:${dateStr}T${toTime(endH)}`,
    `SUMMARY:🚀 Гроу Вайб — AI-практикум (${session.city})`,
    `DESCRIPTION:Вайб-кодинг практикум. Адрес придёт после оплаты.`,
    `LOCATION:${session.location}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Напоминание: через час начинается практикум Гроу Вайб!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'growvibe-praktikum.ics'
  a.click()
  URL.revokeObjectURL(url)
}

// Ссылка на Google Calendar
function googleCalLink(session) {
  const [startH, endH] = session.time.split('–')
  const d = new Date(session.date)
  const pad = n => String(n).padStart(2, '0')
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const toTime = t => t.replace(':', '') + '00'
  const start = `${dateStr}T${toTime(startH)}`
  const end   = `${dateStr}T${toTime(endH)}`
  const text  = encodeURIComponent(`Гроу Вайб — AI-практикум (${session.city})`)
  const loc   = encodeURIComponent(session.location)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&location=${loc}&details=${encodeURIComponent('Вайб-кодинг практикум. Адрес придёт после оплаты.')}`
}

export default function RegistrationForm({ sessions = fallbackSessions, canRegister, selectedSession, onBlockedClick }) {
  const [form, setForm]         = useState({ name: '', whatsapp: '', email: '' })
  const [step, setStep]         = useState('form')   // 'form' | 'payment' | 'confirmed'
  const [loading, setLoading]   = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [error, setError]       = useState(null)
  const [touched, setTouched]   = useState(false)
  const [receipt, setReceipt]   = useState(null)     // File объект
  const [receiptPreview, setReceiptPreview] = useState(null) // URL превью
  const [applicationId, setApplicationId] = useState(null)

  const session    = sessions.find(s => String(s.id) === String(selectedSession))
  const phoneValid = isPhoneValid(form.whatsapp)
  const formValid  = form.name.trim() && phoneValid

  const handlePhoneChange = (raw) => {
    setForm(prev => ({ ...prev, whatsapp: formatPhone(raw) }))
  }
  const handlePhoneFocus = () => {
    if (!form.whatsapp) setForm(prev => ({ ...prev, whatsapp: '+7 ' }))
  }

  // ── Шаг 1: отправить заявку ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canRegister) { onBlockedClick?.(); return }
    setTouched(true)
    if (!formValid) return
    setLoading(true); setError(null)
    try {
      const phone = form.whatsapp
      const response = await fetch(`${API_URL}/api/public/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone,
          whatsapp: phone,
          email: form.email,
          sessionPublicId: String(session?.publicId || session?.id),
          flowCompleted: true,
          readinessConfirmed: true,
          conditionsConfirmed: true,
          source: 'landing',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки заявки')
      }
      setApplicationId(data.applicationId)
      setStep('payment')
    } catch (err) { setError(err.message || 'Ошибка отправки. Попробуйте ещё раз.') }
    finally { setLoading(false) }
  }

  // ── Шаг 2: подтвердить оплату ────────────────────────────────────────────
  const handlePayConfirm = async () => {
    setError(null)
    if (!applicationId) {
      setError('Не найден номер заявки. Отправьте заявку ещё раз.')
      return
    }
    if (!receipt) {
      setError('Прикрепите скриншот чека перед отправкой.')
      return
    }
    setPayLoading(true)
    try {
      const payload = new FormData()
      payload.append('receipt', receipt)
      const response = await fetch(`${API_URL}/api/public/applications/${applicationId}/payment-proof`, {
        method: 'POST',
        body: payload,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки чека')
      }
      setStep('confirmed')
    } catch (err) { setError(err.message || 'Ошибка отправки чека. Попробуйте ещё раз.') }
    finally { setPayLoading(false) }
  }

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceipt(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  const copyPhone = () => {
    navigator.clipboard.writeText(KASPI_PHONE.replace(/\D/g, ''))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Экран: оплата Kaspi ───────────────────────────────────────────────────
  if (step === 'payment') {
    return (
      <section id="register" className="py-20 bg-[#0f0f0f]">
        <div className="max-w-lg mx-auto px-6 text-white">
          {/* прогресс */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">✓</span>
              Заявка
            </div>
            <div className="flex-1 h-px bg-white/20" />
            <div className="flex items-center gap-2 text-[#D97757] text-sm font-medium">
              <span className="w-6 h-6 rounded-full bg-[#D97757] text-white text-xs flex items-center justify-center font-bold">2</span>
              Чек
            </div>
            <div className="flex-1 h-px bg-white/20" />
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white/30 text-xs flex items-center justify-center font-bold">3</span>
              Проверка
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Оплати через Kaspi</h2>
          <p className="text-white/50 text-sm mb-8">Переведи на номер ниже и прикрепи чек. Место закрепится после проверки организатором.</p>

          {/* сумма + номер */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Сумма</p>
            <p className="text-3xl font-bold text-[#D97757] mb-5">{KASPI_AMOUNT} ₸</p>

            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Номер Kaspi</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-mono font-bold">{KASPI_PHONE}</p>
              <button
                onClick={copyPhone}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? '✓ Скопировано' : 'Копировать'}
              </button>
            </div>

            {session && (
              <p className="text-white/30 text-xs mt-4 border-t border-white/10 pt-4">
                В комментарии к переводу укажи: <span className="text-white/60 font-medium">{session.city} · {formatDate(session.date)}</span>
              </p>
            )}
          </div>

          {/* прикрепить чек */}
          <div className="mb-6">
            <p className="text-white/50 text-sm mb-3">Прикрепи скриншот чека об оплате:</p>
            <label className="block cursor-pointer">
              {receiptPreview ? (
                <div className="relative">
                  <img src={receiptPreview} alt="Чек" className="w-full max-h-48 object-contain rounded-xl border border-white/20 mb-2" />
                  <div className="text-white/40 text-xs text-center">Нажми чтобы заменить</div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/20 hover:border-[#D97757] rounded-xl p-8 text-center transition-colors">
                  <div className="text-3xl mb-2">📎</div>
                  <p className="text-white/50 text-sm">Нажми чтобы прикрепить скриншот</p>
                  <p className="text-white/30 text-xs mt-1">JPG, PNG до 5 МБ</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleReceiptChange} className="hidden" />
            </label>
          </div>

          {/* кнопка подтверждения */}
          <button
            onClick={handlePayConfirm}
            disabled={payLoading}
            className="w-full bg-[#D97757] hover:bg-[#c4674a] disabled:opacity-60 text-white font-bold py-4 rounded-xl text-base transition-colors mb-3"
          >
            {payLoading ? '⏳ Отправляем...' : '✅ Отправить чек на проверку'}
          </button>
          {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
          <p className="text-white/30 text-xs text-center">
            После проверки оплаты организатор подтвердит участие в WhatsApp
          </p>
        </div>
      </section>
    )
  }

  // ── Экран: всё готово ─────────────────────────────────────────────────────
  if (step === 'confirmed') {
    return (
      <section id="register" className="py-20 bg-[#0f0f0f]">
        <div className="max-w-lg mx-auto px-6 text-white">
          {/* прогресс */}
          <div className="flex items-center gap-3 mb-10">
            {['Заявка','Чек','Проверка'].map((s, i) => (
              <div key={s} className="contents">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">✓</span>
                  {s}
                </div>
                {i < 2 && <div className="flex-1 h-px bg-green-500/40" />}
              </div>
            ))}
          </div>

          <div className="text-5xl mb-4 text-center">🎉</div>
          <h2 className="text-2xl font-bold mb-2 text-center">Чек отправлен на проверку!</h2>
          <p className="text-white/50 text-sm text-center mb-8">
            Организатор проверит оплату в Kaspi и подтвердит место в WhatsApp. До подтверждения статус заявки — «чек на проверке».
          </p>

          {session && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Твоё занятие</p>
              <p className="text-white font-bold text-lg">{session.city} · {formatDate(session.date)}</p>
              <p className="text-white/50 text-sm mt-1">{session.time}</p>
            </div>
          )}

          <p className="text-white/40 text-sm text-center mb-4">Добавь в календарь, чтобы не забыть:</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={session ? googleCalLink(session) : '#'} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-4 py-3 rounded-xl text-sm hover:bg-white/90 transition-colors">
              📅 Google Calendar
            </a>
            {session && (
              <button onClick={() => downloadICS(session)}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-4 py-3 rounded-xl text-sm hover:bg-white/20 transition-colors">
                📲 Apple / Outlook
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  // ── Форма ─────────────────────────────────────────────────────────────────
  return (
    <section id="register" className="py-20 bg-[#0f0f0f]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Регистрация</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Оставить заявку</h2>

        {!canRegister && (
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-8 text-white/60 text-sm">
            ⚠️ Для подачи заявки нужно пройти подготовку, выбрать дату и подтвердить готовность.
          </div>
        )}

        {session && (
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-8">
            <p className="text-white/60 text-sm mb-1">Выбранное занятие:</p>
            <p className="text-white font-semibold">{session.city} · {formatDate(session.date)}</p>
            <p className="text-white/60 text-sm">{session.time} · {session.price}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Имя */}
          {(() => {
            const isEmpty = touched && canRegister && !form.name.trim()
            return (
              <div>
                <label className="block text-white/60 text-sm mb-1.5">Имя и фамилия</label>
                <input
                  type="text"
                  placeholder="Айгерим Назарова"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm transition-colors ${
                    isEmpty ? 'border-red-400' : 'border-white/20 focus:border-[#D97757]'
                  }`}
                />
                {isEmpty && <p className="text-red-400 text-xs mt-1">Заполните это поле</p>}
              </div>
            )
          })()}

          {/* Телефон / WhatsApp — одно поле */}
          {(() => {
            const showError = touched && canRegister && !phoneValid
            const showOk = form.whatsapp.length > 3 && phoneValid
            return (
              <div>
                <label className="block text-white/60 text-sm mb-1.5">
                  Номер WhatsApp <span className="text-white/30">— на этот номер придёт подтверждение</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 (777) 000-00-00"
                  value={form.whatsapp}
                  onChange={e => handlePhoneChange(e.target.value)}
                  onFocus={handlePhoneFocus}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm transition-colors ${
                    showError
                      ? 'border-red-400'
                      : showOk
                        ? 'border-green-400/60 focus:border-green-400'
                        : 'border-white/20 focus:border-[#D97757]'
                  }`}
                />
                {showError && (
                  <p className="text-red-400 text-xs mt-1">
                    Введите номер целиком: 11 цифр, начиная с +7
                  </p>
                )}
                {showOk && (
                  <p className="text-green-400/80 text-xs mt-1">✓ Номер заполнен корректно</p>
                )}
              </div>
            )
          })()}

          {/* Email — опционально */}
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Email, необязательно</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/10 border border-white/20 focus:border-[#D97757] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-4 rounded-xl text-base transition-colors ${
              !canRegister
                ? 'bg-white/20 hover:bg-white/30 text-white/70 border border-white/20'
                : formValid
                  ? 'bg-[#D97757] hover:bg-[#c4674a] text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white/70 border border-white/20'
            } ${loading ? 'opacity-60 cursor-wait' : ''}`}
          >
            {loading
              ? '⏳ Отправляем...'
              : !canRegister
                ? '⚠️ Выполните все шаги выше'
                : formValid
                  ? 'Оставить заявку →'
                  : '📝 Заполните все поля'}
          </button>
        </form>
      </div>
    </section>
  )
}
