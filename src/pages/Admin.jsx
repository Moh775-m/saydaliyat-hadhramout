import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Admin(){
  const [pass,setPass]=useState('')
  const [ok,setOk]=useState(false)
  const [list,setList]=useState([])
  const [f,setF]=useState({username:'',name:'',password:''})
  const [editing,setEditing]=useState(null)

  function check(){ 
    if(pass===import.meta.env.VITE_ADMIN_PASS) { setOk(true); load() }
    else alert('غلط') 
  }

  async function load(){
    const {data} = await supabase.from('pharmacies').select('*').order('created_at',{ascending:false})
    setList(data||[])
  }

  async function create(){
    if(!f.username||!f.name||!f.password) return alert('عبي الكل')
    if(editing){
      const {error} = await supabase.from('pharmacies').update({name:f.name, password:f.password}).eq('id',editing)
      if(error) alert(error.message); else { setEditing(null); setF({username:'',name:'',password:''}); load(); alert('تم التعديل') }
    } else {
      const {error}=await supabase.from('pharmacies').insert({
        username:f.username.toLowerCase(), 
        name:f.name, 
        password:f.password,
        is_active: true,
        subscription_status: 'active',
        end_date: new Date(Date.now()+30*24*60*60*1000).toISOString()
      })
      if(error) alert(error.message); else { alert('تم انشاء '+f.name); setF({username:'',name:'',password:''}); load() }
    }
  }

  async function del(id){
    if(!confirm('متأكد تحذف؟')) return
    await supabase.from('pharmacies').delete().eq('id',id)
    load()
  }

  async function toggleActive(p){
    await supabase.from('pharmacies').update({is_active: !p.is_active}).eq('id',p.id)
    load()
  }

  function startEdit(p){
    setEditing(p.id)
    setF({username:p.username, name:p.name, password:p.password})
    window.scrollTo(0,0)
  }

  if(!ok) return <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-100"><div className="bg-white p-6 rounded-xl w-80 shadow"><h2 className="font-bold mb-3">دخول المدير</h2><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="باس الادمن" className="w-full border p-3 rounded"/><button onClick={check} className="w-full bg-black text-white p-3 rounded mt-2">دخول</button></div></div>

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        {/* نموذج الاضافة */}
        <div className="bg-white p-6 rounded-xl h-fit shadow">
          <h1 className="font-bold">{editing ? 'تعديل صيدلية' : 'اضافة صيدلية جديدة'}</h1>
          <input disabled={!!editing} value={f.username} onChange={e=>setF({...f,username:e.target.value})} placeholder=" (انجليزي)" className="w-full border p-3 rounded mt-3 disabled:bg-gray-100"/>
          <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="اسم الصيدلية " className="w-full border p-3 rounded mt-2"/>
          <input value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="كلمة السر" className="w-full border p-3 rounded mt-2"/>
          <button onClick={create} className="w-full bg-green-600 text-white p-3 rounded mt-3 font-bold">{editing ? 'حفظ التعديل' : 'انشاء'}</button>
          {editing && <button onClick={()=>{setEditing(null); setF({username:'',name:'',password:''})}} className="w-full bg-gray-200 p-2 rounded mt-2">الغاء</button>}
        </div>

        {/* جدول الصيدليات */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold mb-4">الصيدليات المضافة ({list.length})</h2>
          <div className="space-y-3">
            {list.map(p=>(
              <div key={p.id} className="border p-3 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-sm text-gray-500">@{p.username} - {p.is_active ? '✅ نشط' : '❌ موقوف'} - ينتهي: {p.end_date ? new Date(p.end_date).toLocaleDateString('ar-YE') : 'غير محدد'}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>toggleActive(p)} className={`px-2 py-1 rounded text-xs ${p.is_active ? 'bg-yellow-100' : 'bg-green-100'}`}>{p.is_active ? 'ايقاف' : 'تفعيل'}</button>
                  <button onClick={()=>startEdit(p)} className="bg-blue-100 px-2 py-1 rounded text-xs">تعديل</button>
                  <button onClick={()=>del(p.id)} className="bg-red-100 px-2 py-1 rounded text-xs">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}