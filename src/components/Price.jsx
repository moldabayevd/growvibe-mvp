export default function Price({ onCTA }) {
  return (
    <section className="py-20 bg-[#0f0f0f] text-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Стоимость</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Стоимость участия</h2>
        <div className="text-6xl md:text-7xl font-bold text-[#D97757] my-8">50 000 ₸</div>
        <p className="text-white/60 text-lg mb-10">
          За 3 часа ты создашь свой первый AI-проект и поймёшь, как использовать вайб-кодинг для работы, бизнеса или личных задач.
        </p>

        <div className="grid md:grid-cols-2 gap-6 text-left mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="font-semibold mb-4 text-white">Входит в стоимость:</p>
            {['3 часа практического обучения', 'Работа над первым проектом', 'Помощь тренера', 'Базовые промпты', 'Инструкция по дальнейшей работе'].map(i => (
              <div key={i} className="flex items-center gap-2 text-white/70 text-sm mb-2">
                <span className="text-[#D97757]">✓</span> {i}
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="font-semibold mb-4 text-white/60">Не входит:</p>
            {['Еда и напитки в кафе', 'Подписка Claude Pro', 'Другие платные AI-инструменты', 'Личный ноутбук'].map(i => (
              <div key={i} className="flex items-center gap-2 text-white/40 text-sm mb-2">
                <span>—</span> {i}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onCTA}
          className="bg-[#D97757] hover:bg-[#c4674a] text-white font-semibold px-10 py-4 rounded-xl text-base transition-colors"
        >
          Пройти подготовку и записаться →
        </button>
      </div>
    </section>
  )
}
