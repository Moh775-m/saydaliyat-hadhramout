import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Landing(){
  const nav = useNavigate()
  const [pharmacies, setPharmacies] = useState([])
  const [showPharmacies, setShowPharmacies] = useState(false)
  const [loadingPharm, setLoadingPharm] = useState(false)
  const [searchPharm, setSearchPharm] = useState('')
  const [count, setCount] = useState(0)

  useEffect(()=>{
    supabase.from('pharmacies').select('id',{count:'exact'}).eq('is_active',true).then(({count})=> setCount(count||0))
  },[])

  async function loadPharmacies(){
    setShowPharmacies(true)
    setLoadingPharm(true)
    setTimeout(()=> document.getElementById('pharmacies-section')?.scrollIntoView({behavior:'smooth'}), 150)
    const { data } = await supabase.from('pharmacies').select('id,name,username,phone,address,is_active').eq('is_active', true).order('created_at',{ascending:false})
    if(data) setPharmacies(data)
    setLoadingPharm(false)
  }

  const filteredPharm = pharmacies.filter(p =>
    (p.name||'').toLowerCase().includes(searchPharm.toLowerCase()) ||
    (p.address||'').toLowerCase().includes(searchPharm.toLowerCase()) ||
    (p.phone||'').includes(searchPharm)
  )

  return(
    <div dir="rtl" className="min-h-screen bg-[#fcfdfc] relative overflow-hidden font-[Tajawal]">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[300px] -right-[300px] w-[800px] h-[800px] bg-gradient-to-br from-green-200 to-emerald-100 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute top-[400px] -left-[300px] w-[700px] h-[700px] bg-gradient-to-tr from-green-50 to-teal-50 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/2 w-[1000px] h-[500px] bg-gradient-to-t from-green-50/50 to-transparent blur-[60px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-6">
        {/* Header */}
        <header className="flex justify-between items-center bg-white/70 backdrop-blur-xl border border-gray-100 rounded-full px-5 py-3 shadow-sm sticky top-4 z-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-emerald-400 flex items-center justify-center text-white shadow-lg">💊</div>
            <span className="font-black text-[14px] tracking-tight">صيدليات حضرموت</span>
            <span className="hidden md:flex bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-3 py-1 rounded-full">● النظام يعمل</span>
          </div>
          <div className="flex gap-2">
            <a href="https://wa.me/967775443254" className="hidden md:flex text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-50">واتساب</a>
           
          </div>
        </header>

        {/* HERO */}
        <div className="grid md:grid-cols-2 gap-10 items-center mt-12 md:mt-20">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border shadow-sm rounded-full px-4 py-1.5 text-[11px] font-black text-gray-700">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
              موثوق من {count || 2}+ صيدلية في حضرموت
            </div>

            <h1 className="text-[42px] md:text-[68px] font-black leading-[0.95] mt-6 tracking-tight">
              صيدليتك<br/>
              <span className="bg-gradient-to-l from-green-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">أونلاين</span><br/>
              في 30 ثانية
            </h1>

            <p className="text-gray-500 mt-5 text-[16px] leading-8 max-w-[480px]">
              الزبون يصور الروشتة، وانت تستقبل الطلب مرتب في جوالك. مع رابط QR تطبعه وتلصقه على باب الصيدلية، وحساب أرباح تلقائي يومياً.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={()=>nav('/login')} className="group bg-[#111827] hover:bg-black text-white px-8 py-4 rounded-full font-black text-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center gap-3 transition-all hover:scale-[1.02]">
               دخول الصيدلية 
                <span className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center group-hover:rotate-45 transition">→</span>
              </button>
              <button onClick={loadPharmacies} className="bg-white border-2 border-gray-900 px-8 py-4 rounded-full font-black text-[14px] hover:bg-gray-900 hover:text-white transition">
                🏥 عرض {count}صيدليات
              </button>
            </div>

            <div className="flex items-center gap-6 mt-8">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-green-200 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-300 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-white text-[10px]">+{count}</div>
              </div>
              <div className="text-[12px]"><b className="font-black">4.9/5</b> تقييم الصيدليات • <span className="text-gray-500">ثق بنا </span></div>
            </div>
          </div>

          {/* Right Mockup - أفخم من صورتك بكثير */}
          <div className="relative hidden md:flex justify-center">
            <div className="relative w-[380px]">
              {/* Floating Cards */}
              <div className="absolute -right-10 top-10 bg-white border shadow-xl rounded-2xl p-3 z-20 flex items-center gap-3 animate-bounce">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">📍</div>
                <div><div className="text-[11px] font-black">طلب جديد</div><div className="text-[10px] text-gray-500">صيدلية النور - فوة</div></div>
              </div>
              <div className="absolute -left-12 bottom-20 bg-[#111827] text-white shadow-2xl rounded-2xl p-3 z-20 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">💰</div>
                <div><div className="text-[11px] font-black">أرباح اليوم</div><div className="text-[12px] text-green-400 font-bold">12,500 ر.ي</div></div>
              </div>

              <div className="w-[320px] h-[640px] bg-black rounded-[55px] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.25)] border-[8px] border-black mx-auto">
                <div className="w-full h-full bg-[#f8faf8] rounded-[40px] overflow-hidden relative">
                  <div className="bg-white p-5 border-b">
                    <div className="w-16 h-1.5 bg-black rounded-full mx-auto"></div>
                    <div className="mt-6 flex justify-between">
                      <div><div className="font-black text-[13px]">صيدلية سيئون الحديثة</div><div className="text-[10px] text-gray-500 mt-1">📍 سيئون - الشارع العام • 📞 777...</div></div>
                      <div className="w-8 h-8 bg-green-100 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="bg-white border rounded-2xl p-3 flex gap-3"><div className="w-12 h-12 bg-gray-100 rounded-xl"></div><div className="flex-1"><div className="h-3 bg-gray-900 rounded w-3/4"></div><div className="h-2 bg-gray-200 rounded w-1/2 mt-2"></div></div></div>
                    <div className="bg-green-600 rounded-2xl p-3 text-white flex justify-between items-center"><span className="text-[11px] font-bold">روشتة جديدة 📸</span><span className="bg-white text-green-700 text-[10px] px-3 py-1 rounded-full font-black">عرض</span></div>
                    <div className="bg-white border rounded-2xl p-3 flex gap-3"><div className="w-12 h-12 bg-gray-100 rounded-xl"></div><div className="flex-1"><div className="h-3 bg-gray-900 rounded w-2/4"></div><div className="h-2 bg-gray-200 rounded w-3/4 mt-2"></div></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pharmacies Section */}
        {showPharmacies && (
          <div id="pharmacies-section" className="mt-24">
            <div className="bg-white border rounded-[32px] p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <h2 className="text-2xl font-black">🏥 الصيدليات المتاحة الآن</h2>
                <input value={searchPharm} onChange={e=>setSearchPharm(e.target.value)} placeholder="ابحث بالاسم أو العنوان أو الرقم..." className="border-2 bg-gray-50 focus:bg-white focus:border-black rounded-full px-6 py-3 text-sm outline-none w-full md:w-80"/>
              </div>
              {loadingPharm? <div className="text-center py-10">جاري التحميل...</div> : (
                <div className="grid md:grid-cols-3 gap-4">
                  {filteredPharm.map(ph=>(
                    <div key={ph.id} onClick={()=>nav(`/p/${ph.username}`)} className="group border-2 border-gray-50 hover:border-green-200 rounded-[24px] p-5 hover:shadow-xl transition-all cursor-pointer bg-[#fcfdfc] hover:bg-white">
                      <div className="flex justify-between"><div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black">{ph.name[0]}</div><span className="text-[10px] bg-green-50 border px-2 py-1 rounded-full h-fit">مفتوح ●</span></div>
                      <div className="font-black mt-4">{ph.name}</div>
                      <div className="mt-2 space-y-1">
                        {ph.address && <div className="text-xs text-gray-600">📍 {ph.address}</div>}
                        {ph.phone && <a href={`tel:${ph.phone}`} onClick={e=>e.stopPropagation()} className="text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full inline-block">📞 {ph.phone}</a>}
                      </div>
                      <div className="mt-4 bg-[#111827] group-hover:bg-green-600 text-white text-center py-2.5 rounded-full text-xs font-black transition">اطلب الآن →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-gray-400 mt-16 pb-6">صيدليات حضرموت © 2026 - للاشتراك 775443254</div>
      </div>
    </div>
  )
}