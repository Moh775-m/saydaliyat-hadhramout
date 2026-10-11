import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone) return null // لا تظهر الزر إذا التطبيق مثبت أصلاً

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'dismissed') {
        setShowModal(true) // إذا رفض، أظهر له التعليمات
      }
      setDeferredPrompt(null)
    } else {
      setShowModal(true) // إذا كروم ما أعطى الحدث، أظهر التعليمات مباشرة
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-[#0d9488] text-white px-5 py-3.5 rounded-2xl shadow-xl font-bold flex items-center justify-center gap-2 z-50"
      >
        📲 ثبّت التطبيق على جوالك
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-end md:items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 animate-slideUp" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3 text-right">طريقة التثبيت:</h3>
            <div className="space-y-3 text-right text-sm leading-6">
              <p className="flex gap-2"><span>1.</span> اضغط على <span className="font-bold">الـ 3 نقاط ⋮</span> فوق في متصفح كروم</p>
              <p className="flex gap-2"><span>2.</span> اختر <span className="bg-gray-100 px-2 py-1 rounded font-bold">تثبيت التطبيق / Install app</span></p>
              <p className="flex gap-2"><span>3.</span> اضغط <span className="bg-gray-100 px-2 py-1 rounded font-bold">تثبيت / Install</span></p>
              <img src="/pwa-512x512.png" className="w-16 h-16 mx-auto mt-4 rounded-2xl" />
            </div>
            <button onClick={() => setShowModal(false)} className="w-full mt-6 bg-gray-100 py-3 rounded-xl font-bold">فهمت</button>
          </div>
        </div>
      )}
    </>
  )
}