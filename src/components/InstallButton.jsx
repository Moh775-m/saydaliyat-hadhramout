import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault() // هذا السطر يخفي مربع جوجل القبيح اللي في الصورة
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000) // يظهر بعد ثانيتين
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] md:bottom-8 md:right-8 md:left-auto md:w-[380px]">
      <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-[#e6f4f1] p-4 flex items-center gap-4" dir="rtl">

        {/* الأيقونة */}
        <div className="w-14 h-14 rounded-2xl bg-[#f0fdfa] flex items-center justify-center flex-shrink-0 border border-[#ccfbf1]">
          <img src="/pwa-192x192.png" alt="logo" className="w-10 h-10 rounded-lg" />
        </div>

        {/* النص */}
        <div className="flex-1">
          <h4 className="font-bold text-[#0f766e] text-[15px]">صيدليات حضرموت</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">ثبت التطبيق - أسرع ويعمل بدون نت</p>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShow(false)}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200"
          >
            ✕
          </button>
          <button
            onClick={install}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2.5 rounded-full text-[13px] font-bold shadow-md"
          >
            تثبيت
          </button>
        </div>
      </div>
    </div>
  )
}