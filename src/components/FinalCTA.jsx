export default function FinalCTA({ onCTA }) {
  return (
    <section className="py-24 bg-[#D97757]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Готов создать свой первый AI-проект?
        </h2>
        <p className="text-white/80 text-lg mb-10">
          Три часа практики. Реальный результат. Астана и Алматы.
        </p>
        <button
          onClick={onCTA}
          className="bg-white text-[#D97757] font-bold px-10 py-4 rounded-xl text-base hover:bg-white/90 transition-colors"
        >
          Пройти подготовку и записаться →
        </button>
      </div>
    </section>
  )
}
