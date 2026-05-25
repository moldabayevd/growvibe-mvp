import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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

const phoneDigits = (input) => String(input || '').replace(/\D/g, '')
const isPhoneValid = (input) => phoneDigits(input).length === 11

export default function RequestForm({ onToast }) {
  const [form, setForm] = useState({ orgName: '', employees: '', phone: '' })
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const orgValid = form.orgName.trim().length >= 2
  const employeesNum = Number(form.employees)
  const employeesValid = Number.isInteger(employeesNum) && employeesNum >= 1 && employeesNum <= 100000
  const phoneValid = isPhoneValid(form.phone)
  const formValid = orgValid && employeesValid && phoneValid

  const handlePhoneChange = (raw) =>
    setForm((prev) => ({ ...prev, phone: formatPhone(raw) }))
  const handlePhoneFocus = () => {
    if (!form.phone) setForm((prev) => ({ ...prev, phone: '+7 ' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!formValid) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/public/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          employeeCount: employeesNum,
          contactPhone: form.phone,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Ошибка отправки заявки')
      setSubmitted(true)
      onToast?.('Заявка отправлена — свяжемся в ближайшее время')
    } catch (err) {
      setError(err.message || 'Ошибка отправки. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section id="request" className="py-20 bg-ink-900">
        <div className="max-w-lg mx-auto px-6 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400 text-ink-900 mx-auto mb-6 flex items-center justify-center text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-3xl font-bold mb-3">Заявка отправлена</h2>
          <p className="text-white/70 mb-8">
            Спасибо! Свяжемся с вами по указанному номеру в ближайшее время —
            подберём формат обучения и пришлём предложение.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setForm({ orgName: '', employees: '', phone: '' })
              setTouched(false)
            }}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Отправить ещё одну
          </button>
        </div>
      </section>
    )
  }

  return (
    <section id="request" className="py-20 bg-ink-900">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-cyan-400 font-semibold text-sm uppercase tracking-widest mb-3">
          Заявка
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Оставьте заявку — свяжемся и обсудим
        </h2>
        <p className="text-white/60 mb-8">
          Расскажем про форматы, согласуем программу и стоимость под вашу команду.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">
          <Field
            label="Название организации"
            placeholder="ТОО «Пример»"
            value={form.orgName}
            onChange={(v) => setForm({ ...form, orgName: v })}
            error={touched && !orgValid ? 'Укажите название организации' : null}
          />

          <Field
            label="Количество сотрудников"
            placeholder="например, 12"
            inputMode="numeric"
            value={form.employees}
            onChange={(v) => setForm({ ...form, employees: v.replace(/[^\d]/g, '') })}
            error={touched && !employeesValid ? 'Введите число от 1 до 100000' : null}
          />

          <Field
            label="Контактный телефон"
            placeholder="+7 (777) 000-00-00"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handlePhoneChange}
            onFocus={handlePhoneFocus}
            error={touched && !phoneValid ? 'Введите номер целиком: 11 цифр, начиная с +7' : null}
            ok={form.phone.length > 3 && phoneValid}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-4 rounded-xl text-base transition-colors ${
              loading
                ? 'bg-cyan-400/60 text-ink-900 cursor-wait'
                : 'bg-cyan-400 hover:bg-cyan-300 text-ink-900'
            }`}
          >
            {loading ? 'Отправляем…' : 'Отправить заявку →'}
          </button>

          <p className="text-white/40 text-xs text-center">
            Нажимая «Отправить», вы соглашаетесь на обработку контактных данных
            для связи по этой заявке.
          </p>
        </form>
      </div>
    </section>
  )
}

function Field({ label, error, ok, onFocus, ...rest }) {
  return (
    <div>
      <label className="block text-white/70 text-sm mb-1.5">{label}</label>
      <input
        {...rest}
        onFocus={onFocus}
        onChange={(e) => rest.onChange?.(e.target.value)}
        className={`w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm transition-colors ${
          error
            ? 'border-red-400/70 focus:border-red-400'
            : ok
              ? 'border-cyan-400/60 focus:border-cyan-400'
              : 'border-white/15 focus:border-cyan-400'
        }`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
