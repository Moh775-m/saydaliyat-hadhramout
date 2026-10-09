import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const CATEGORIES = ['أدوية','أدوات تجميل','أدوات جراحة','أخرى']
const DEFAULT_REPORT_MODE = 'daily'

export default function Dashboard(){
  const nav=useNavigate()
  const pharmacyId=localStorage.getItem('pharmacy_id')
  const [ph,setPh]=useState(null)
  const [meds,setMeds]=useState([])
  const [orders,setOrders]=useState([])
  const [orderItems,setOrderItems]=useState({})
  const [accounts,setAccounts]=useState([])
  const [accForm,setAccForm]=useState({id:null, bank_name:'الكريمي', account_number:'', account_name:''})
  const [medSearch,setMedSearch]=useState('')
  const [categoryFilter,setCategoryFilter]=useState('الكل')
  const [newOrderCount,setNewOrderCount]=useState(0)
  const [sales,setSales]=useState([])
  const [lastOrderId,setLastOrderId]=useState(null)
  const [showSalesModal,setShowSalesModal]=useState(false)
  const [showProfitModal,setShowProfitModal]=useState(false)
  const [confirmModal,setConfirmModal]=useState({open:false, order:null})
  const [toast,setToast]=useState(null)
  const [viewMode,setViewMode]=useState(()=> localStorage.getItem(`report_mode_${pharmacyId}`) || DEFAULT_REPORT_MODE)
  const [addModal,setAddModal]=useState({open:false, step:1, category:'أدوية', rows:[{name:'',qty:'',buy:'',sell:''}]})
  const [selectedForSale,setSelectedForSale]=useState({})
  const [bulkSellModal,setBulkSellModal]=useState({open:false})
  const [invoice,setInvoice]=useState(null)
  const audioRef=useRef(null)

  useEffect(()=>{
    loadAll()
    if(Notification.permission!=='granted') Notification.requestPermission()
    const ch = supabase.channel('orders-realtime').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders',filter:`pharmacy_id=eq.${pharmacyId}`}, payload=>{
      if(payload.new.id===lastOrderId) return
      setLastOrderId(payload.new.id); setNewOrderCount(c=>c+1)
      if(audioRef.current){ audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}) }
      if(Notification.permission==='granted'){ new Notification('طلب جديد 🔔', { body: `من ${payload.new.customer_name}` }) }
      loadOrders()
    }).subscribe()
    const interval=setInterval(()=> loadOrders(), 3000)
    return ()=>{ supabase.removeChannel(ch); clearInterval(interval) }
  },[])
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),3000); return ()=>clearTimeout(t) } },[toast])
  useEffect(()=>{ if(pharmacyId) localStorage.setItem(`report_mode_${pharmacyId}`, viewMode) },[viewMode])

  async function loadAll(){
    const {data:p}=await supabase.from('pharmacies').select('*').eq('id',pharmacyId).single(); setPh(p)
    const {data:m}=await supabase.from('medicines').select('*').eq('pharmacy_id',pharmacyId).order('created_at',{ascending:false}); setMeds(m||[])
    const {data:accs}=await supabase.from('payment_accounts').select('*').eq('pharmacy_id',pharmacyId).order('created_at',{ascending:false}); setAccounts(accs||[])
    const {data:s}=await supabase.from('sales').select('*').eq('pharmacy_id',pharmacyId).order('created_at',{ascending:false}); setSales(s||[])
    loadOrders()
  }
  async function loadOrders(){
    const {data:o}=await supabase.from('orders').select('*').eq('pharmacy_id',pharmacyId).order('created_at',{ascending:false})
    if(!o) return; setOrders(o); let map={}; for(let ord of o){ const {data:items}=await supabase.from('order_items').select('*').eq('order_id',ord.id); if(items) map[ord.id]=items } setOrderItems(map)
  }
  async function saveBulkMeds(){
    const valid = addModal.rows.filter(r=>r.name.trim()!=='')
    if(!valid.length) return setToast({type:'error', msg:'اكتب اسم دواء'})
    for(let r of valid){ await supabase.from('medicines').insert({ pharmacy_id:pharmacyId, name:r.name, quantity:+r.qty||0, buy_price:+r.buy||0, sell_price:+r.sell||0, category:addModal.category }) }
    setAddModal({open:false, step:1, category:'أدوية', rows:[{name:'',qty:'',buy:'',sell:''}]}); setToast({type:'success', msg:`تمت إضافة ${valid.length} في ${addModal.category} ✅`}); loadAll()
  }
  async function delMed(id){ if(confirm('حذف الدواء؟')){ await supabase.from('medicines').delete().eq('id',id); loadAll() } }
  function toggleSelectMed(m){ setSelectedForSale(p=>{ const c={...p}; if(c[m.id]) delete c[m.id]; else c[m.id]=1; return c }) }
  function updateSaleQty(id,q){ setSelectedForSale(p=>({...p,[id]:Math.max(1,+q||1)})) }
  async function confirmBulkSell(){
    const ids=Object.keys(selectedForSale); if(!ids.length) return
    let items=[]; let tot=0; let prof=0
    for(let id of ids){
      const med=meds.find(m=>m.id===id); const qty=+selectedForSale[id]
      if(!med || qty>med.quantity) return setToast({type:'error', msg:`الكمية غير كافية لـ ${med?.name}`})
      const pr=((med.sell_price||0)-(med.buy_price||0))*qty
      await supabase.from('medicines').update({quantity: med.quantity-qty}).eq('id',med.id)
      await supabase.from('sales').insert({pharmacy_id, medicine_id:med.id, medicine_name:med.name, qty, profit:pr, total:(med.sell_price||0)*qty})
      items.push({name:med.name, qty, price:med.sell_price, total:(med.sell_price||0)*qty}); tot+=(med.sell_price||0)*qty; prof+=pr
    }
    setInvoice({items, total:tot, profit:prof, date:new Date().toLocaleString('ar-EG'), invoiceNo:Date.now().toString().slice(-6)})
    setBulkSellModal({open:false}); setSelectedForSale({}); loadAll()
  }
  async function markDone(){
    const order=confirmModal.order; if(!order) return
    for(let it of (orderItems[order.id]||[])){
      const med=meds.find(mm=>mm.id===it.medicine_id)
      if(med){ await supabase.from('medicines').update({quantity: Math.max(0,(med.quantity||0)-(it.qty||0))}).eq('id', med.id); await supabase.from('sales').insert({pharmacy_id, medicine_id:med.id, medicine_name:med.name, qty:it.qty, profit:((med.sell_price||0)-(med.buy_price||0))*(it.qty||0), total:it.price*it.qty}) }
    }
    await supabase.from('order_items').delete().eq('order_id', order.id); await supabase.from('orders').delete().eq('id', order.id)
    setOrders(prev=>prev.filter(o=>o.id!==order.id)); setNewOrderCount(c=>Math.max(0,c-1)); setConfirmModal({open:false, order:null}); setToast({type:'success', msg:`تم توصيل طلب ${order.customer_name} ✅`}); loadAll()
  }
  function getFilteredSales(mode){ const now=new Date(); if(mode==='daily') return sales.filter(s=> new Date(s.created_at).toDateString()===now.toDateString()); if(mode==='weekly'){ const day=now.getDay(); const diff=(day+1)%7; const sat=new Date(now); sat.setDate(now.getDate()-diff); sat.setHours(0,0,0,0); return sales.filter(s=> new Date(s.created_at)>=sat) } if(mode==='monthly') return sales.filter(s=>{ const d=new Date(s.created_at); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() }); return sales }
  const totalProfit=sales.reduce((s,x)=>s+(+x.profit||0),0); const filteredSales=getFilteredSales(viewMode); const filteredProfit=filteredSales.reduce((s,x)=>s+(+x.profit||0),0); const lowStock=meds.filter(m=>(m.quantity||0)<=5); const topSelling=[...sales].sort((a,b)=>b.qty-a.qty).slice(0,3); const modeLabels={daily:{title:'ربح اليوم',desc:'يتصفر 12 ليلاً',ops:'عمليات اليوم',icon:'📅'},weekly:{title:'ربح الأسبوع',desc:'من السبت',ops:'عمليات الأسبوع',icon:'🗓️'},monthly:{title:'ربح الشهر',desc:'هذا الشهر',ops:'عمليات الشهر',icon:'📆'},total:{title:'الربح الكلي',desc:'منذ البداية',ops:'كل العمليات',icon:'📊'}}; const last7Days=[...Array(7)].map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d }).reverse(); const chartData=last7Days.map(d=>{ const daySales=sales.filter(s=> new Date(s.created_at).toDateString()===d.toDateString()); return {day:d.toLocaleDateString('ar-EG',{weekday:'short'}), profit: daySales.reduce((a,b)=>a+(+b.profit||0),0)} }); const maxChart=Math.max(...chartData.map(c=>c.profit),1); const filteredMeds=meds.filter(m=>{ const ms=m.name.toLowerCase().includes(medSearch.toLowerCase()); const mc=categoryFilter==='الكل' || (m.category||'أدوية')===categoryFilter; return ms&&mc }); const selectedCount=Object.keys(selectedForSale).length; const shopLink=ph? `${window.location.origin}/p/${ph.username}` : ''; const qrLink=`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shopLink)}`; if(!ph) return <div className="p-10 text-center">تحميل...</div>

  return(
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] p-3 md:p-5">
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto"/>
      {toast && <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-sm font-black backdrop-blur ${toast.type==='error'?'bg-red-600':'bg-[#111827]'} text-white`}>{toast.msg}</div>}

      <div className="max-w-7xl mx-auto space-y-5">
        {/* هيدر فخم */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-4 md:p-5 flex justify-between items-center shadow-sm border border-gray-100 sticky top-3 z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-green-600/20">💊</div>
            <div><div className="font-black text-[15px] flex items-center gap-2">{ph.name} {newOrderCount>0 && <span className="bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-full animate-pulse">🔔 {newOrderCount} طلب جديد</span>}</div><div className="text-[11px] text-gray-500">لوحة تحكم الصيدلية • {ph.username}</div></div>
          </div>
          <button onClick={()=>{localStorage.clear(); nav('/login')}} className="bg-gray-50 hover:bg-red-50 hover:text-red-600 border px-4 py-2 rounded-full text-xs font-bold transition">خروج</button>
        </div>

        {lowStock.length>0 && <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-[20px] p-4 text-sm font-bold text-red-700 flex items-center gap-2"><span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">!</span> تنبيه: {lowStock.length} أصناف على وشك النفاد: {lowStock.map(m=>m.name).join('، ')}</div>}

        {/* رابط المتجر - تصميم جديد */}
        <div className="relative bg-[#111827] rounded-[24px] p-5 flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/20 rounded-full blur-[50px]"></div>
          <div className="relative flex items-center gap-4 flex-1 w-full">
            <div className="bg-white p-2 rounded-2xl shadow-lg"><img src={qrLink} className="w-16 h-16 rounded-xl"/></div>
            <div className="flex-1 min-w-0"><div className="text-[11px] text-white/50">رابط متجرك للزبائن</div><div className="font-mono text-[12px] bg-white/10 border border-white/10 p-2.5 rounded-xl text-white truncate mt-1.5">{shopLink}</div></div>
          </div>
          <div className="relative flex gap-2 w-full md:w-auto"><a href={shopLink} target="_blank" className="flex-1 md:flex-none bg-white text-black px-6 py-3 rounded-full text-xs font-black text-center hover:bg-gray-100">فتح المتجر</a><button onClick={()=>{navigator.clipboard.writeText(shopLink); setToast({type:'success', msg:'تم نسخ الرابط ✅'})}} className="flex-1 md:flex-none bg-white/10 border border-white/10 text-white px-6 py-3 rounded-full text-xs font-bold hover:bg-white/20">📋 نسخ</button></div>
        </div>

        {/* اختيار طريقة عرض الأرباح */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white border rounded-[20px] p-3">
          <div className="text-xs font-black text-gray-600 flex items-center gap-2"><span className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center">📊</span> طريقة عرض الأرباح</div>
          <div className="bg-[#f8fafc] border rounded-full p-1 flex text-[11px] font-black"><button onClick={()=>setViewMode('daily')} className={`px-4 py-2 rounded-full transition ${viewMode==='daily'?'bg-[#111827] text-white shadow':'text-gray-500 hover:text-black'}`}>يومي</button><button onClick={()=>setViewMode('weekly')} className={`px-4 py-2 rounded-full transition ${viewMode==='weekly'?'bg-[#111827] text-white shadow':'text-gray-500 hover:text-black'}`}>أسبوعي</button><button onClick={()=>setViewMode('monthly')} className={`px-4 py-2 rounded-full transition ${viewMode==='monthly'?'bg-[#111827] text-white shadow':'text-gray-500 hover:text-black'}`}>شهري</button><button onClick={()=>setViewMode('total')} className={`px-4 py-2 rounded-full transition ${viewMode==='total'?'bg-[#111827] text-white shadow':'text-gray-500 hover:text-black'}`}>كلي</button></div>
        </div>

        {/* كروت الأرباح - فخمة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button onClick={()=>setShowProfitModal(true)} className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 rounded-[22px] p-5 text-white shadow-lg shadow-green-600/20 text-right group hover:scale-[1.02] transition">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="relative text-[11px] opacity-90 flex items-center gap-1.5">{modeLabels[viewMode].icon} {modeLabels[viewMode].title} • {modeLabels[viewMode].desc}</div><div className="relative text-2xl font-black mt-2">{filteredProfit.toLocaleString()} <span className="text-sm font-bold">ر.ي</span></div><div className="relative text-[10px] bg-white/15 inline-block px-2 py-1 rounded-full mt-2">اضغط للتفاصيل</div>
          </button>
          <button onClick={()=>setShowSalesModal(true)} className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100 text-right hover:shadow-md hover:border-gray-200 transition text-right"><div className="text-[11px] text-gray-500 flex items-center gap-1.5">📦 {modeLabels[viewMode].ops}</div><div className="text-2xl font-black mt-2">{filteredSales.length}</div><div className="text-[11px] text-blue-600 mt-2 bg-blue-50 inline-block px-2.5 py-1 rounded-full">عرض كل العمليات</div></button>
          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="text-[11px] text-gray-500">💰 الربح الكلي</div><div className="text-xl font-black mt-2">{totalProfit.toLocaleString()} ر.ي</div><div className="text-[10px] text-gray-400 mt-2">منذ بداية النظام</div></div>
          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="text-[11px] text-gray-500">📊 المخزون / الطلبات</div><div className="text-2xl font-black mt-2">{meds.length} <span className="text-sm text-gray-400">/</span> {orders.length}</div><div className="text-[10px] text-gray-400 mt-2">{lowStock.length} تحتاج إعادة طلب</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-4"><div className="font-black text-sm">📈 مبيعات آخر 7 أيام</div><div className="text-[10px] bg-gray-50 border px-2.5 py-1 rounded-full">الربح بالريال</div></div><div className="flex items-end gap-2 h-36 bg-[#f8fafc] rounded-2xl p-3 border">{chartData.map((c,i)=><div key={i} className="flex-1 flex flex-col items-center gap-2"><div className="w-full bg-green-100 rounded-full overflow-hidden flex items-end justify-center" style={{height:`100%`}}><div className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-full transition-all" style={{height:`${(c.profit/maxChart)*100}%`, minHeight:c.profit>0?'14px':'2px'}}></div></div><div className="text-[10px] font-bold text-gray-500">{c.day}</div><div className="text-[9px] text-gray-400">{c.profit>0?c.profit:''}</div></div>)}</div></div>
          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="font-black text-sm mb-4">🔥 الأكثر مبيعاً</div>{topSelling.length===0?<div className="bg-[#f8fafc] border border-dashed rounded-2xl p-8 text-center"><div className="text-2xl">📭</div><div className="text-xs text-gray-400 mt-2">لا يوجد مبيعات بعد</div></div>:topSelling.map((s,i)=><div key={i} className="flex justify-between items-center py-3 border-b last:border-0 group"><span className="flex items-center gap-2.5"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${i===0?'bg-yellow-400 text-black':i===1?'bg-gray-200':i===2?'bg-orange-200':'bg-gray-50'}`}>{i+1}</span><span className="font-bold text-sm">{s.medicine_name}</span></span><span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-black">{s.qty}</span></div>)}</div>
        </div>

        {/* الطلبات - تصميم جديد */}
        <div className="bg-white rounded-[22px] shadow-sm overflow-hidden border border-gray-100">
          <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 border-b flex justify-between items-center"><div className="font-black text-sm flex items-center gap-2"><span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">📦</span> الطلبات الواردة ({orders.length})</div><button onClick={()=>{setNewOrderCount(0); loadOrders()}} className="bg-white border shadow-sm px-4 py-2 rounded-full text-xs font-bold hover:bg-black hover:text-white transition">🔄 تحديث</button></div>
          {orders.length===0 && <div className="p-16 text-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-2xl">📭</div><div className="text-gray-400 text-sm mt-3">لا يوجد طلبات حالياً - سيظهر هنا طلبات الزبائن فوراً</div></div>}
          <div className="divide-y max-h-[700px] overflow-auto">
            {orders.map(o=>(
              <div key={o.id} className="p-5 bg-[#fffef8] hover:bg-yellow-50/50 transition">
                <div className="flex justify-between gap-3"><div><div className="font-black text-sm flex items-center gap-2">{o.customer_name} <span className="bg-[#111827] text-white text-[10px] px-2 py-0.5 rounded-full">{o.customer_phone}</span></div><div className="text-[11px] text-gray-600 mt-2 bg-white border inline-flex items-center gap-2 px-3 py-1.5 rounded-full">🏠 {o.address||'بدون عنوان'} • 💳 {o.payment_method} • ⏰ {new Date(o.created_at).toLocaleString('ar-EG')}</div></div><div className="text-right"><div className="font-black text-green-600 text-lg">{o.total||0} ر.ي</div><div className="text-[10px] text-gray-400">{orderItems[o.id]?.length||0} أدوية</div></div></div>
                <div className="mt-4 grid md:grid-cols-2 gap-3"><div className="bg-white border rounded-2xl p-3">{orderItems[o.id]?.map((it,i)=><div key={i} className="flex justify-between text-[13px] py-2 border-b last:border-0"><span className="font-medium">{it.medicine_name} <span className="text-gray-400">x{it.qty}</span></span><span className="font-bold">{it.price*it.qty} ر.ي</span></div>)}</div>{(o.prescription_url || o.receipt_url) && <div className="flex gap-3">{o.prescription_url && <a href={o.prescription_url} target="_blank" className="group"><img src={o.prescription_url} className="w-24 h-24 rounded-2xl border object-cover group-hover:scale-105 transition"/><div className="text-[10px] text-center mt-1 text-gray-500">الوصفة</div></a>}{o.receipt_url && <a href={o.receipt_url} target="_blank" className="group"><img src={o.receipt_url} className="w-24 h-24 rounded-2xl border object-cover group-hover:scale-105 transition"/><div className="text-[10px] text-center mt-1 text-gray-500">سند التحويل</div></a>}</div>}</div>
                <div className="flex gap-2 mt-4"><button onClick={()=>setConfirmModal({open:true, order:o})} className="bg-[#111827] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-black shadow transition">✅ تم التوصيل وحساب الربح</button><a href={`https://wa.me/967${o.customer_phone?.replace(/^0/,'')}`} target="_blank" className="bg-[#25D366] hover:bg-[#1ea952] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow transition">واتساب</a></div>
              </div>
            ))}
          </div>
        </div>

        {/* حسابات بنكية - فخم */}
        <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 font-black text-sm mb-4"><span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">🏦</span> حسابات التحويل البنكي للزبائن</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-[#f8fafc] p-3 rounded-2xl border">
            <select value={accForm.bank_name} onChange={e=>setAccForm({...accForm,bank_name:e.target.value})} className="border border-gray-200 focus:border-blue-500 p-3.5 rounded-xl text-sm bg-white outline-none"><option>الكريمي</option><option>النجم</option><option>بن دول</option><option>العمقي</option><option>الكاش</option><option>بنك حضرموت</option></select>
            <input value={accForm.account_number} onChange={e=>setAccForm({...accForm,account_number:e.target.value})} placeholder="رقم الحساب" className="border border-gray-200 focus:border-blue-500 p-3.5 rounded-xl text-sm outline-none"/>
            <input value={accForm.account_name} onChange={e=>setAccForm({...accForm,account_name:e.target.value})} placeholder="باسم من (اختياري)" className="border border-gray-200 focus:border-blue-500 p-3.5 rounded-xl text-sm outline-none"/>
            <button onClick={async()=>{ if(!accForm.account_number) return setToast({type:'error', msg:'اكتب رقم الحساب'}); if(accForm.id){ await supabase.from('payment_accounts').update({bank_name:accForm.bank_name, account_number:accForm.account_number, account_name:accForm.account_name}).eq('id',accForm.id) } else { await supabase.from('payment_accounts').insert({pharmacy_id:pharmacyId, bank_name:accForm.bank_name, account_number:accForm.account_number, account_name:accForm.account_name}) } setAccForm({id:null, bank_name:'الكريمي', account_number:'', account_name:''}); loadAll() }} className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl text-sm font-black transition">{accForm.id?'💾 حفظ التعديل':'➕ إضافة حساب'}</button>
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-2">{accounts.map(a=><div key={a.id} className="flex justify-between items-center border border-blue-50 bg-blue-50/50 p-3.5 rounded-2xl text-sm"><div><span className="font-black text-blue-700">{a.bank_name}</span> • <span className="font-mono font-bold">{a.account_number}</span> {a.account_name && <span className="text-gray-500 text-xs">({a.account_name})</span>}</div><div className="flex gap-1.5"><button onClick={()=>setAccForm({id:a.id, bank_name:a.bank_name, account_number:a.account_number, account_name:a.account_name})} className="bg-white border px-3 py-1.5 rounded-full text-[11px] font-bold hover:bg-yellow-50">تعديل</button><button onClick={async()=>{ if(confirm('حذف الحساب؟')){ await supabase.from('payment_accounts').delete().eq('id',a.id); loadAll() } }} className="bg-white border px-3 py-1.5 rounded-full text-[11px] font-bold text-red-600 hover:bg-red-50">حذف</button></div></div>)}{accounts.length===0 && <div className="col-span-2 text-center text-xs text-gray-400 py-4 border border-dashed rounded-2xl">لم تضف أي حسابات بعد - أضف حساباتك ليحول عليها الزبائن</div>}</div>
        </div>

        {/* قائمة الأدوية - تنسيق احترافي */}
        <div className="bg-white rounded-[22px] shadow-sm overflow-hidden border border-gray-100">
          <div className="p-5 border-b bg-[#f8fafc]/70 flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-black text-sm flex items-center gap-2"><span className="w-8 h-8 bg-[#111827] text-white rounded-full flex items-center justify-center text-xs">💊</span> قائمة الأدوية ({filteredMeds.length} / {meds.length})</div>
              {selectedCount>0 && <button onClick={()=>setBulkSellModal({open:true})} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-green-600/20 animate-pulse">🛒 بيع المحدد ({selectedCount}) + فاتورة</button>}
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72"><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span><input value={medSearch} onChange={e=>setMedSearch(e.target.value)} placeholder="بحث باسم الدواء..." className="w-full border bg-white rounded-full pl-4 pr-9 py-2.5 text-xs focus:border-black outline-none transition"/></div>
              <button onClick={()=>setAddModal({open:true, step:1, category:'أدوية', rows:[{name:'',qty:'',buy:'',sell:''}]})} className="bg-[#111827] hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-black shadow transition shrink-0">➕ إضافة دواء</button>
            </div>
          </div>
          <div className="p-3 flex gap-2 overflow-auto border-b bg-white">
            <button onClick={()=>setCategoryFilter('الكل')} className={`px-4 py-2 rounded-full text-xs font-black shrink-0 border transition ${categoryFilter==='الكل'?'bg-[#111827] text-white border-black shadow':'bg-[#f8fafc] text-gray-600 border-gray-100 hover:border-gray-200'}`}>الكل ({meds.length})</button>
            {CATEGORIES.map(c=>{ const co=meds.filter(m=>(m.category||'أدوية')===c).length; return <button key={c} onClick={()=>setCategoryFilter(c)} className={`px-4 py-2 rounded-full text-xs font-black shrink-0 border transition ${categoryFilter===c?'bg-blue-600 text-white border-blue-600 shadow':'bg-[#f8fafc] text-gray-600 border-gray-100 hover:border-gray-200'}`}>{c==='أدوية'?'💊':c==='أدوات تجميل'?'💄':c==='أدوات جراحة'?'🩺':'📦'} {c} ({co})</button> })}
          </div>
          <div className="divide-y">
            <div className="grid grid-cols-12 gap-2 p-3.5 bg-[#f8fafc] text-[11px] font-black text-gray-500"><div className="col-span-1 text-center">✓</div><div className="col-span-5 md:col-span-4">الاسم والقسم</div><div className="col-span-2 md:col-span-1 text-center">الكمية</div><div className="col-span-2 text-center hidden md:block">شراء</div><div className="col-span-2 text-center">بيع</div><div className="col-span-2 text-center">إجراء</div></div>
            {filteredMeds.map(m=>{ const sel=!!selectedForSale[m.id]; return <div key={m.id} className={`grid grid-cols-12 gap-2 p-4 text-[13px] items-center hover:bg-gray-50/80 transition ${sel?'bg-green-50 border-r-4 border-r-green-500':''}`}><div className="col-span-1 text-center"><input type="checkbox" checked={sel} onChange={()=>toggleSelectMed(m)} className="w-5 h-5 accent-green-600 rounded"/></div><div className="col-span-5 md:col-span-4"><div className="font-bold">{m.name}</div><span className="inline-flex mt-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-bold">{m.category||'أدوية'}</span></div><div className={`col-span-2 md:col-span-1 text-center font-bold ${ (m.quantity||0)<=5?'text-red-600 bg-red-50 rounded-full py-1':''}`}>{m.quantity}</div><div className="col-span-2 text-center text-gray-500 hidden md:block">{m.buy_price} ر.ي</div><div className="col-span-2 text-center font-black text-green-600">{m.sell_price} ر.ي</div><div className="col-span-2 text-center"><button onClick={()=>delMed(m.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition">حذف</button></div></div> })}
            {filteredMeds.length===0 && <div className="p-12 text-center text-gray-400"><div className="text-3xl">💊</div><div className="text-sm mt-2">لا يوجد أدوية في هذا القسم</div></div>}
          </div>
        </div>
      </div>

      {/* مودالات - نفسها بتنسيق أجمل */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={()=>setAddModal({open:false, step:1, category:'أدوية', rows:[{name:'',qty:'',buy:'',sell:''}]})}>
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border" onClick={e=>e.stopPropagation()}>
            {addModal.step===1? <div className="p-7"><div className="font-black text-xl text-center">اختر القسم لإضافة الأدوية</div><p className="text-xs text-gray-500 text-center mt-2">تقدر تضيف أكثر من دواء مرة واحدة في نفس القسم</p><div className="grid grid-cols-2 gap-3 mt-7">{CATEGORIES.map(cat=><button key={cat} onClick={()=>setAddModal(s=>({...s, category:cat, step:2}))} className="border-2 rounded-[20px] p-6 bg-[#f8fafc] hover:bg-blue-50 hover:border-blue-200 transition group"><div className="text-3xl group-hover:scale-110 transition">{cat==='أدوية'?'💊':cat==='أدوات تجميل'?'💄':cat==='أدوات جراحة'?'🩺':'📦'}</div><div className="font-black text-sm mt-3">{cat}</div></button>)}</div></div>
            : <><div className="p-5 border-b flex justify-between items-center bg-[#f8fafc]"><div className="font-black">➕ إضافة في: <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{addModal.category}</span></div><button onClick={()=>setAddModal(s=>({...s, step:1}))} className="text-xs bg-white border px-3 py-1.5 rounded-full font-bold">← الأقسام</button></div><div className="p-4 space-y-3 max-h-[60vh] overflow-auto bg-[#fcfcfc]">{addModal.rows.map((row,i)=><div key={i} className="grid grid-cols-12 gap-2"><input value={row.name} onChange={e=>setAddModal(s=>{ const r=[...s.rows]; r[i].name=e.target.value; return {...s, rows:r}})} placeholder="اسم الدواء" className="col-span-5 border border-gray-200 focus:border-black p-3 rounded-xl text-sm bg-white outline-none"/><input value={row.qty} type="number" onChange={e=>setAddModal(s=>{ const r=[...s.rows]; r[i].qty=e.target.value; return {...s, rows:r}})} placeholder="الكمية" className="col-span-2 border border-gray-200 p-3 rounded-xl text-sm bg-white outline-none"/><input value={row.buy} type="number" onChange={e=>setAddModal(s=>{ const r=[...s.rows]; r[i].buy=e.target.value; return {...s, rows:r}})} placeholder="شراء" className="col-span-2 border border-gray-200 p-3 rounded-xl text-sm bg-white outline-none"/><input value={row.sell} type="number" onChange={e=>setAddModal(s=>{ const r=[...s.rows]; r[i].sell=e.target.value; return {...s, rows:r}})} placeholder="بيع" className="col-span-2 border border-gray-200 p-3 rounded-xl text-sm bg-white outline-none"/><button onClick={()=>setAddModal(s=>{ const r=s.rows.filter((_,idx)=>idx!==i); return {...s, rows:r.length?r:[{name:'',qty:'',buy:'',sell:''}]}})} className="col-span-1 w-9 h-9 bg-red-50 text-red-500 rounded-full">✕</button></div>)}<button onClick={()=>setAddModal(s=>({...s, rows:[...s.rows, {name:'',qty:'',buy:'',sell:''}]}))} className="w-full border-2 border-dashed rounded-2xl p-3.5 text-xs font-black hover:bg-white">+ إضافة سطر جديد</button></div><div className="p-4 border-t flex gap-2 bg-white"><button onClick={()=>setAddModal({open:false, step:1, category:'أدوية', rows:[{name:'',qty:'',buy:'',sell:''}]})} className="flex-1 bg-[#f8fafc] border p-3.5 rounded-full font-bold">إلغاء</button><button onClick={saveBulkMeds} className="flex-[2] bg-[#111827] hover:bg-black text-white p-3.5 rounded-full font-black transition">✅ إضافة {addModal.rows.filter(r=>r.name).length} أدوية إلى {addModal.category}</button></div></>}
          </div>
        </div>
      )}
      {bulkSellModal.open && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"><div className="bg-white rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl border"><div className="p-5 border-b bg-green-50 flex justify-between items-center"><div className="font-black">🛒 تأكيد بيع {Object.keys(selectedForSale).length} أصناف</div><button onClick={()=>setBulkSellModal({open:false})} className="w-9 h-9 bg-white border rounded-full">✕</button></div><div className="p-4 space-y-2 max-h-[60vh] overflow-auto">{Object.keys(selectedForSale).map(id=>{ const med=meds.find(m=>m.id===id); if(!med) return null; return <div key={id} className="flex justify-between items-center border rounded-2xl p-3.5 bg-[#f8fafc]"><div><div className="font-bold text-sm">{med.name}</div><div className="text-xs text-gray-500 mt-1">{med.quantity} متوفر | {med.sell_price} ر.ي</div></div><div className="flex items-center gap-2"><button onClick={()=>updateSaleQty(id,+selectedForSale[id]-1)} className="w-9 h-9 bg-white border rounded-full">-</button><input type="number" value={selectedForSale[id]} onChange={e=>updateSaleQty(id,+e.target.value)} className="w-16 text-center border rounded-xl p-2 font-black"/><button onClick={()=>updateSaleQty(id,+selectedForSale[id]+1)} className="w-9 h-9 bg-[#111827] text-white rounded-full">+</button></div></div> })}</div><div className="p-5 bg-[#f8fafc] border-t"><div className="flex justify-between font-black mb-4 bg-white border p-3 rounded-2xl"><span>الإجمالي:</span><span className="text-green-600 text-lg">{Object.keys(selectedForSale).reduce((s,id)=>{ const med=meds.find(m=>m.id===id); return s+(med?.sell_price||0)*selectedForSale[id] },0)} ر.ي</span></div><div className="flex gap-2"><button onClick={()=>setBulkSellModal({open:false})} className="flex-1 bg-white border p-3.5 rounded-full font-bold">إلغاء</button><button onClick={confirmBulkSell} className="flex-[2] bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-full font-black shadow transition">✅ بيع وطباعة الفاتورة</button></div></div></div></div>)}
      {invoice && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3"><div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border"><div className="p-7"><div className="text-center border-b pb-5"><div className="w-12 h-12 bg-[#111827] text-white rounded-full flex items-center justify-center mx-auto">💊</div><div className="font-black text-lg mt-3">{ph.name}</div><div className="text-[11px] text-gray-500 mt-1 bg-gray-50 inline-block px-3 py-1 rounded-full">فاتورة #{invoice.invoiceNo} - {invoice.date}</div></div><div className="mt-5 space-y-1">{invoice.items.map((it,i)=><div key={i} className="flex justify-between text-sm py-3 border-b last:border-0"><div><div className="font-bold">{it.name}</div><div className="text-xs text-gray-500">{it.qty} × {it.price} ر.ي</div></div><div className="font-black">{it.total} ر.ي</div></div>)}</div><div className="mt-5 bg-[#111827] text-white rounded-2xl p-4"><div className="flex justify-between font-black"><span>الإجمالي:</span><span>{invoice.total} ر.ي</span></div><div className="flex justify-between text-xs text-green-300 mt-2"><span>الربح:</span><span>{invoice.profit} ر.ي</span></div></div></div><div className="p-4 bg-[#f8fafc] flex gap-2"><button onClick={()=>setInvoice(null)} className="flex-1 bg-white border p-3.5 rounded-full font-bold">إغلاق</button><button onClick={()=>window.print()} className="flex-1 bg-[#111827] text-white p-3.5 rounded-full font-black">🖨️ طباعة</button></div></div></div>)}
      {confirmModal.open && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setConfirmModal({open:false, order:null})}><div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl border" onClick={e=>e.stopPropagation()}><div className="bg-gradient-to-br from-green-500 to-emerald-600 p-7 text-white text-center"><div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto text-3xl backdrop-blur">📦</div><div className="font-black text-lg mt-4">تأكيد التوصيل؟</div><div className="text-sm opacity-90 mt-2">هل تم توصيل طلب <span className="font-black bg-white/20 px-2 py-0.5 rounded-full">{confirmModal.order?.customer_name}</span> ؟</div></div><div className="p-5"><div className="text-[11px] text-gray-500 text-center">سيتم خصم الكمية من المخزون وحساب الأرباح وحذف الطلب تلقائياً</div><div className="flex gap-2 mt-5"><button onClick={()=>setConfirmModal({open:false, order:null})} className="flex-1 bg-[#f8fafc] border p-3.5 rounded-full font-bold">إلغاء</button><button onClick={markDone} className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-full font-black shadow transition">✅ نعم، تم التوصيل</button></div></div></div></div>)}

      {/* مودالات الأرباح - حافظت عليها */}
      {showProfitModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowProfitModal(false)}><div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="font-black text-lg">{modeLabels[viewMode].title} - {filteredProfit.toLocaleString()} ر.ي</div><div className="mt-4 space-y-2 max-h-80 overflow-auto">{filteredSales.map((s,i)=><div key={i} className="flex justify-between text-sm border-b py-2"><span>{s.medicine_name} x{s.qty}</span><span className="text-green-600 font-bold">{s.profit} ر.ي</span></div>)}{filteredSales.length===0 && <div className="text-center text-gray-400 text-sm py-10">لا يوجد أرباح في هذا الوضع</div>}</div><button onClick={()=>setShowProfitModal(false)} className="w-full bg-black text-white p-3 rounded-full mt-4 font-bold">إغلاق</button></div></div>)}
      {showSalesModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowSalesModal(false)}><div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="font-black text-lg">{modeLabels[viewMode].ops} - {filteredSales.length}</div><div className="mt-4 space-y-2 max-h-80 overflow-auto">{filteredSales.map((s,i)=><div key={i} className="flex justify-between text-sm border-b py-2"><span>{new Date(s.created_at).toLocaleString('ar-EG')} - {s.medicine_name}</span><span>{s.total} ر.ي</span></div>)}</div><button onClick={()=>setShowSalesModal(false)} className="w-full bg-black text-white p-3 rounded-full mt-4 font-bold">إغلاق</button></div></div>)}
    </div>
  )
}