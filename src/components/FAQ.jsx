import { useState } from 'react'

const faqs = [
  { q: 'Нужно ли знать программирование?', a: 'Нет. Вайб-кодинг создан именно для тех, кто не умеет программировать. Ты описываешь идею словами — AI делает код.' },
  { q: 'Нужна ли платная подписка на AI?', a: 'Да. Для комфортной работы нужна подписка Claude Pro — $20/мес. Это не входит в стоимость практикума и оплачивается отдельно.' },
  { q: 'Можно ли участвовать с телефона?', a: 'Нет. Обучение практическое, нужен личный ноутбук. Участие только с телефона невозможно.' },
  { q: 'Где проходит занятие?', a: 'В кафе или коворкинге. Точный адрес отправляем после оплаты.' },
  { q: 'Что я возьму с собой после занятия?', a: 'Готовый проект, который ты создал сам. Навык, которым владеют единицы. Ты войдёшь в число тех, кто уже умеет работать с AI — пока большинство только читает об этом. Вайб-кодинг сейчас на подъёме, и ты будешь среди первых.' },
  { q: 'Можно ли вернуть деньги?', a: 'Да, если предупредить за 48 часов до занятия.' },
  { q: 'Нужен ли опыт работы с AI?', a: 'Нет, всё объясняем с нуля. Подготовительные шаги помогут настроить инструменты заранее.' },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">Часто задаваемые вопросы</h2>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900">{f.q}</span>
                <span className="text-gray-400 text-lg ml-4 flex-shrink-0">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
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
