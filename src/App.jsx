import { useCallback, useRef, useState } from 'react'
import Hero from './components/Hero'
import WhatIs from './components/WhatIs'
import ForWhom from './components/ForWhom'
import WhatYouMake from './components/WhatYouMake'
import RequestForm from './components/RequestForm'
import FAQ from './components/FAQ'
import Toast from './components/Toast'
import ChatWidget from './components/ChatWidget'
import Partners from './components/Partners'
import ContextBlock from './components/ContextBlock'

export default function App() {
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])
  const formRef = useRef(null)

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen bg-white text-ink-900">
      {toast && <Toast key={toast} message={toast} onDone={clearToast} />}

      <Hero onCTA={scrollToForm} />
      <Partners />
      <ContextBlock />
      <WhatIs />
      <ForWhom />
      <WhatYouMake onCTA={scrollToForm} />

      <div ref={formRef}>
        <RequestForm onToast={(m) => setToast(m)} />
      </div>

      <FAQ />

      <footer className="bg-ink-900 text-white/60 text-center py-10 text-sm">
        <div className="max-w-4xl mx-auto px-6">
          <img src="/logos/vibe42.jpg" alt="Vibe 42" className="w-12 h-12 rounded-xl mx-auto mb-3" />
          <div>© 2026 Vibe 42 · Движение вайб-кодинга для команд</div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  )
}
