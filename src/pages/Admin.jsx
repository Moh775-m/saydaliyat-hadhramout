import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Admin(){
  const nav = useNavigate()
  const [pass,setPass]=useState('')
  const [ok,setOk]=useState(false)
  const [list,setList]=useState([])
  // ✅ التعديل الوحيد هنا: أضفنا phone و address
  const [f,setF]=useState({username:'',name:'',password:'',phone:'',address:''})
  const [editing,setEditing]=useState(null)
  const [toast,setToast]=useState(null)
  const [deleteModal,setDeleteModal]=useState({open:false,id:null})

  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),3000); return ()=>clearTimeout(t) } },[toast])

  function check(){
    if(pass===import.meta.env.VITE_ADMIN_PASS) {
      setOk(true)
    } else setToast({type:'error',msg:'كلمة المرور غلط ❌'})
  }

  useEffect(()=>{
    if(ok) load()
  },[ok])

  async function load(){
    const {data, error} = await supabase.from('pharmacies').select('*').order('created_at',{ascending:false})
    console.log("ADMIN DATA:", data, "ERROR:", error)
    if(error){
      setToast({type:'error',msg:"خطأ تحميل: "+error.message})
      return
    }
    setList(data||[])
  }

  async function create(){
    if(!f.username||!f.name||!f.password) return setToast({type:'error',msg:'عبي كل الحقول ❗'})
    if(editing){
      // ✅ تمت الإضافة: phone و address في التعديل
      const {error} = await supabase.from('pharmacies').update({
        name:f.name,
        password:f.password,
        phone:f.phone.trim(),
        address:f.address.trim()
      }).eq('id',editing)
      if(error) setToast({type:'error',msg:error.message}); else { setEditing(null); setF({username:'',name:'',password:'',phone:'',address:''}); load(); setToast({type:'success',msg:'تم التعديل ✅'}) }
    } else {
      const {error}=await supabase.from('pharmacies').insert({
        username:f.username.toLowerCase().trim(),
        name:f.name.trim(),
        password:f.password,
        phone:f.phone.trim(),
        address:f.address.trim(),
        is_active: true,
        subscription_status: 'active',
        end_date: new Date(Date.now()+30*24*60*60*1000).toISOString()
      })
      if(error) setToast({type:'error',msg:error.message}); else { setToast({type:'success',msg:'تم انشاء '+f.name+" ✅"}); setF({username:'',name:'',password:'',phone:'',address:''}); load() }
    }
  }

  async function del(id){
    setDeleteModal({open:true,id})
  }

  async function confirmDelete(){
    const id = deleteModal.id
    const {error} = await supabase.from('pharmacies').delete().eq('id',id)
    if(error) setToast({type:'error',msg:error.message}); else { setToast({type:'success',msg:'تم الحذف 🗑️'}); load() }
    setDeleteModal({open:false,id:null})
  }

  async function toggleActive(p){
    const {error} = await supabase.from('pharmacies').update({is_active:!p.is_active}).eq('id',p.id)
    if(error) setToast({type:'error',msg:error.message}); else { setToast({type:'success',msg: p.is_active? 'تم الإيقاف ⏸️' : 'تم التفعيل ▶️'}); load() }
  }

  function startEdit(p){
    setEditing(p.id)
    // ✅ تمت الإضافة: جلب phone و address عند التعديل
    setF({username:p.username, name:p.name, password:p.password, phone:p.phone||'', address:p.address||''})
    window.scrollTo({top:0, behavior:'smooth'})
  }

  if(!ok) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {toast && <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-sm font-black ${toast.type==='error'?'bg-red-600':'bg-[#111827]'} text-white`}>{toast.msg}</div>}
      <div className="bg-white p-8 rounded-[20px] w-80 shadow-xl border text-center">
        <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white text-xl mx-auto">🔐</div>
        <h2 className="font-black mt-4">دخول المدير</h2>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&check()} placeholder="" className="w-full border-2 p-3 rounded-xl mt-5 text-center outline-none focus:border-black"/>
        <button onClick={check} className="w-full bg-black text-white p-3 rounded-full mt-3 font-bold">دخول</button>
      </div>
    </div>
  )

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-4 md:p-6">
      {toast && <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-sm font-black backdrop-blur ${toast.type==='error'?'bg-red-600':'bg-[#111827]'} text-white animate-bounce`}>{toast.msg}</div>}

      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-black text-xl">👑 لوحة المدير ({list.length})</h1>
          <div className="flex gap-2">
            <button onClick={load} className="bg-white border px-4 py-2 rounded-full text-xs font-bold">🔄 تحديث</button>
            <button onClick={()=>nav('/')} className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold">الرئيسية</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {/* نموذج الاضافة */}
          <div className="bg-white p-6 rounded-[20px] shadow-sm border sticky top-6">
            <h1 className="font-black text-sm">{editing? '✏️ تعديل صيدلية' : '➕ اضافة صيدلية جديدة'}</h1>
            <input disabled={!!editing} value={f.username} onChange={e=>setF({...f,username:e.target.value})} placeholder="اليوزر انجليزي " className="w-full border-2 border-gray-100 focus:border-black p-3 rounded-xl mt-4 disabled:bg-gray-100 text-sm outline-none"/>
            <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="اسم الصيدلية" className="w-full border-2 border-gray-100 focus:border-black p-3 rounded-xl mt-2 text-sm outline-none"/>
            {/* ✅ حقول جديدة فقط إضافة */}
            <input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="رقم الصيدلية - 777123456" className="w-full border-2 border-blue-50 focus:border-blue-400 bg-blue-50/40 p-3 rounded-xl mt-2 text-sm outline-none"/>
            <input value={f.address} onChange={e=>setF({...f,address:e.target.value})} placeholder="عنوان الصيدلية - المكلا / فوة" className="w-full border-2 border-blue-50 focus:border-blue-400 bg-blue-50/40 p-3 rounded-xl mt-2 text-sm outline-none"/>

            <input value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="كلمة السر" className="w-full border-2 border-gray-100 focus:border-black p-3 rounded-xl mt-2 text-sm outline-none"/>
            <button onClick={create} className="w-full bg-gradient-to-br from-green-600 to-emerald-500 text-white p-3 rounded-full mt-4 font-black text-sm shadow-lg">{editing? 'حفظ التعديل' : 'انشاء الصيدلية'}</button>
            {editing && <button onClick={()=>{setEditing(null); setF({username:'',name:'',password:'',phone:'',address:''})}} className="w-full bg-gray-100 p-3 rounded-full mt-2 text-sm font-bold">الغاء</button>}
            <div className="text-[11px] text-gray-400 mt-4 text-center">رابط الصيدلية: /p/{f.username || 'username'}</div>
          </div>

          {/* جدول الصيدليات */}
          <div className="md:col-span-2 bg-white p-6 rounded-[20px] shadow-sm border min-h-[400px]">
            <h2 className="font-black mb-4">🏥 الصيدليات المضافة</h2>
            {list.length===0? (
              <div className="text-center py-16">
                <div className="text-4xl">📭</div>
                <div className="text-sm text-gray-500 mt-3">لا يوجد صيدليات - اضف أول صيدلية من اليسار</div>
                <div className="text-[11px] text-gray-400 mt-2">افتح Console بـ F12 وشوف ADMIN DATA</div>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map(p=>(
                  <div key={p.id} className="border-2 border-gray-50 hover:border-gray-200 p-4 rounded-2xl flex justify-between items-center transition">
                    <div className="flex-1">
                      <div className="font-black text-[14px] flex items-center gap-2">
                        {p.name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.is_active? 'bg-green-50 text-green-700 border border-green-100':'bg-red-50 text-red-700 border border-red-100'}`}>{p.is_active? '✅ نشط' : '❌ موقوف'}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">@{p.username} • ينتهي: {p.end_date? new Date(p.end_date).toLocaleDateString('ar-YE') : 'غير محدد'}</div>
                      {/* ✅ عرض الرقم والعنوان في لوحة المدير */}
                      <div className="text-xs text-gray-600 mt-1">📞 {p.phone||'بدون رقم'} • 📍 {p.address||'بدون عنوان'}</div>
                      <div className="text-[11px] text-gray-400 mt-1">🔗 /p/{p.username}</div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-1.5">
                      <button onClick={()=>toggleActive(p)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${p.is_active? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>{p.is_active? '⏸ ايقاف' : '▶ تفعيل'}</button>
                      <button onClick={()=>startEdit(p)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-full text-xs font-bold">تعديل</button>
                      <button onClick={()=>del(p.id)} className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-full text-xs font-bold">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl border">
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-2xl">🗑️</div>
              <div className="font-black text-lg mt-4">متأكد تحذف الصيدلية نهائياً؟</div>
              <div className="text-xs text-gray-500 mt-2">لا يمكن التراجع بعد الحذف وسيتم حذف كل أدويتها</div>
            </div>
            <div className="p-4 flex gap-2 border-t bg-gray-50">
              <button onClick={()=>setDeleteModal({open:false,id:null})} className="flex-1 bg-white border p-3 rounded-full text-sm font-bold">إلغاء</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full text-sm font-black">نعم، احذف نهائياً</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}