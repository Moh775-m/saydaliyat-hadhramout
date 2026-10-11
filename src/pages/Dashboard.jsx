import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Dashboard(){
  const pharmacy_id = localStorage.getItem('pharmacy_id')
  const [orders,setOrders]=useState([])
  const [medicines,setMedicines]=useState([])
  const [sales,setSales]=useState([])

  // للطلبات
  const [confirmId,setConfirmId]=useState(null)
  const [confirmLoading,setConfirmLoading]=useState(false)

  // للبيع المباشر
  const [sellItem,setSellItem]=useState(null)
  const [sellQty,setSellQty]=useState(1)
  const [sellLoading,setSellLoading]=useState(false)

  useEffect(()=>{ loadAll() },[])

  async function loadAll(){
    const {data:o}=await supabase.from('orders').select('*, order_items(*, medicines(*))').eq('pharmacy_id',pharmacy_id).order('created_at',{ascending:false})
    const {data:m}=await supabase.from('medicines').select('*').eq('pharmacy_id',pharmacy_id).order('created_at',{ascending:false})
    const {data:s}=await supabase.from('sales').select('*').eq('pharmacy_id',pharmacy_id)
    setOrders(o||[]); setMedicines(m||[]); setSales(s||[])
  }

  // === إصلاح الزر الأول: تأكيد التوصيل (الصورة الأولى) ===
  async function handleConfirmYes(){
    if(!confirmId) return
    setConfirmLoading(true)
    const {error}=await supabase.rpc('complete_order_delivery',{order_id_param:confirmId})
    setConfirmLoading(false)
    if(error){ alert('خطأ: '+error.message); return }
    setConfirmId(null)
    alert('✅ تم التوصيل - انتقل للمبيعات وتم حساب الربح')
    loadAll()
  }

  // === إصلاح الزر الثاني: بيع وطباعة (الصورة الثانية) ===
  async function handleSellConfirm(){
    if(!sellItem) return
    setSellLoading(true)
    const {error}=await supabase.rpc('sell_medicine_direct',{
      p_pharmacy_id:pharmacy_id,
      p_medicine_id:sellItem.id,
      p_quantity:parseInt(sellQty)
    })
    setSellLoading(false)
    if(error){ alert('خطأ: '+error.message); return }
    setSellItem(null)
    setSellQty(1)
    alert('✅ تم البيع')
    loadAll()
  }

  const totalProfit = sales.reduce((s,x)=>s+Number(x.profit||0),0)

  return(
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] p-4 pb-20">

      {/* احصائيات */}
      <div className="bg-white border rounded-2xl p-4 flex justify-between">
        <div><div className="text-xs text-gray-500">الربح الكلي</div><div className="font-black">{totalProfit} ر.ي</div></div>
        <div><div className="text-xs text-gray-500">الطلبات</div><div className="font-black">{orders.length}</div></div>
      </div>

      {/* الطلبات */}
      <h2 className="font-bold mt-6">الطلبات</h2>
      {orders.map(o=>(
        <div key={o.id} className="bg-white border rounded-xl p-3 mt-2 flex justify-between items-center">
          <div>
            <div className="font-bold text-sm">{o.customer_name}</div>
            <div className="text-xs text-gray-500">{o.customer_phone} - {o.total_price} ر.ي</div>
          </div>
          <button onClick={()=>setConfirmId(o.id)} className="bg-black text-white px-4 py-2 rounded-full text-xs">تأكيد التوصيل</button>
        </div>
      ))}

      {/* الادوية والبيع */}
      <h2 className="font-bold mt-6">الأدوية</h2>
      {medicines.map(m=>(
        <div key={m.id} className="bg-white border rounded-xl p-3 mt-2 flex justify-between items-center">
          <div className="text-sm">{m.name} <span className="text-xs text-gray-400">({m.stock} متوفر)</span></div>
          <button onClick={()=>setSellItem(m)} className="bg-[#22c55e] text-white px-4 py-2 rounded-full text-xs">بيع</button>
        </div>
      ))}

      {/* نافذة تأكيد التوصيل */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0">
          <div className="bg-white w-full rounded-t-[28px] p-6">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="bg-[#22c55e] text-white text-center py-3 rounded-xl font-bold">تأكيد التوصيل ؟</div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleConfirmYes} disabled={confirmLoading} className="flex-1 bg-[#22c55e] text-white py-3.5 rounded-full font-black">{confirmLoading?'جاري...':'نعم ✅'}</button>
              <button onClick={()=>setConfirmId(null)} className="flex-1 bg-white border py-3.5 rounded-full font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة بيع وطباعة */}
      {sellItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0">
          <div className="bg-white w-full rounded-t-[28px] p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="font-black">🛒 تأكيد بيع</span>
              <button onClick={()=>setSellItem(null)} className="w-8 h-8 border rounded-full">X</button>
            </div>
            <div className="border rounded-xl p-3 flex justify-between items-center">
              <span className="font-bold text-sm">{sellItem.name}</span>
              <input type="number" value={sellQty} onChange={e=>setSellQty(e.target.value)} className="border w-20 p-2 rounded-xl text-center"/>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSellConfirm} disabled={sellLoading} className="flex-1 bg-[#22c55e] text-white py-3.5 rounded-full font-black">{sellLoading?'جاري...':'بيع وطباعة ✅'}</button>
              <button onClick={()=>setSellItem(null)} className="flex-1 bg-white border py-3.5 rounded-full font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}