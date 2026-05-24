const statusColor = {
  'Есть места': 'bg-green-100 text-green-700',
  'Почти заполнено': 'bg-amber-100 text-amber-700',
  'Набор закрыт': 'bg-red-100 text-red-700',
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function Schedule({ sessions, selectedCity, setSelectedCity, selectedSession, setSelectedSession, flowDone, flash, liveSeats = {} }) {
  const cities = [...new Set(sessions.map(s => s.city))]
  const citySessions = selectedCity ? sessions.filter(s => s.city === selectedCity) : []

  return (
    <section id="schedule" className={`py-20 bg-gray-50 transition-all ${flash ? 'animate-shake outline outline-2 outline-[#D97757] rounded-2xl' : ''}`}>
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[#D97757] font-semibold text-sm uppercase tracking-widest mb-3">Расписание</p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">Расписание ближайших занятий</h2>

        {/* city selector */}
        <div className="flex gap-3 mb-8">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => { setSelectedCity(city); setSelectedSession(null) }}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${
                selectedCity === city
                  ? 'bg-[#D97757] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-[#D97757]'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {!selectedCity ? (
          <p className="text-gray-400 text-sm">Сначала выберите город, чтобы увидеть доступные даты.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {citySessions.map(s => {
              // Берём живые данные если есть, иначе из sessions.js
              const live = liveSeats[s.publicId || s.id]
              const seatsLeft = live ? live.seatsLeft : s.seatsLeft
              const seatsTotal = live ? live.seatsTotal : s.seatsTotal
              const status    = live ? live.status    : s.status
              return (
                <div
                  key={s.id}
                  onClick={() => flowDone && status !== 'Набор закрыт' && setSelectedSession(String(s.id) === String(selectedSession) ? null : s.id)}
                  className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                    !flowDone || status === 'Набор закрыт' ? 'opacity-50 cursor-not-allowed border-gray-200' :
                    String(selectedSession) === String(s.id) ? 'border-[#D97757]' : 'border-gray-200 hover:border-[#D97757] cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{s.day}, {formatDate(s.date)}</p>
                      <p className="text-gray-500 text-sm">{s.time} · {s.duration}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[status] || statusColor['Есть места']}`}>
                      {status}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm mb-1">📍 {s.location}</div>
                  <div className="text-gray-400 text-sm mb-4">👥 Осталось мест: {seatsLeft} из {seatsTotal}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{s.price}</span>
                    {String(selectedSession) === String(s.id) && (
                      <span className="text-[#D97757] text-sm font-semibold">✓ Выбрано</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedCity && citySessions.length === 0 && (
          <p className="text-gray-400 text-sm">В этом городе пока нет открытых дат регистрации.</p>
        )}

        {!flowDone && selectedCity && (
          <p className="text-amber-600 text-sm mt-4">
            ⚠️ Сначала пройдите подготовку выше, чтобы выбрать дату.
          </p>
        )}
      </div>
    </section>
  )
}
