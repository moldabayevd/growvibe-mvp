import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [message, onDone])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm text-center">
        <span className="text-[#D97757] text-lg flex-shrink-0">👆</span>
        {message}
      </div>
    </div>
  )
}
