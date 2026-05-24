const mac = [
  'macOS 12 или выше',
  'Apple Silicon M1/M2/M3 или Intel',
  'От 8 ГБ оперативной памяти',
  'От 10 ГБ свободного места',
  'Google Chrome',
  'Стабильный интернет',
  'Доступ к Terminal',
]

const win = [
  'Windows 10 или Windows 11',
  'От 8 ГБ оперативной памяти',
  'От 10 ГБ свободного места',
  'Google Chrome',
  'Стабильный интернет',
  'Права администратора',
]

export default function Requirements({ laptopChecked, setLaptopChecked, flash, onNext }) {
  return (
    <section className={`py-20 bg-gray-50 transition-all ${flash ? 'animate-shake animate-glow outline outline-2 outline-[#D97757] rounded-2xl' : ''}`}>
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Требования</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Проверьте, подходит ли ваш ноутбук</h2>
        <p className="text-gray-500 text-lg mb-10">
          Обучение практическое — участвовать только с телефона невозможно. Нужен личный ноутбук.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍎</span>
              <h3 className="font-semibold text-gray-900">MacBook</h3>
            </div>
            {mac.map(r => (
              <div key={r} className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                <span className="text-[#D97757]">✓</span> {r}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🪟</span>
              <h3 className="font-semibold text-gray-900">Windows</h3>
            </div>
            {win.map(r => (
              <div key={r} className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                <span className="text-[#D97757]">✓</span> {r}
              </div>
            ))}
          </div>
        </div>

        {/* corporate laptop ban */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 mb-6 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">🚫</span>
          <span><strong>Корпоративные ноутбуки не допускаются.</strong> На них часто заблокирована установка программ — это сорвёт твою работу на практикуме. Приходи с личным устройством.</span>
        </div>

        <label className={`flex items-start gap-3 cursor-pointer bg-white border rounded-xl p-4 hover:border-[#D97757] transition-colors mb-4 ${flash ? 'border-[#D97757] shadow-[0_0_0_3px_rgba(217,119,87,0.2)]' : 'border-gray-200'}`}>
          <input
            type="checkbox"
            checked={laptopChecked}
            onChange={e => setLaptopChecked(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-[#D97757]"
          />
          <span className="text-gray-700 font-medium">
            Я проверил/проверила, что мой ноутбук подходит для участия
          </span>
        </label>

        <button
          onClick={laptopChecked ? onNext : undefined}
          disabled={!laptopChecked}
          className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${
            laptopChecked
              ? 'bg-[#D97757] hover:bg-[#c4674a] text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {laptopChecked ? 'Далее — пройти подготовку →' : 'Подтвердите, что ноутбук подходит'}
        </button>
      </div>
    </section>
  )
}
