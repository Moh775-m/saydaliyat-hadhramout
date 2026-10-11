import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowButton(true)
    })

    window.addEventListener('appinstalled', () => {
      setShowButton(false)
      console.log('تم تثبيت التطبيق')
    })
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowButton(false)
    }
    setDeferredPrompt(null)
  }

  if (!showButton) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-teal-100 p-4 flex items-center gap-3 animate-bounce">
      <div className="w-12 h-12 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
        <span className="text-2xl">💊</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-gray-800 text-sm">ثبت تطبيق صيدليات حضرموت</p>
        <p className="text-xs text-gray-500">أسرع ويشتغل بدون نت</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-[#0d9488] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#0f766e]"
      >
        تثبيت
      </button>
    </div>
  )
}