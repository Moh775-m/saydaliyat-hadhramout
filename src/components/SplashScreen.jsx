import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const isFirstTime =!sessionStorage.getItem('splashShown')
    if (isFirstTime) {
      const timer = setTimeout(() => {
        setShow(false)
        sessionStorage.setItem('splashShown', 'true')
      }, 1800)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#f0fdfa] via-[#e6fffa] to-[#ccfbf1]" dir="rtl">
      <div className="w-28 h-28 bg-white rounded-[28px] shadow-[0_15px_40px_rgba(13,148,136,0.15)] flex items-center justify-center border border-white">
        <svg width="60" height="72" viewBox="0 0 100 120" fill="none">
          <path d="M50 0C22.4 0 0 22.4 0 50C0 87.5 50 120 50 120S100 87.5 100 50C100 22.4 77.6 0 50 0Z" fill="#0d9488"/>
          <circle cx="50" cy="48" r="28" fill="white"/>
          <path d="M50 30 V66 M32 48 H68" stroke="#0d9488" strokeWidth="7" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 className="mt-8 text-[32px] font-black text-[#0f766e]">صيدليات حضرموت</h1>
      <p className="mt-2 text-[16px] text-gray-500 font-medium">دليل الدواء في حضرموت</p>
      <div className="absolute bottom-20 flex gap-2">
        <span className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce"></span>
        <span className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      </div>
    </div>
  )
}