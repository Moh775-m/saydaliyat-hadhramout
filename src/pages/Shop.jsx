import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const CATEGORIES = ['الكل','أدوية','أدوات تجميل','أدوات جراحة','أخرى']

export default function Shop(){
  const {username}=useParams()
  const [ph,setPh]=useState(null)
  const [meds,setMeds]=useState([])
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState('الكل')
  const [cart,setCart]=useState([])
  const [showCart,setShowCart]=useState(false)
  const [orderSuccess,setOrderSuccess]=useState(false)
  const [customer,setCustomer]=useState({name:'',phone:'',address:''})
  const [accounts,setAccounts]=useState([])
  const [prescription,setPrescription]=useState(null)
  const [receipt,setReceipt]=useState(null)
  const [paymentMethod,setPaymentMethod]=useState('cash')
  const [copiedId,setCopiedId]=useState(null)
  const [toast,setToast]=useState(null)

  useEffect(()=>{ load() },[])
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),2500); return ()=>clearTimeout(t) } },[toast])

  async function load(){
    const {data:p}=await supabase.from('pharmacies').select('*').eq('username',username).single()
    if(!p) return; setPh(p)
    const {data:m}=await supabase.from('medicines').select('*').eq('pharmacy_id',p.id).gt('quantity',0).order('name')
    setMeds(m||[])
    const {data:accs}=await supabase.from('payment_accounts').select('*').eq('pharmacy_id',p.id)
    setAccounts(accs||[])
  }

  function addToCart(med){
    setCart(prev=>{
      const ex=prev.find(x=>x.id===med.id)
      if(ex) return prev.map(x=>x.id===med.id? {...x, qty:x.qty+1}:x)
      return [...prev, {id:med.id, name:med.name, price:med.sell_price, qty:1}]
    })
    setToast(`✅ تمت إضافة ${med.name} للسلة`)
  }
  function changeQty(id, delta){ setCart(prev=> prev.map(x=> x.id===id? {...x, qty: Math.max(1, x.qty+delta)}:x)) }
  function removeItem(id){ setCart(prev=>prev.filter(x=>x.id!==id)) }
  const total=cart.reduce((s,x)=>s+x.price*x.qty,0)
  const filtered=meds.filter(m=>{ const s=m.name.toLowerCase().includes(search.toLowerCase()); const c=category==='الكل' || (m.category||'أدوية')===category; return s&&c })

  async function uploadFile(file){
    if(!file) return null
    const name=`${Date.now()}-${file.name}`
    const {error}=await supabase.storage.from('prescriptions').upload(name,file)
    if(error) return null
    const {data:url}=supabase.storage.from('prescriptions').getPublicUrl(name)
    return url.publicUrl
  }

  async function placeOrder(){
    if(!customer.name ||!customer.phone) return alert('اكتب اسمك ورقم جوالك')
    if(cart.length===0 &&!prescription) return alert('اختر دواء أو ارفع صورة الوصفة')
    if(paymentMethod==='transfer' && accounts.length>0 &&!receipt) return alert('اخترت تحويل بنكي - يجب رفع صورة سند التحويل')
    let presUrl=null, recUrl=null
    if(prescription) presUrl=await uploadFile(prescription)
    if(receipt) recUrl=await uploadFile(receipt)
    const {data:order, error}=await supabase.from('orders').insert({
      pharmacy_id:ph.id, customer_name:customer.name, customer_phone:customer.phone,
      address:customer.address, total:total, prescription_url:presUrl, receipt_url:recUrl, payment_method: paymentMethod==='transfer'?'تحويل بنكي':'كاش عند الاستلام'
    }).select().single()
    if(error) return alert(error.message)
    if(cart.length>0){
      for(let item of cart){
        await supabase.from('order_items').insert({order_id:order.id, medicine_id:item.id, medicine_name:item.name, qty:item.qty, price:item.price})
      }
    }
    setOrderSuccess(true); setCart([]); setShowCart(false)
  }

  function copyAccount(num, id){
    navigator.clipboard.writeText(num)
    setCopiedId(id)
    setTimeout(()=>setCopiedId(null),2000)
  }

  const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M19.05 4.91A9.86 9.86 0 0 0 12.03 2C6.51 2 2.03 6.48 2.03 12a9.88 9.88 0 0 0 1.32 4.95L2 22l5.2-1.36a9.86 9.86 0 0 0 4.83 1.23h0A9.88 9.88 0 0 0 21.93 12a9.81 9.81 0 0 0-2.88-6.91l-.01-.18ZM12.03 20.13a8.13 8.13 0 0 1-4.14-1.13l-.3-.18-3.09.81.82-3.01-.2-.31A8.1 8.1 0 0 1 3.87 12c0-4.48 3.65-8.13 8.15-8.13A8.08 8.08 0 0 1 20.17 12a8.12 8.12 0 0 1-8.14 8.13Zm4.47-6.09c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.24-.64.8-.79.97-.14.17-.29.19-.54.07-.24-.12-1.03-.38-1.96-1.21-.73-.64-1.21-1.43-1.36-1.68-.14-.24-.02-.37.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.24-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.24-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.77 2.71 4.29 3.8.6.26 1.07.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>
  )

  if(!ph) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">⏳ تحميل الصيدلية...</div>
  if(orderSuccess) return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)] border">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg shadow-green-500/30">✓</div>
        <div className="font-black text-2xl mt-5">تم إرسال طلبك!</div>
        <div className="text-sm text-gray-500 mt-2 leading-6">صيدلية <b>{ph.name}</b> ستتواصل معك خلال دقائق لتأكيد التوصيل</div>
        <div className="mt-6 flex gap-2"><button onClick={()=>setOrderSuccess(false)} className="flex-1 bg-[#111827] text-white p-4 rounded-full font-black text-sm">طلب جديد</button><a href={`https://wa.me/967${ph.phone?.replace(/^0/,'')}`} className="flex-1 bg-[#25D366] text-white p-4 rounded-full font-black text-sm flex items-center justify-center gap-2"><WhatsAppIcon/> واتساب</a></div>
      </div>
    </div>
  )

  return(
    <div dir="rtl" className="min-h-screen bg-[#f8fafc]">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#111827] text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl z-[100] animate-[pop_0.3s]">{toast}</div>}

      {/* هيدر جديد فخم */}
      <div className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">💊</div>
            <div>
              <div className="font-black text-[15px]">صيدلية {ph.name}</div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> متاح الآن • توصيل سريع</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`https://wa.me/967${ph.phone?.replace(/^0/,'')}`} target="_blank" className="w-11 h-11 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 hover:scale-105 transition"><WhatsAppIcon/></a>
            <button onClick={()=>setShowCart(true)} className="relative bg-[#111827] text-white px-5 py-3 rounded-full text-xs font-black shadow-lg hover:bg-black transition">🛒 السلة {cart.length>0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1 border-2 border-white">{cart.reduce((a,b)=>a+b.qty,0)}</span>}</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-5 pb-28">
        {/* هيرو */}
        <div className="relative bg-gradient-to-br from-[#111827] via-[#1f2937] to-black rounded-[28px] p-6 md:p-8 text-white overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[60px]"></div>
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="inline-flex bg-white/10 border border-white/10 rounded-full px-3 py-1 text-[11px]">🏠 أطلب دواءك من البيت</div>
              <div className="font-black text-3xl md:text-4xl mt-4 leading-[1.1]">كل اللي تحتاجه<br/><span className="text-green-400">يوصلك لباب بيتك</span></div>
              <div className="text-sm opacity-60 mt-3">ابحث، أضف للسلة، وارفع الوصفة لو عندك</div>
            </div>
            <div className="bg-white rounded-[20px] p-2 flex items-center gap-2 shadow-xl">
              <span className="text-gray-400 pr-3">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن بندول، فيتامين، كريم..." className="flex-1 outline-none text-sm text-black py-2" />
              {search && <button onClick={()=>setSearch('')} className="bg-gray-100 w-8 h-8 rounded-full text-xs">✕</button>}
            </div>
          </div>
        </div>

        {/* فلتر الأقسام الجديد */}
        <div className="flex gap-2 overflow-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setCategory(c)} className={`px-5 py-2.5 rounded-full text-[13px] font-black shrink-0 border transition ${category===c?'bg-[#111827] text-white border-black shadow-lg':'bg-white text-gray-600 border-gray-100 hover:border-gray-200'}`}>
              {c==='الكل'?'📦':c==='أدوية'?'💊':c==='أدوات تجميل'?'💄':c==='أدوات جراحة'?'🩺':'📦'} {c}
            </button>
          ))}
        </div>

        {/* شبكة الأدوية - نفس الوظيفة بتنسيق فخم */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map(m=>{
            const inCart = cart.find(x=>x.id===m.id)
            return(
              <div key={m.id} className="group bg-white rounded-[22px] p-4 border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-100 hover:-translate-y-1 transition-all flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl flex items-center justify-center text-xl">💊</div>
                  <span className="text-[10px] bg-gray-50 border px-2.5 py-1 rounded-full font-bold text-gray-600">{m.category||'أدوية'}</span>
                </div>
                <div className="font-bold text-[14px] mt-4 leading-5 line-clamp-2">{m.name}</div>
                <div className="text-[11px] text-gray-500 mt-1">متوفر: <b className={m.quantity<=5?'text-red-500':''}>{m.quantity}</b></div>
                <div className="mt-auto flex justify-between items-center pt-4">
                  <div><div className="font-black text-green-600 text-[16px]">{m.sell_price} <span className="text-[11px]">ر.ي</span></div></div>
                  <button onClick={()=>addToCart(m)} className={`px-4 py-2 rounded-full text-xs font-black transition ${inCart?'bg-green-600 text-white shadow-lg shadow-green-600/20':'bg-[#111827] text-white group-hover:bg-black'}`}>
                    {inCart?`✓ ${inCart.qty}`:'+ إضافة'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length===0 && <div className="bg-white border rounded-[20px] p-10 text-center text-gray-400 text-sm">لا يوجد أدوية في قسم {category} - جرب البحث</div>}

        {/* رفع الوصفة - تنسيق جديد */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[22px] p-5 border shadow-sm">
            <div className="flex items-center gap-2 font-black text-sm"><span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">📸</span> عندك وصفة طبية؟</div>
            <p className="text-[12px] text-gray-500 mt-2 leading-5">صور الروشتة وارفعها، والصيدلية تجهز لك كل شيء</p>
            <label className={`mt-4 border-2 border-dashed rounded-2xl p-5 text-center text-sm cursor-pointer block transition ${prescription?'bg-green-50 border-green-300 text-green-700':'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
              <input type="file" hidden accept="image/*" onChange={e=>setPrescription(e.target.files[0])}/>
              {prescription? `✅ ${prescription.name}` : '📸 اضغط لرفع صورة الوصفة'}
            </label>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-[22px] p-5 text-white shadow-lg shadow-green-600/20">
            <div className="font-black">توصيل سريع ⚡</div>
            <div className="text-sm opacity-80 mt-2 leading-6">نغطي جميع مناطق حضرموت، الدفع كاش أو تحويل بنكي. طلبك يوصل خلال ساعة.</div>
            <div className="mt-4 flex gap-2 text-[11px]">
              <span className="bg-white/15 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full">✓ دفع آمن</span>
              <span className="bg-white/15 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full">✓ توصيل مجاني فوق 5000</span>
            </div>
          </div>
        </div>
      </div>

      {/* سلة عائمة محسنة */}
      {cart.length>0 &&!showCart && (
        <div className="fixed bottom-5 left-4 right-4 md:left-auto md:right-6 md:w-[380px] bg-[#111827] text-white rounded-full p-2 pl-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-30 border border-white/10 backdrop-blur">
          <div className="flex items-center gap-3 pr-2">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">🛒</div>
            <div><div className="font-bold text-[13px]">{cart.reduce((a,b)=>a+b.qty,0)} أدوية</div><div className="text-[11px] opacity-60">{total} ر.ي</div></div>
          </div>
          <button onClick={()=>setShowCart(true)} className="bg-white text-black px-7 py-3 rounded-full font-black text-sm hover:scale-105 transition">عرض و تأكيد</button>
        </div>
      )}

      {/* مودال السلة - نفس الوظائف بالضبط بتنسيق فخم */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center" onClick={()=>setShowCart(false)}>
          <div className="bg-[#f8fafc] rounded-t-[28px] md:rounded-[28px] w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border" onClick={e=>e.stopPropagation()}>
            <div className="p-5 bg-white border-b flex justify-between items-center">
              <div><div className="font-black text-[16px]">🛒 سلتك</div><div className="text-[11px] text-gray-500">{cart.reduce((a,b)=>a+b.qty,0)} منتجات • {total} ر.ي</div></div>
              <button onClick={()=>setShowCart(false)} className="w-10 h-10 bg-gray-50 border rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="overflow-auto flex-1">
              <div className="p-3 space-y-2">
                {cart.map(item=>(
                  <div key={item.id} className="bg-white border rounded-2xl p-3 flex justify-between items-center">
                    <div><div className="font-bold text-[13px]">{item.name}</div><div className="text-xs text-gray-500">{item.price} ر.ي × {item.qty} = <b className="text-black">{item.price*item.qty}</b></div></div>
                    <div className="flex items-center gap-2"><button onClick={()=>changeQty(item.id,-1)} className="w-8 h-8 bg-gray-50 border rounded-full hover:bg-gray-100">-</button><span className="font-black w-6 text-center text-sm">{item.qty}</span><button onClick={()=>changeQty(item.id,1)} className="w-8 h-8 bg-[#111827] text-white rounded-full">+</button><button onClick={()=>removeItem(item.id)} className="text-red-500 text-[11px] mr-1 bg-red-50 px-2 py-1 rounded-full">حذف</button></div>
                  </div>
                ))}
                {cart.length===0 && <div className="p-12 text-center"><div className="text-4xl">🛒</div><div className="text-gray-400 text-sm mt-3">السلة فاضية - أضف أدوية أولاً</div></div>}
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-white rounded-[20px] p-4 border space-y-3">
                  <div className="font-black text-sm">👤 بيانات التوصيل</div>
                  <input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="اسمك الكامل" className="w-full border border-gray-100 bg-[#f8fafc] focus:bg-white focus:border-black p-3.5 rounded-2xl text-sm outline-none transition"/>
                  <input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="رقم جوالك 7xx xxx xxx" className="w-full border border-gray-100 bg-[#f8fafc] focus:bg-white focus:border-black p-3.5 rounded-2xl text-sm outline-none transition"/>
                  <input value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} placeholder="عنوانك - الحي، الشارع" className="w-full border border-gray-100 bg-[#f8fafc] focus:bg-white focus:border-black p-3.5 rounded-2xl text-sm outline-none transition"/>
                </div>

                <div className="bg-white rounded-[20px] p-4 border">
                  <div className="font-black text-sm mb-3">💳 طريقة الدفع</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>setPaymentMethod('cash')} className={`p-3.5 rounded-2xl border-2 text-xs font-black transition ${paymentMethod==='cash'?'border-[#111827] bg-[#111827] text-white':'border-gray-100 bg-[#f8fafc] hover:border-gray-200'}`}>💵 كاش عند الاستلام</button>
                    <button onClick={()=>setPaymentMethod('transfer')} className={`p-3.5 rounded-2xl border-2 text-xs font-black transition ${paymentMethod==='transfer'?'border-blue-600 bg-blue-600 text-white':'border-gray-100 bg-[#f8fafc] hover:border-gray-200'}`}>🏦 تحويل بنكي</button>
                  </div>
                  {paymentMethod==='transfer' && (
                    <div className="mt-4 space-y-3">
                      {accounts.length===0? <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-2xl">⚠️ الصيدلية لم تضف حسابات بنكية بعد - اختر كاش</div> :
                        accounts.map(a=>(
                          <div key={a.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                            <div><div className="font-black text-blue-700 text-[11px]">{a.bank_name}</div><div className="font-mono font-black text-[15px] tracking-wider">{a.account_number}</div><div className="text-[11px] text-gray-500 mt-0.5">باسم {a.account_name}</div></div>
                            <button onClick={()=>copyAccount(a.account_number, a.id)} className={`px-4 py-2 rounded-full text-[11px] font-black transition ${copiedId===a.id?'bg-green-600 text-white':'bg-white border shadow-sm'}`}>{copiedId===a.id?'✅ تم النسخ':'📋 نسخ'}</button>
                          </div>
                        ))
                      }
                      <label className={`border-2 border-dashed rounded-2xl p-4 text-center text-xs cursor-pointer block transition ${receipt?'bg-green-50 border-green-300 text-green-700 font-bold':'bg-blue-50/50 border-blue-200 hover:bg-blue-50'}`}>
                        <input type="file" hidden accept="image/*" onChange={e=>setReceipt(e.target.files[0])}/>
                        {receipt? `✅ سند التحويل: ${receipt.name}` : '🧾 رفع صورة سند التحويل (مطلوب للتحويل)'}
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-[#111827] rounded-[20px] p-4 flex justify-between items-center text-white">
                  <span className="text-sm opacity-70">الإجمالي النهائي</span><span className="font-black text-xl">{total} <span className="text-sm">ر.ي</span></span>
                </div>
                <button onClick={placeOrder} className="w-full bg-gradient-to-br from-green-600 to-emerald-600 text-white p-4 rounded-full font-black shadow-lg shadow-green-600/20 hover:scale-[1.01] transition">✅ تأكيد الطلب - {total} ر.ي</button>
                <div className="text-[10px] text-center text-gray-400">بالضغط على تأكيد، أنت توافق على سياسة التوصيل</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}