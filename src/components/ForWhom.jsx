const cards = [
  { title: 'Продуктовые команды', desc: 'Быстрее проверяют идеи и собирают прототипы без очереди к разработчикам.' },
  { title: 'Маркетинг и продажи', desc: 'Сами делают лендинги, формы, мини-инструменты под кампании и клиентов.' },
  { title: 'HR и операционные отделы', desc: 'Автоматизируют рутину, делают внутренние странички, формы заявок и опросов.' },
  { title: 'Руководители направлений', desc: 'Получают команду, которая может за день собрать MVP вместо двух недель ТЗ.' },
  { title: 'Аналитики и менеджеры', desc: 'Превращают идеи в работающие интерфейсы и быстро тестируют гипотезы.' },
  { title: 'Стартапы и небольшие команды', desc: 'Учат всю команду делать продукты в связке с AI — без раздувания штата.' },
]

export default function ForWhom() {
  return (
    <section className="py-20 bg-cyan-50/40">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-cyan-500 font-semibold text-sm uppercase tracking-widest mb-3">Для кого</p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-10">
          Кому подойдёт обучение
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-2xl p-6 border border-cyan-100 hover:border-cyan-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold mb-3">
                ✦
              </div>
              <h3 className="font-semibold text-ink-900 mb-2">{c.title}</h3>
              <p className="text-ink-500 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
