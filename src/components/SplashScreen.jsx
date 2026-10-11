import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // يظهر 2.5 ثانية في كل مرة تفتح التطبيق المثبت
    // وفي المتصفح يظهر مرة واحدة فقط كل جلسة
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const hasSeen = sessionStorage.getItem('splashSeen')

    if (!isStandalone && hasSeen) {
      setShow(false)
      return
    }

    const timer = setTimeout(() => {
      setShow(false)
      sessionStorage.setItem('splashSeen', 'true')
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f0fdfa] flex flex-col items-center justify-center animate-fadeOut">
      <img src="/pwa-512x512.png" className="w-28 h-28 rounded-3xl shadow-xl animate-pulse" />
      <h1 className="mt-6 text-2xl font-bold text-[#0d9488]">صيدليات حضرموت</h1>
      <p className="mt-2 text-sm text-gray-500">دليل الدواء في حضرموت</p>
    </div>
  )
}