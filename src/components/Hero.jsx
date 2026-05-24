export default function Hero({ onCTA, onSchedule }) {
  return (
    <section className="relative bg-[#0f0f0f] text-white overflow-hidden">
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D97757] opacity-10 blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-[#D97757] animate-pulse" />
          Офлайн-практикум · Астана и Алматы
        </div>

        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          Создайте свой первый<br />
          <span className="text-[#D97757]">AI-проект за 3 часа</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Практикум по вайб-кодингу для новичков. Без знания программирования.
          С нуля. На своём ноутбуке.
        </p>

        {/* pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 text-sm">
          {['3 часа практики', 'Офлайн-формат', 'Для новичков', 'Первый сайт или AI-прототип', '50 000 ₸'].map(t => (
            <span key={t} className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5">
              {t}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onCTA}
            className="bg-[#D97757] hover:bg-[#c4674a] text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
          >
            Пройти подготовку и записаться →
          </button>
          <button
            onClick={onSchedule}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
          >
            Посмотреть расписание
          </button>
        </div>
      </div>
    </section>
  )
}
