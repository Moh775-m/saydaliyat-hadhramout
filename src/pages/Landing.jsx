import { useNavigate } from 'react-router-dom'

export default function Landing(){
  const nav = useNavigate()
  return(
    <div dir="rtl" className="min-h-screen bg-[#f8faf8] relative overflow-hidden">
      {/* خلفية متدرجة */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-green-200/40 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-emerald-100/60 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* هيدر */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white text-lg shadow-lg shadow-green-600/20">💊</div>
            <div className="font-black text-[15px]">صيدليات حضرموت</div>
          </div>
          <div className="text-[11px] bg-white border shadow-sm px-3 py-1.5 rounded-full">📞 للاشتراك: 775443254</div>
        </div>

        {/* الهيرو */}
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

            {/* الميزات - بدل الصندوق البني القبيح */}
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
                دخول الصيدليات المشتركة →
              </button>
              <a href="https://wa.me/967775443254" target="_blank" className="bg-white border shadow-sm px-6 py-4 rounded-full font-bold text-sm">واتساب</a>
            </div>

            <div className="text-[11px] text-gray-400 mt-4">✦ ثق بنا</div>
          </div>

          {/* يمين - موك اب جوال */}
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
              {/* عناصر طائرة */}
              <div className="absolute -right-10 top-20 bg-white shadow-xl rounded-2xl p-3 flex items-center gap-2 border animate-[float_3s_infinite]">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">✓</div>
                <div className="text-[11px]"><div className="font-black">طلب جديد!</div><div className="text-gray-500">من أحمد</div></div>
              </div>
              <div className="absolute -left-10 bottom-20 bg-white shadow-xl rounded-2xl p-3 border">
                <div className="text-[10px] text-gray-500">ربح اليوم</div>
                <div className="font-black text-green-600">12,500 ر.ي</div>
              </div>
            </div>
          </div>
        </div>

        {/* فوتر أقسام */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 md:mt-24">
          {[
            {icon:'💊', title:'أدوية', desc:'إدارة كاملة للمخزون'},
            {icon:'💄', title:'تجميل', desc:'أدوات تجميل وعناية'},
            {icon:'🩺', title:'جراحة', desc:'أدوات ومستلزمات'},
            {icon:'📊', title:'أرباح', desc:'تقارير يومية وأسبوعية'},
          ].map(c=>(
            <div key={c.title} className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-2xl">{c.icon}</div>
              <div className="font-black text-sm mt-2">{c.title}</div>
              <div className="text-[11px] text-gray-500 mt-1">{c.desc}</div>
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] text-gray-400 mt-10">
          للاشتراك تواصل واتساب: 775443254 - نظام صيدليات حضرموت © 2025
        </div>
      </div>

      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  )
}