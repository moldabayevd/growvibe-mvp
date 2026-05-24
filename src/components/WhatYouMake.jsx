const items = [
  'Поймёшь, как работает вайб-кодинг',
  'Научишься ставить задачи AI',
  'Создашь первый проект',
  'Попробуешь Claude на практике',
  'Поймёшь, как работать с GitHub',
  'Получишь базовые промпты',
  'Научишься дорабатывать результат',
  'Поймёшь, как применять вайб-кодинг в работе и бизнесе',
]

export default function WhatYouMake() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Программа</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Что ты сделаешь за 3 часа</h2>
        <p className="text-gray-500 text-lg mb-10">
          За одно занятие ты не просто послушаешь теорию — создашь первый цифровой результат на своём ноутбуке.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl px-5 py-4">
              <span className="text-[#D97757] font-bold text-sm mt-0.5">0{i + 1}</span>
              <span className="text-gray-700 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
