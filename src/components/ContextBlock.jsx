import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const PLACEHOLDERS = [
  'например: маркетолог в IT-компании',
  'например: HR-менеджер в банке',
  'например: основатель стартапа',
  'например: руководитель продукта',
  'например: аналитик данных',
]

export default function ContextBlock() {
  const [value, setValue] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])

  const abortRef = useRef(null)
  const debounceRef = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => {
    if (!value.trim() || value.trim().length < 3) {
      setDisplayText('')
      setHasResult(false)
      setIsStreaming(false)
      abortRef.current?.abort()
      clearTimeout(debounceRef.current)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => triggerStream(value.trim()), 900)

    return () => clearTimeout(debounceRef.current)
  }, [value])

  const triggerStream = async (text) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setDisplayText('')
    setHasResult(true)
    setIsStreaming(true)

    // smooth scroll to result
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)

    try {
      const res = await fetch(`${API_URL}/api/public/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Я ${text}` }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content
            if (token) setDisplayText(prev => prev + token)
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setDisplayText('Не удалось загрузить объяснение. Попробуй ещё раз.')
      }
    } finally {
      if (!controller.signal.aborted) setIsStreaming(false)
    }
  }

  return (
    <section className="py-16 bg-white border-b border-cyan-100">
      <div className="max-w-2xl mx-auto px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-cyan-500 font-semibold text-sm uppercase tracking-widest mb-2">Для тебя лично</p>
          <h2 className="text-2xl md:text-3xl font-bold text-ink-900 leading-snug">
            Кто ты? Объясним вайб-кодинг<br className="hidden md:block" /> на твоём языке
          </h2>
        </div>

        {/* Input */}
        <div className="relative group">
          <div className="flex items-center gap-3 bg-ink-900 rounded-2xl px-5 py-4 ring-2 ring-transparent group-focus-within:ring-cyan-400 transition-all">
            <span className="text-white/40 text-base font-medium flex-shrink-0 select-none">Я —</span>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              maxLength={120}
              className="flex-1 bg-transparent text-white placeholder-white/25 text-base focus:outline-none"
            />
            {isStreaming && (
              <span className="flex gap-1 flex-shrink-0">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            )}
          </div>
          {!value && (
            <p className="text-ink-400 text-xs mt-2 ml-1">
              Напиши свою роль — и получишь объяснение под себя
            </p>
          )}
        </div>

        {/* Result */}
        {hasResult && (
          <div ref={resultRef} className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logos/vibe42.jpg" alt="Vibe 42" className="w-6 h-6 rounded-lg object-cover" />
              <span className="text-ink-500 text-xs">Vibe 42 · специально для тебя</span>
            </div>

            <div className="relative pl-4 border-l-2 border-cyan-400">
              {displayText ? (
                <p className="text-ink-800 text-[15px] leading-relaxed">
                  {displayText}
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {[100, 90, 75].map((w, i) => (
                    <div key={i} className={`h-3 bg-cyan-100 rounded animate-pulse`} style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
