import { useState } from 'react'

const faqs = [
  {
    q: 'В каком формате проходит обучение?',
    a: 'Подбираем под команду: можно офлайн в вашем офисе или коворкинге, можно онлайн. Длительность и количество встреч согласуем после заявки — зависит от размера группы и задач.',
  },
  {
    q: 'Нужно ли сотрудникам уметь программировать?',
    a: 'Нет. Вайб-кодинг как раз для тех, кто не пишет код. Сотрудники описывают идею словами, а AI собирает результат. На обучении мы показываем, как правильно ставить задачи и доводить проект до рабочего вида.',
  },
  {
    q: 'Сколько сотрудников может участвовать?',
    a: 'От небольших отделов до больших групп — формат гибкий. Оптимальный размер группы согласуем с вами, исходя из задач и формата (офлайн/онлайн).',
  },
  {
    q: 'Что нужно от компании?',
    a: 'Ноутбуки для участников и место (если офлайн). Всё остальное — программу, материалы, ведущего — берём на себя. Подписки на нужные AI-инструменты обсудим отдельно.',
  },
  {
    q: 'Как считается стоимость?',
    a: 'Стоимость зависит от количества сотрудников, формата и программы. Рассчитаем индивидуально и пришлём предложение после заявки.',
  },
  {
    q: 'Что в результате получает команда?',
    a: 'Реальные навыки, готовые проекты, сделанные руками сотрудников на обучении, и понимание, как применять вайб-кодинг внутри ваших процессов. После — команда продолжает использовать инструменты в работе.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)

  return (
    <section className="py-20 bg-cyan-50/40">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-cyan-500 font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-10">
          Часто задаваемые вопросы
        </h2>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-cyan-100 rounded-2xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-ink-900">{f.q}</span>
                <span className="text-cyan-500 text-lg ml-4 flex-shrink-0">
                  {open === i ? '−' : '+'}
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-ink-600 text-sm leading-relaxed border-t border-cyan-100">
                  <p className="pt-4">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
