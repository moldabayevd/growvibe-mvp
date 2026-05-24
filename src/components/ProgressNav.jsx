const steps = [
  { label: 'Ноутбук',    icon: '💻' },
  { label: 'Подготовка', icon: '🛠️' },
  { label: 'Расписание', icon: '📅' },
  { label: 'Готовность', icon: '✅' },
  { label: 'Заявка',     icon: '📝' },
]

export default function ProgressNav({ laptopChecked, flowDone, selectedSession, readinessDone, refs }) {
  const done = [laptopChecked, flowDone, !!selectedSession, readinessDone, false]
  const firstIncomplete = done.findIndex(d => !d)

  const scroll = (ref) =>
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const refsList = [refs.req, refs.prep, refs.schedule, refs.readiness, refs.register]

  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex items-center gap-2 select-none">
      {/* vertical label */}
      <span
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        🚦 светофор подготовки
      </span>

      <div className="flex flex-col items-center">
        {steps.map((step, i) => {
          const isDone    = done[i]
          const isCurrent = i === firstIncomplete

          return (
            <div key={i} className="flex flex-col items-center">
              {/* dot + hover label */}
              <button
                onClick={() => scroll(refsList[i])}
                className="group relative flex items-center justify-center"
              >
                {/* label tooltip (appears left on hover) */}
                <span
                  className={`
                    absolute right-7 whitespace-nowrap text-xs font-semibold px-2.5 py-1.5 rounded-lg border
                    shadow-sm pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-all duration-150
                    ${isDone
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : isCurrent
                        ? 'bg-orange-50 text-[#D97757] border-orange-200'
                        : 'bg-red-50 text-red-600 border-red-200'}
                  `}
                >
                  {isDone ? '✓' : isCurrent ? '→' : '✗'} {step.icon} {step.label}
                </span>

                {/* dot */}
                <div
                  className={`
                    w-3.5 h-3.5 rounded-full border-2 transition-all duration-300
                    ${isDone
                      ? 'bg-green-500 border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]'
                      : isCurrent
                        ? 'bg-white border-[#D97757] shadow-[0_0_0_4px_rgba(217,119,87,0.2)] animate-pulse'
                        : 'bg-red-100 border-red-400'}
                  `}
                />
              </button>

              {/* connector line between dots */}
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-9 transition-colors duration-500 ${
                    isDone ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
