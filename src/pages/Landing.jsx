import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function Landing(){
  const nav = useNavigate()
  const [pharmacies, setPharmacies] = useState([])
  const [showPharmacies, setShowPharmacies] = useState(false)
  const [loadingPharm, setLoadingPharm] = useState(false)
  const [searchPharm, setSearchPharm] = useState('')

  async function loadPharmacies(){
    setShowPharmacies(true)
    setLoadingPharm(true)
    setTimeout(()=> {
      document.getElementById('pharmacies-section')?.scrollIntoView({behavior:'smooth', block:'start'})
    }, 100)

    const { data, error } = await supabase.from('public_pharmacies').select('*')
    console.log("DATA:", data, "ERROR:", error)

    if (!error && data) {
      setPharmacies(data)
    } else {
      const fb = await supabase.from('pharmacies').select('id,name,username').limit(50)
      if(fb.data) setPharmacies(fb.data)
    }
    setLoadingPharm(false)
  }

  const filteredPharm = pharmacies.filter(p =>
    (p.name?.toLowerCase() || '').includes(searchPharm.toLowerCase()) ||
    (p.username?.toLowerCase() || '').includes(searchPharm.toLowerCase())
  )

  return(
    <div dir="rtl" className="min-h-screen bg-[#f8faf8] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-green-200/40 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-emerald-100/60 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white text-lg shadow-lg shadow-green-600/20">💊</div>
            <div className="font-black text-[15px]">صيدليات حضرموت</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] bg-white border shadow-sm px-3 py-1.5 rounded-full">📞 للاشتراك: 775443254</div>
            <button onClick={()=>nav('/admin')} className="text-[11px] bg-[#111827] text-white px-5 py-2 rounded-full font-bold hover:bg-black transition">🔐 لوحة المدير</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center mt-10 md:mt-20">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border shadow-sm rounded-full px-3 py-1 text-[11px] font-bold text-green-700">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> نظام متكامل للصيدليات
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.1] mt-5">
              صيدليات<br/>
              <span className="bg-gradient-to-l from-green-600 to-emerald-400 bg-clip-text text-transparent">حضرموت 💊</span>
            </h1>
            <p className="text-gray-500 mt-4 text-[15px] leading-7">
              نظام الطلبات والروشتات للصيدليات - رابط QR لكل صيدلية، لوحة تحكم كاملة، وحساب أرباح تلقائي.
            </p>

            <div className="bg-[#111827] rounded-[20px] p-5 mt-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/20 rounded-full blur-2xl"></div>
              <div className="relative grid gap-3 text-[13px] text-white/90">
                <div className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">✓</span> الزبون يصور الروشتة</div>
                <div className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">✓</span> الطلبات مرتبة في لوحة تحكم ذكية</div>
                <div className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">✓</span> حساب الأرباح اليومية تلقائياً</div>
                <div className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">✓</span> رابط QR تطبعه على باب صيدليتك</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={()=>nav('/login')} className="flex-1 md:flex-none bg-gradient-to-br from-green-600 to-emerald-500 text-white px-8 py-4 rounded-full font-black shadow-lg shadow-green-600/30 hover:scale-[1.02] transition">
                دخول →
              </button>
              <button onClick={loadPharmacies} className="flex-1 md:flex-none bg-white border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-full font-black shadow-sm hover:bg-gray-900 hover:text-white transition">
                عرض الصيدليات ({pharmacies.length || '2'})
              </button>
              <a href="https://wa.me/967775443254" target="_blank" className="hidden md:flex bg-white border shadow-sm px-6 py-4 rounded-full font-bold text-sm items-center">واتساب</a>
            </div>

            <div className="text-[11px] text-gray-400 mt-4">✦ ثق بنا - {pharmacies.length > 0? `${pharmacies.length} صيدلية مشتركة` : 'نظام موثوق لصيدليات حضرموت'}</div>
          </div>

          <div className="relative hidden md:flex justify-center">
            <div className="relative">
              <div className="w-[300px] h-[600px] bg-black rounded-[50px] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.2)] border-[6px] border-black">
                <div className="w-full h-full bg-white rounded-[40px] overflow-hidden relative">
                  <div className="bg-gray-50 p-4">
                    <div className="w-20 h-2 bg-black rounded-full mx-auto"></div>
                    <div className="mt-6 flex justify-between items-center">
                      <div className="font-black text-sm">💊 صيدلية النور</div>
                      <div className="w-8 h-8 bg-green-100 rounded-full"></div>
                    </div>
                    <div className="mt-4 bg-[#111827] rounded-2xl p-3 flex gap-3 items-center">
                      <div className="bg-white p-1 rounded-lg"><div className="w-12 h-12 bg-gray-200 rounded"></div></div>
                      <div className="text-white text-[10px]">امسح الكود واطلب دواءك</div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-14 bg-white border rounded-xl"></div>
                      <div className="h-14 bg-white border rounded-xl"></div>
                      <div className="h-14 bg-green-50 border border-green-200 rounded-xl"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 w-full bg-white border-t p-3 flex justify-around text-[10px] text-gray-400">
                    <span>🏠 الرئيسية</span><span className="text-green-600 font-bold">💊 أدوية</span><span>📦 طلبات</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPharmacies && (
          <div id="pharmacies-section" className="mt-16 md:mt-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
                  <span className="w-10 h-10 bg-[#111827] text-white rounded-full flex items-center justify-center text-sm">🏥</span>
                  الصيدليات المشتركة ({filteredPharm.length})
                </h2>
                <p className="text-sm text-gray-500 mt-2">اختر صيدليتك واطلب دواءك مباشرة</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input value={searchPharm} onChange={e=>setSearchPharm(e.target.value)} placeholder="ابحث باسم الصيدلية..." className="w-full border bg-white rounded-full pr-10 pl-4 py-3 text-sm outline-none focus:border-black"/>
                </div>
                <button onClick={()=>setShowPharmacies(false)} className="bg-white border px-4 py-3 rounded-full text-sm font-bold">✕</button>
              </div>
            </div>

            {loadingPharm? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_,i)=><div key={i} className="bg-white border rounded-2xl p-5 animate-pulse"><div className="w-12 h-12 bg-gray-100 rounded-xl"></div><div className="h-4 bg-gray-100 rounded mt-4"></div></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPharm.map(ph=>(
                  <button key={ph.id} onClick={()=>nav(`/p/${ph.username}`)} className="group bg-white border rounded-[20px] p-5 text-right shadow-sm hover:shadow-xl hover:border-green-200 hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg">
                        {ph.name?.[0] || '💊'}
                      </div>
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-bold">مفتوح</span>
                    </div>
                    <div className="font-black text-[15px] mt-4 group-hover:text-green-700 transition">{ph.name}</div>
                    <div className="text-[11px] text-gray-500 mt-1">@{ph.username}</div>
                    <div className="mt-4 flex gap-2">
                      <span className="flex-1 bg-[#111827] group-hover:bg-green-600 text-white text-xs font-black py-2.5 rounded-full text-center transition">اطلب الآن →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
          {[
            {icon:'💊', title:'أدوية', desc:'إدارة كاملة للمخزون'},
            {icon:'💄', title:'تجميل', desc:'أدوات تجميل وعناية'},
            {icon:'🩺', title:'جراحة', desc:'أدوات ومستلزمات'},
            {icon:'📊', title:'أرباح', desc:'تقارير يومية'},
          ].map(c=>(
            <div key={c.title} className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-2xl">{c.icon}</div>
              <div className="font-black text-sm mt-2">{c.title}</div>
              <div className="text-[11px] text-gray-500 mt-1">{c.desc}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <div className="text-[11px] text-gray-400">للاشتراك: 775443254 - صيدليات حضرموت © 2025</div>
          <button onClick={()=>nav('/admin')} className="mt-3 text-[11px] text-gray-300 hover:text-black border border-dashed border-gray-200 hover:border-black px-5 py-2 rounded-full transition">
            🔐 دخول المدير
          </button>
        </div>
      </div>
    </div>
  )
}