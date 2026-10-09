import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login(){
  const nav = useNavigate()
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [toast,setToast] = useState(null)

  async function handleLogin(e){
    e.preventDefault()
    if(!username) return setToast('اكتب اسم المستخدم')
    setLoading(true)
    // نفس منطقك القديم - ما غيرته
    const {data, error} = await supabase.from('pharmacies').select('*').eq('username', username).eq('password', password).single()
    setLoading(false)
    if(error ||!data){
      return setToast('اسم المستخدم أو كلمة السر خطأ')
    }
    localStorage.setItem('pharmacy_id', data.id)
    nav('/dashboard')
  }

  return(
    <div dir="rtl" className="min-h-screen bg-[#f6f7f9] flex relative overflow-hidden">
      {/* خلفية */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-green-200/30 rounded-full blur-[70px]"></div>
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[70px]"></div>
      </div>

      {/* يمين - فورم */}
      <div className="relative flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-[420px]">
          {/* لوقو */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white text-xl shadow-lg shadow-green-600/20">💊</div>
            <div>
              <div className="font-black text-[16px]">صيدليات حضرموت</div>
              <div className="text-[11px] text-gray-500">نظام إدارة الصيدليات</div>
            </div>
          </div>

          <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border p-7 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-black">مرحباً بك 👋</h1>
              <p className="text-[13px] text-gray-500 mt-2">ادخل بيانات صيدليتك للوصول للوحة التحكم</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-gray-700 mb-2 block">اسم المستخدم</label>
                <div className="relative">
                  <input
                    value={username} onChange={e=>setUsername(e.target.value)}
                    placeholder="مثال: alnoor_ph"
                    className="w-full bg-[#f6f7f9] border border-gray-100 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl p-4 text-sm outline-none transition"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 mb-2 block">كلمة السر</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f6f7f9] border border-gray-100 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 rounded-2xl p-4 text-sm outline-none transition"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full bg-[#111827] hover:bg-black text-white p-4 rounded-2xl font-black text-sm shadow-lg mt-2 disabled:opacity-50 transition"
              >
                {loading? 'جاري الدخول...' : 'دخول لوحة التحكم →'}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-gray-100"></div>
              <span className="text-[11px] text-gray-400">أو</span>
              <div className="flex-1 h-[1px] bg-gray-100"></div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
                <div className="text-[16px]">📦</div>
                <div className="text-[10px] font-bold mt-1">طلبات فورية</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <div className="text-[16px]">📊</div>
                <div className="text-[10px] font-bold mt-1">حساب أرباح</div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                <div className="text-[16px]">🔔</div>
                <div className="text-[10px] font-bold mt-1">تنبيهات</div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/" className="text-[12px] text-gray-500 hover:text-black">← الرجوع للصفحة الرئيسية</Link>
            </div>
          </div>

          <div className="text-center text-[11px] text-gray-400 mt-6">
            للاشتراك الجديد تواصل واتساب: 775443254
          </div>
        </div>
      </div>

      {/* يسار - بانر - يختفي في الجوال */}
      <div className="hidden md:flex flex-1 bg-[#111827] relative overflow-hidden items-center justify-center p-10">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-green-500/20 rounded-full blur-[50px]"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[50px]"></div>
        </div>
        <div className="relative max-w-[400px]">
          <div className="inline-flex bg-white/10 backdrop-blur border border-white/10 text-white/80 rounded-full px-4 py-1.5 text-[11px] font-bold">✨  تثق بنا</div>
          <h2 className="text-white text-4xl font-black leading-[1.2] mt-6">
            إدارة صيدليتك<br/>صارت أسهل<br/>
            <span className="text-green-400">بكثير</span>
          </h2>
          <div className="mt-8 space-y-3">
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
              <div className="text-white"><div className="font-bold text-sm">استقبل الروشتات بالصور</div><div className="text-[11px] text-white/50">الزبون يصور والطلب يوصلك فوراً</div></div>
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">📊</div>
              <div className="text-white"><div className="font-bold text-sm">أرباحك محسوبة تلقائياً</div><div className="text-[11px] text-white/50">يومي، أسبوعي، شهري</div></div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-[100]">{toast}</div>}
    </div>
  )
}