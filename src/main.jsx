import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// تسجيل الـ PWA - نفس طريقة NOOR
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('يوجد تحديث جديد للتطبيق، هل تريد التحديث؟')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('التطبيق جاهز للعمل بدون إنترنت')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)