export default function Foundation() {
  return (
    <section className="relative py-20 bg-ink-900 overflow-hidden">
      {/* glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-400 opacity-10 blur-[160px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6">

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/40 rounded-full px-4 py-1.5 text-sm text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Некоммерческое движение
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white text-center leading-tight mb-6">
          Мы не зарабатываем —<br />
          мы развиваем
        </h2>

        <p className="text-white/70 text-center text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Vibe 42 создано на базе{' '}
          <a
            href="https://cpfed.kz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 font-semibold underline underline-offset-4 decoration-cyan-400/40 hover:decoration-cyan-400 transition-colors"
          >
            Федерации спорт программирования Казахстана
          </a>{' '}
          — официально некоммерческой организации, которая в 2026 году
          проводит мировую Олимпиаду по спортивному программированию.
        </p>

        {/* Highlight card — explains what nonprofit means in practice */}
        <div className="bg-white/[0.03] border border-cyan-400/30 rounded-2xl p-6 md:p-8 mb-10">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✕
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Что значит «не зарабатываем»</p>
                <p className="text-white/60 text-sm leading-relaxed">
                  У движения нет владельцев, акционеров и прибыли.
                  Никто не получает деньги «себе в карман».
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-400 text-ink-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
                →
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Куда идут все средства</p>
                <p className="text-white/60 text-sm leading-relaxed">
                  100% доходов — на бесплатные программы для школьников,
                  студентов, олимпиады и открытые материалы по AI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div className="text-center">
          <p className="text-cyan-400 font-bold text-xl md:text-2xl tracking-wide mb-2">
            Adapt · Amplify · Stay Human
          </p>
          <p className="text-white/50 text-sm">
            Адаптируйся · Усиливай себя · Оставайся человеком
          </p>
        </div>

      </div>
    </section>
  )
}
