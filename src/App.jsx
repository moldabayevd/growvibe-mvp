import { useState, useRef, useCallback, useEffect } from 'react'
import { sessions as initialSessions } from './data/sessions'
import Hero from './components/Hero'
import WhatIs from './components/WhatIs'
import ForWhom from './components/ForWhom'
import WhatYouMake from './components/WhatYouMake'
import Price from './components/Price'
import Requirements from './components/Requirements'
import PrepFlow from './components/PrepFlow'
import Schedule from './components/Schedule'
import ReadinessForm from './components/ReadinessForm'
import RegistrationForm from './components/RegistrationForm'
import FAQ from './components/FAQ'
import FinalCTA from './components/FinalCTA'
import Toast from './components/Toast'
import ProgressNav from './components/ProgressNav'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const skipPrep = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('skipPrep') === '1'

export default function App() {
  const [laptopChecked, setLaptopChecked] = useState(skipPrep)
  const [sessions, setSessions] = useState(initialSessions)
  const [liveSeats, setLiveSeats] = useState({}) // { sessionId: { seatsLeft, status } }
  const [flowDone, setFlowDone]           = useState(skipPrep)
  const [selectedCity, setSelectedCity]   = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [readiness, setReadiness]   = useState(Array(5).fill(skipPrep))
  const [conditions, setConditions] = useState(Array(5).fill(skipPrep))

  // flash states: which section to shake
  const [flashReq,      setFlashReq]      = useState(false)
  const [flashPrep,     setFlashPrep]     = useState(false)
  const [flashSchedule, setFlashSchedule] = useState(false)
  const [flashReadiness,setFlashReadiness]= useState(false)

  // toast
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])

  const reqRef      = useRef(null)
  const prepRef     = useRef(null)
  const scheduleRef = useRef(null)
  const readinessRef= useRef(null)
  const registerRef = useRef(null)

  // Загружаем живые остатки мест из backend + обновляем каждые 60 сек
  useEffect(() => {
    const fetchSeats = () =>
      fetch(`${API_URL}/api/public/sessions`)
        .then(r => r.json())
        .then(data => {
          const fetchedSessions = data.sessions || []
          const next = {}
          for (const session of fetchedSessions) {
            next[session.publicId || session.id] = {
              seatsLeft: session.seatsLeft,
              seatsTotal: session.seatsTotal,
              status: session.status,
              paidCount: session.paidCount,
            }
          }
          if (fetchedSessions.length) {
            setSessions(fetchedSessions)
          }
          setLiveSeats(next)
        })
        .catch(() => {})

    fetchSeats()
    const interval = setInterval(fetchSeats, 60_000)
    return () => clearInterval(interval)
  }, [])

  const readinessDone = readiness.every(Boolean) && conditions.every(Boolean)
  const canRegister   = flowDone && selectedSession && readinessDone

  const flash = (setFn, ref, msg) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFn(true)
    setTimeout(() => setFn(false), 1200)
    setToast(msg)
  }

  // Main CTA — checks each gate in order, scrolls to first incomplete
  const handleCTA = useCallback(() => {
    if (!laptopChecked) {
      flash(setFlashReq, reqRef, 'Сначала подтвердите, что ноутбук подходит для участия')
      return
    }
    if (!flowDone) {
      flash(setFlashPrep, prepRef, 'Пройдите все 7 шагов подготовки — без этого регистрация недоступна')
      return
    }
    if (!selectedSession) {
      flash(setFlashSchedule, scheduleRef, 'Выберите удобную дату и город')
      return
    }
    if (!readinessDone) {
      flash(setFlashReadiness, readinessRef, 'Подтвердите готовность к обучению')
      return
    }
    registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [laptopChecked, flowDone, selectedSession, readinessDone])

  const scrollToSchedule = () =>
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-screen bg-white">
      {toast && <Toast key={toast} message={toast} onDone={clearToast} />}

      <ProgressNav
        laptopChecked={laptopChecked}
        flowDone={flowDone}
        selectedSession={selectedSession}
        readinessDone={readinessDone}
        refs={{ req: reqRef, prep: prepRef, schedule: scheduleRef, readiness: readinessRef, register: registerRef }}
      />

      <Hero onCTA={handleCTA} onSchedule={scrollToSchedule} />
      <WhatIs />
      <ForWhom />
      <WhatYouMake />
      <Price onCTA={handleCTA} />

      <div ref={reqRef}>
        <Requirements
          laptopChecked={laptopChecked}
          setLaptopChecked={setLaptopChecked}
          flash={flashReq}
          onNext={() => prepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      <div ref={prepRef}>
        <PrepFlow
          onFlowComplete={() => setFlowDone(true)}
          flash={flashPrep}
        />
      </div>

      <div ref={scheduleRef}>
        <Schedule
          sessions={sessions}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          selectedSession={selectedSession}
          setSelectedSession={setSelectedSession}
          flowDone={flowDone}
          flash={flashSchedule}
          liveSeats={liveSeats}
        />
      </div>

      <div ref={readinessRef}>
        <ReadinessForm
          readiness={readiness}   setReadiness={setReadiness}
          conditions={conditions} setConditions={setConditions}
          flash={flashReadiness}
        />
      </div>

      <div ref={registerRef}>
        <RegistrationForm
          sessions={sessions}
          canRegister={canRegister}
          selectedSession={selectedSession}
          onBlockedClick={handleCTA}
        />
      </div>

      <FAQ />
      <FinalCTA onCTA={handleCTA} />

      <footer className="bg-gray-900 text-gray-400 text-center py-8 text-sm">
        © 2026 Гроу Вайб · Офлайн-практикум по вайб-кодингу
      </footer>
    </div>
  )
}
