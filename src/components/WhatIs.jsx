const examples = [
  'Внутренние инструменты', 'Лендинги под продукты', 'MVP для проверки идей',
  'AI-помощники для отдела', 'Автоматизация рутины', 'Формы и калькуляторы',
  'Прототипы новых сервисов', 'Дашборды и отчёты',
]

export default function WhatIs() {
  return (
    <section id="what" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-cyan-500 font-semibold text-sm uppercase tracking-widest mb-3">Что это</p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">
          Что такое вайб-кодинг
        </h2>
        <p className="text-ink-600 text-lg leading-relaxed mb-4">
          Вайб-кодинг — это способ создавать цифровые продукты с помощью AI.
          Сотрудник описывает задачу обычными словами, а AI помогает собрать
          сайт, приложение, форму, прототип или внутренний инструмент.
        </p>
        <p className="text-ink-600 text-lg leading-relaxed mb-10">
          Знание языков программирования не требуется. Главное —
          научить команду правильно ставить задачу, управлять результатом и
          доводить проект до рабочего вида вместе с AI.
        </p>

        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-6">
          <p className="text-ink-500 text-sm font-medium mb-4">Что обычно делают команды на практике:</p>
          <div className="flex flex-wrap gap-3">
            {examples.map((e) => (
              <span
                key={e}
                className="bg-white border border-cyan-200 rounded-lg px-4 py-2 text-sm text-ink-700"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
