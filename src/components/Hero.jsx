export default function Hero({ onCTA }) {
  return (
    <section className="relative bg-ink-900 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-cyan-400 opacity-20 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-cyan-500 opacity-10 blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-cyan-400/40 rounded-full px-4 py-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Нонпрофит движение адаптации к эпохе ИИ
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <img
            src="/logos/vibe42.jpg"
            alt="Vibe 42"
            className="w-24 h-24 md:w-28 md:h-28 rounded-3xl shadow-lg shadow-cyan-400/30"
          />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          <span className="text-cyan-400">Vibe 42</span><br />
          движение вайб-кодинга для&nbsp;команд
        </h1>

        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-6">
          Это не курсы — это движение. Помогаем командам адаптироваться к эпохе ИИ:
          сотрудники начинают создавать продукты с AI, не зная программирования.
        </p>

        <p className="text-cyan-400 font-semibold tracking-widest text-sm uppercase mb-10">
          Adapt · Amplify · Stay Human
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12 text-sm">
          {['Для команд', 'Офлайн или онлайн', 'Под формат компании', 'Практика, не теория'].map((t) => (
            <span key={t} className="bg-white/5 border border-white/15 rounded-full px-4 py-1.5 text-white/80">
              {t}
            </span>
          ))}
        </div>

        <button
          onClick={onCTA}
          className="bg-cyan-400 hover:bg-cyan-300 text-ink-900 font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-cyan-400/20"
        >
          Оставить заявку →
        </button>
      </div>
    </section>
  )
}
