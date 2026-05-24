const examples = [
  'Лендинг для услуги', 'Сайт личного бренда', 'Страница регистрации',
  'Форму заявки', 'Мини-приложение', 'Прототип сервиса',
  'Калькулятор', 'AI-помощника', 'MVP для проверки идеи',
]

export default function WhatIs() {
  return (
    <section id="what" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Что это</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Что такое вайб-кодинг</h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-4">
          Вайб-кодинг — это способ создавать цифровые продукты с помощью AI. Ты описываешь идею
          обычными словами, а AI помогает собрать сайт, лендинг, приложение, форму, прототип или
          другой цифровой инструмент.
        </p>
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          Тебе не нужно знать языки программирования. Главное — научиться правильно ставить задачу,
          управлять результатом и дорабатывать проект вместе с AI.
        </p>

        <div className="bg-gray-50 rounded-2xl p-6">
          <p className="text-gray-500 text-sm font-medium mb-4">Примеры того, что можно создать:</p>
          <div className="flex flex-wrap gap-3">
            {examples.map(e => (
              <span key={e} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700">
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
