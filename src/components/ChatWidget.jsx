import { useState, useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const CHIPS = [
  { label: 'Что такое вайб-кодинг?', message: 'Что такое вайб-кодинг и чем Vibe 42 отличается от обычных курсов?' },
  { label: 'Для кого подходит?', message: 'Для каких команд и отделов подходит обучение?' },
  { label: 'Что получит команда?', message: 'Что конкретно получит команда после обучения?' },
  { label: 'Формат и стоимость', message: 'В каком формате проходит обучение и как считается стоимость?' },
  { label: 'Хочу заявку →', message: 'Как оставить заявку для своей команды?' },
]

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-cyan-400 text-ink-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
      42
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chipsVisible, setChipsVisible] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const newMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setChipsVisible(false)

    try {
      const history = newMessages.slice(0, -1)
      const res = await fetch(`${API_URL}/api/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Что-то пошло не так. Оставьте заявку в форме ниже — свяжемся лично.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-cyan-100 flex flex-col z-50 overflow-hidden"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-ink-900 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-400 text-ink-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
              42
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm leading-tight">Помощник — Vibe 42</div>
              <div className="text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                <span className="text-cyan-400">Онлайн · отвечу за секунду</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white text-xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {/* Welcome bubble */}
            <div className="flex gap-2 items-start">
              <BotAvatar />
              <div className="bg-cyan-50 border border-cyan-100 rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm text-ink-800 max-w-[85%] leading-relaxed">
                Привет! 👋 Я помощник <strong>Vibe 42</strong> — расскажу про обучение вайб-кодингу для команд, отвечу на вопросы. Чем могу помочь?
              </div>
            </div>

            {/* Quick chips */}
            {chipsVisible && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.message)}
                    className="bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-lg px-2.5 py-1.5 text-xs text-ink-700 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Message history */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && <BotAvatar />}
                <div
                  className={`rounded-2xl px-3 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ink-900 text-white rounded-tr-sm'
                      : 'bg-cyan-50 border border-cyan-100 text-ink-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex gap-2 items-start">
                <BotAvatar />
                <div className="bg-cyan-50 border border-cyan-100 rounded-2xl rounded-tl-sm px-4 py-3.5">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-cyan-100 flex-shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишите вопрос..."
                className="flex-1 bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-ink-900 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Float button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 w-14 h-14 bg-cyan-400 hover:bg-cyan-300 text-ink-900 rounded-2xl shadow-lg shadow-cyan-400/30 flex items-center justify-center z-50 transition-all"
        aria-label="Открыть чат с помощником"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
