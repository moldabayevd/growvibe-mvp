const cards = [
  { icon: '💼', title: 'Предприниматели', desc: 'Быстро проверяют идеи, создают лендинги, MVP и страницы для своих продуктов.' },
  { icon: '🎓', title: 'Эксперты и консультанты', desc: 'Упаковывают свои услуги, запускают страницы записи, создают цифровые продукты.' },
  { icon: '🖥️', title: 'Офисные сотрудники', desc: 'Осваивают AI-инструменты и усиливают свои рабочие навыки.' },
  { icon: '🌱', title: 'Новички', desc: 'Понимают, что создавать цифровые продукты можно даже без опыта программирования.' },
  { icon: '🤖', title: 'Те, кто давно хотел попробовать AI', desc: 'Перестают просто читать про AI и начинают создавать реальные вещи своими руками.' },
]

export default function ForWhom() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Для кого</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">Кому подойдёт обучение</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {cards.map(c => (
            <div key={c.title} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
