const items = [
  'Команда поймёт, что такое вайб-кодинг и где он реально помогает',
  'Сотрудники научатся ставить задачи AI и получать рабочий результат',
  'Каждый сделает свой первый цифровой проект на практике',
  'Освоят Claude и базовые инструменты вайб-кодинга',
  'Научатся работать с GitHub и сохранять свои наработки',
  'Получат набор готовых промптов под рабочие задачи',
  'Научатся дорабатывать и улучшать результат итерациями',
  'Поймут, как применить вайб-кодинг внутри своих процессов',
]

export default function WhatYouMake({ onCTA }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-cyan-500 font-semibold text-sm uppercase tracking-widest mb-3">Программа</p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-4">
          Что команда вынесет с обучения
        </h2>
        <p className="text-ink-500 text-lg mb-10">
          Формат и количество занятий подбираем под размер команды и задачи. Программу
          и расписание согласуем после заявки.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mb-10">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-cyan-50/60 border border-cyan-100 rounded-xl px-5 py-4"
            >
              <span className="text-cyan-600 font-bold text-sm mt-0.5">0{i + 1}</span>
              <span className="text-ink-700 text-sm">{item}</span>
            </div>
          ))}
        </div>

        {onCTA && (
          <div className="text-center">
            <button
              onClick={onCTA}
              className="bg-ink-900 hover:bg-ink-800 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Оставить заявку для команды →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
