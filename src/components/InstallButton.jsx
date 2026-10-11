import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // لو التطبيق مثبت أصلاً لا تظهر الزر
    window.addEventListener('appinstalled', () => {
      setShowButton(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response: ${outcome}`)
    setDeferredPrompt(null)
    setShowButton(false)
  }

  if (!showButton) return null

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-auto bg-[#0d9488] text-white px-6 py-3 rounded-full shadow-lg shadow-teal-200 font-bold flex items-center justify-center gap-2 z-50 animate-bounce"
    >
      <span>📲</span> ثبّت تطبيق صيدليات حضرموت
    </button>
  )
}