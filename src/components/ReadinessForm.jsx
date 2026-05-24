const readinessItems = [
  'У меня есть ноутбук',
  'Я установил/установила нужные инструменты до занятия',
  'Я понимаю, что обучение практическое',
  'Я готов/готова прийти вовремя',
  'Я понимаю, что без подготовки мне будет сложнее участвовать',
]

const conditionsItems = [
  'Обучение проходит офлайн',
  'Я прихожу с оплаченным участием',
  'Если занятие в кафе — еду и напитки я оплачиваю самостоятельно',
  'Я понимаю, что место бронируется после оплаты',
  'Я согласен/согласна с условиями участия',
]

export default function ReadinessForm({ readiness, setReadiness, conditions, setConditions, flash }) {
  const toggle = (state, setState, i) => {
    const next = [...state]
    next[i] = !next[i]
    setState(next)
  }

  return (
    <section className={`py-20 bg-white transition-all ${flash ? 'animate-shake outline outline-2 outline-[#D97757] rounded-2xl' : ''}`}>
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Финальный шаг</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">Проверьте готовность</h2>

        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Готовность к обучению</h3>
            <div className="space-y-3">
              {readinessItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!readiness[i]}
                    onChange={() => toggle(readiness, setReadiness, i)}
                    className="mt-0.5 w-5 h-5 rounded accent-[#D97757] flex-shrink-0"
                  />
                  <span className="text-gray-700 text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Условия участия</h3>
            <div className="space-y-3">
              {conditionsItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!conditions[i]}
                    onChange={() => toggle(conditions, setConditions, i)}
                    className="mt-0.5 w-5 h-5 rounded accent-[#D97757] flex-shrink-0"
                  />
                  <span className="text-gray-700 text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
