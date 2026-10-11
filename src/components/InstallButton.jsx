import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsStandalone(standalone)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      console.log('✅ beforeinstallprompt captured')
    }
    window.addEventListener('beforeinstallprompt', handler)

    // حتى لو كروم لم يرسل الحدث، نظهر الزر بعد ثانيتين
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone) return null

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('Install outcome:', outcome)
      setDeferredPrompt(null)
      if (outcome === 'dismissed') {
        setShowModal(true)
      }
    } else {
      // كروم لم يعطنا الحدث، نعرض التعليمات اليدوية مباشرة
      setShowModal(true)
    }
  }

  return (
    <>
      {/* الزر الثابت - يظهر دائماً */}
      <button
        onClick={handleClick}
        style={{ position: 'fixed', bottom: '20px', left: '16px', right: '16px', zIndex: 9999 }}
        className="md:left-auto md:right-6 md:w-80 bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-4 rounded-2xl shadow-2xl font-bold flex items-center justify-center gap-2 border-2 border-white"
      >
        <span className="text-xl">📲</span> ثبّت التطبيق على جوالك
      </button>

      {/* نافذة التعليمات */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] bg-black/70 flex items-end md:items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-[#f0fdfa] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📲</span>
            </div>
            <h3 className="font-bold text-lg mb-1 text-center">تثبيت صيدليات حضرموت</h3>
            <p className="text-xs text-gray-400 text-center mb-5">اتبع الخطوات التالية</p>

            <div className="space-y-4 text-right text-sm leading-6 bg-gray-50 p-4 rounded-xl">
              <p className="flex gap-3"><span className="bg-[#0d9488] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</span> اضغط على <b>الـ 3 نقاط ⋮</b> أعلى المتصفح</p>
              <p className="flex gap-3"><span className="bg-[#0d9488] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</span> اختر <b className="bg-white px-2 py-1 rounded border">تثبيت التطبيق</b> أو <b>Install app</b></p>
              <p className="flex gap-3"><span className="bg-[#0d9488] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</span> اضغط <b>تثبيت</b></p>
            </div>

            <button onClick={() => setShowModal(false)} className="w-full mt-5 bg-[#0d9488] text-white py-3 rounded-xl font-bold">فهمت</button>
            <button onClick={() => setShowModal(false)} className="w-full mt-2 bg-gray-100 py-3 rounded-xl font-bold text-gray-600">إغلاق</button>
          </div>
        </div>
      )}
    </>
  )
}