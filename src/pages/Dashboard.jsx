import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const CATEGORIES = ['أدوية', 'أدوات تجميل', 'أدوات جراحة', 'أخرى']
const DEFAULT_REPORT_MODE = 'daily'

export default function Dashboard() {
    const nav = useNavigate()
    const pharmacyId = localStorage.getItem('pharmacy_id')
    const [ph, setPh] = useState(null)
    const [meds, setMeds] = useState([])
    const [orders, setOrders] = useState([])
    const [orderItems, setOrderItems] = useState({})
    const [accounts, setAccounts] = useState([])
    const [accForm, setAccForm] = useState({ id: null, bank_name: 'الكريمي', account_number: '', account_name: '' })
    const [medSearch, setMedSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('الكل')
    const [newOrderCount, setNewOrderCount] = useState(0)
    const [sales, setSales] = useState([])
    const [lastOrderId, setLastOrderId] = useState(null)
    const [showSalesModal, setShowSalesModal] = useState(false)
    const [showProfitModal, setShowProfitModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ open: false, order: null })
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const [viewMode, setViewMode] = useState(() => localStorage.getItem(`report_mode_${pharmacyId}`) || DEFAULT_REPORT_MODE)
    const [addModal, setAddModal] = useState({ open: false, step: 1, category: 'أدوية', rows: [{ name: '', qty: '', buy: '', sell: '' }] })
    const [selectedForSale, setSelectedForSale] = useState({})
    const [bulkSellModal, setBulkSellModal] = useState({ open: false })
    const [bulkSellLoading, setBulkSellLoading] = useState(false)
    const [invoice, setInvoice] = useState(null)
    const [blockedPharm, setBlockedPharm] = useState(null)
    const [editModal, setEditModal] = useState({ open: false, id: null, name: '', qty: '', buy: '', sell: '', category: 'أدوية' })
    const audioRef = useRef(null)

    useEffect(() => {
        if (!pharmacyId) { nav('/login'); return }
        loadAll()
        if (Notification.permission !== 'granted') Notification.requestPermission()
        const ch = supabase.channel('orders-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `pharmacy_id=eq.${pharmacyId}` }, payload => {
            if (payload.new.id === lastOrderId) return
            setLastOrderId(payload.new.id); setNewOrderCount(c => c + 1)
            if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => { }) }
            if (Notification.permission === 'granted') { new Notification('طلب جديد 🔔', { body: `من ${payload.new.customer_name}` }) }
            loadOrders()
        }).subscribe()
        const interval = setInterval(() => loadOrders(), 3000)
        return () => { supabase.removeChannel(ch); clearInterval(interval) }
    }, [])
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) } }, [toast])
    useEffect(() => { if (pharmacyId) localStorage.setItem(`report_mode_${pharmacyId}`, viewMode) }, [viewMode])

    async function loadAll() {
        const { data: p, error } = await supabase.from('pharmacies').select('*').eq('id', pharmacyId).single()
        if (error) {
            console.log("PHARM ERROR", error)
            setBlockedPharm('حدث خطأ في تحميل بيانات الصيدلية')
            return
        }
        if (p) {
            if (p.is_active === false) {
                setBlockedPharm(`🚫 تم إيقاف اشتراك صيدلية ${p.name} من قبل الإدارة\n\nتواصل مع الإدارة للتجديد:\n📞 775443254`)
                setPh(p)
                return
            }
            if (p.end_date && new Date(p.end_date) < new Date()) {
                setBlockedPharm(`⏰ انتهى اشتراك صيدلية ${p.name}\nتاريخ الانتهاء: ${new Date(p.end_date).toLocaleDateString('ar-YE')}\n\nتواصل للتجديد: 775443254`)
                setPh(p)
                return
            }
        }
        setPh(p)
        const { data: m } = await supabase.from('medicines').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false }); setMeds(m || [])
        const { data: accs } = await supabase.from('payment_accounts').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false }); setAccounts(accs || [])
        const { data: s } = await supabase.from('sales').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false }); setSales(s || [])
        loadOrders()
    }
    async function loadOrders() {
        const { data: o } = await supabase.from('orders').select('*').eq('pharmacy_id', pharmacyId).order('created_at', { ascending: false })
        if (!o) return; setOrders(o); let map = {}; for (let ord of o) { const { data: items } = await supabase.from('order_items').select('*').eq('order_id', ord.id); if (items) map[ord.id] = items } setOrderItems(map)
    }
    async function saveBulkMeds() {
        const valid = addModal.rows.filter(r => r.name.trim() !== '')
        if (!valid.length) return setToast({ type: 'error', msg: 'اكتب اسم دواء' })
        for (let r of valid) { await supabase.from('medicines').insert({ pharmacy_id: pharmacyId, name: r.name, quantity: +r.qty || 0, buy_price: +r.buy || 0, sell_price: +r.sell || 0, category: addModal.category }) }
        setAddModal({ open: false, step: 1, category: 'أدوية', rows: [{ name: '', qty: '', buy: '', sell: '' }] }); setToast({ type: 'success', msg: `تمت إضافة ${valid.length} في ${addModal.category} ✅` }); loadAll()
    }
    async function delMed(id) { if (confirm('حذف الدواء؟')) { await supabase.from('medicines').delete().eq('id', id); loadAll() } }

    function openEdit(m) {
        setEditModal({ open: true, id: m.id, name: m.name, qty: m.quantity, buy: m.buy_price, sell: m.sell_price, category: m.category || 'أدوية' })
    }
    async function saveEdit() {
        if (!editModal.name.trim()) return setToast({ type: 'error', msg: 'اكتب اسم الدواء' })
        const { error } = await supabase.from('medicines').update({ name: editModal.name, quantity: +editModal.qty || 0, buy_price: +editModal.buy || 0, sell_price: +editModal.sell || 0, category: editModal.category }).eq('id', editModal.id)
        if (error) return setToast({ type: 'error', msg: error.message })
        setEditModal({ open: false, id: null, name: '', qty: '', buy: '', sell: '', category: 'أدوية' })
        setToast({ type: 'success', msg: 'تم التعديل بنجاح ✅' })
        loadAll()
    }

    function toggleSelectMed(m) { setSelectedForSale(p => { const c = { ...p }; if (c[m.id]) delete c[m.id]; else c[m.id] = 1; return c }) }
    function updateSaleQty(id, q) { setSelectedForSale(p => ({ ...p, [id]: Math.max(1, +q || 1) })) }

    // ✅ إصلاح 1: زر بيع وطباعة - كان لا يعمل
    async function confirmBulkSell() {
        const ids = Object.keys(selectedForSale); if (!ids.length) return
        setBulkSellLoading(true)
        try {
            let items = []; let tot = 0; let prof = 0
            for (let id of ids) {
                const med = meds.find(m => m.id === id); const qty = +selectedForSale[id]
                if (!med || qty > med.quantity) throw new Error(`الكمية غير كافية لـ ${med?.name}`)
                const { error } = await supabase.rpc('sell_medicine_direct', {
                    p_pharmacy_id: pharmacyId,
                    p_medicine_id: med.id,
                    p_quantity: qty
                })
                if (error) throw error
                const pr = ((med.sell_price || 0) - (med.buy_price || 0)) * qty
                items.push({ name: med.name, qty, price: med.sell_price, total: (med.sell_price || 0) * qty }); tot += (med.sell_price || 0) * qty; prof += pr
            }
            setInvoice({ items, total: tot, profit: prof, date: new Date().toLocaleString('ar-EG'), invoiceNo: Date.now().toString().slice(-6) })
            setBulkSellModal({ open: false }); setSelectedForSale({}); loadAll()
        } catch (err) {
            setToast({ type: 'error', msg: err.message })
        } finally {
            setBulkSellLoading(false)
        }
    }

    // ✅ إصلاح 2: زر نعم في تأكيد التوصيل - كان لا يعمل
    async function markDone() {
        const order = confirmModal.order; if (!order) return
        setConfirmLoading(true)
        try {
            const { error } = await supabase.rpc('complete_order_delivery', { order_id_param: order.id })
            if (error) throw error
            setOrders(prev => prev.filter(o => o.id !== order.id)); setNewOrderCount(c => Math.max(0, c - 1)); setConfirmModal({ open: false, order: null }); setToast({ type: 'success', msg: `تم توصيل طلب ${order.customer_name} ✅` }); loadAll()
        } catch (err) {
            setToast({ type: 'error', msg: err.message })
        } finally {
            setConfirmLoading(false)
        }
    }

    function getFilteredSales(mode) { const now = new Date(); if (mode === 'daily') return sales.filter(s => new Date(s.created_at).toDateString() === now.toDateString()); if (mode === 'weekly') { const day = now.getDay(); const diff = (day + 1) % 7; const sat = new Date(now); sat.setDate(now.getDate() - diff); sat.setHours(0, 0, 0, 0); return sales.filter(s => new Date(s.created_at) >= sat) } if (mode === 'monthly') return sales.filter(s => { const d = new Date(s.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }); return sales }
    const totalProfit = sales.reduce((s, x) => s + (+x.profit || 0), 0); const filteredSales = getFilteredSales(viewMode); const filteredProfit = filteredSales.reduce((s, x) => s + (+x.profit || 0), 0); const lowStock = meds.filter(m => (m.quantity || 0) <= 5); const topSelling = [...sales].sort((a, b) => b.qty - a.qty).slice(0, 3); const modeLabels = { daily: { title: 'ربح اليوم', desc: 'يتصفر 12 ليلاً', ops: 'عمليات اليوم', icon: '📅' }, weekly: { title: 'ربح الأسبوع', desc: 'من السبت', ops: 'عمليات الأسبوع', icon: '🗓️' }, monthly: { title: 'ربح الشهر', desc: 'هذا الشهر', ops: 'عمليات الشهر', icon: '📆' }, total: { title: 'الربح الكلي', desc: 'منذ البداية', ops: 'كل العمليات', icon: '📊' } }; const last7Days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d }).reverse(); const chartData = last7Days.map(d => { const daySales = sales.filter(s => new Date(s.created_at).toDateString() === d.toDateString()); return { day: d.toLocaleDateString('ar-EG', { weekday: 'short' }), profit: daySales.reduce((a, b) => a + (+b.profit || 0), 0) } }); const maxChart = Math.max(...chartData.map(c => c.profit), 1); const filteredMeds = meds.filter(m => { const ms = m.name.toLowerCase().includes(medSearch.toLowerCase()); const mc = categoryFilter === 'الكل' || (m.category || 'أدوية') === categoryFilter; return ms && mc }); const selectedCount = Object.keys(selectedForSale).length; const shopLink = ph ? `${window.location.origin}/p/${ph.username}` : ''; const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shopLink)}`;

    function handlePrintQR() {
        if (!ph) return
        const highResQR = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(shopLink)}`
        const w = window.open('', '_blank')
        if (!w) return setToast({ type: 'error', msg: 'السماح بالنوافذ المنبثقة مطلوب للطباعة' })
        w.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>طباعة QR - ${ph.name}</title>
          <style>
            body{ font-family:sans-serif; text-align:center; padding:30px; direction:rtl; background:white; }
        .card{ border:4px solid #16a34a; border-radius:28px; padding:35px; max-width:520px; margin:0 auto; }
        .icon{ width:60px; height:60px; background:linear-gradient(to bottom right,#16a34a,#10b981); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 15px; }
            h1{ color:#14532d; font-size:34px; margin:0; font-weight:900; }
            h2{ color:#333; font-size:20px; margin:12px 0 25px; font-weight:700; }
        .qr-box{ background:white; padding:12px; border-radius:20px; border:2px dashed #16a34a; display:inline-block; }
        .qr-box img{ width:360px; height:360px; display:block; }
        .link{ margin-top:18px; font-family:monospace; font-size:13px; color:#555; word-break:break-all; background:#f8fafc; padding:10px; border-radius:10px; border:1px solid #eee; }
        .footer{ margin-top:22px; background:linear-gradient(to right,#16a34a,#15803d); color:white; padding:16px; border-radius:14px; font-weight:900; line-height:1.6; }
        .print-btn{ margin-top:25px; background:#111827; color:white; padding:14px 35px; border:none; border-radius:999px; font-size:16px; font-weight:900; cursor:pointer; }
            @media print{.print-btn{display:none;} body{padding:0;} }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">💊</div>
            <h1>${ph.name}</h1>
            <h2>اطلب دواءك الآن - امسح الكود</h2>
            <div class="qr-box"><img src="${highResQR}" /></div>
            <div class="link">${shopLink}</div>
            <div class="footer">خدمة التوصيل متاحة الآن<br/>امسح الكود لطلب الدواء عبر واتساب</div>
          </div>
          <button class="print-btn" onclick="window.print()">🖨️ اطبع الآن</button>
          <script>setTimeout(()=>window.print(), 600)</script>
        </body>
      </html>
    `)
        w.document.close()
    }

    if (blockedPharm) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
                <div className="bg-white rounded-[32px] p-10 max-w-sm w-full text-center shadow-2xl border-2 border-red-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-3xl">🚫</div>
                    <div className="font-black text-xl mt-5">تم إيقاف حسابك</div>
                    <div className="text-sm text-gray-600 mt-4 leading-7 whitespace-pre-line bg-red-50 border border-red-100 rounded-2xl p-4">{blockedPharm}</div>
                    <div className="mt-6 grid gap-2">
                        <button onClick={() => { localStorage.clear(); nav('/login') }} className="bg-black text-white p-3.5 rounded-full font-bold text-sm">تسجيل خروج</button>
                        <a href="https://wa.me/967775443254" className="bg-green-500 text-white p-3.5 rounded-full font-bold text-sm">📞 تواصل مع الإدارة - واتساب</a>
                    </div>
                </div>
            </div>
        )
    }

    if (!ph) return <div className="p-10 text-center">تحميل...</div>

    return (
        <div dir="rtl" className="min-h-screen bg-[#f8fafc] p-3 md:p-5">
            <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto" />
            {toast && <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl text-sm font-black backdrop-blur ${toast.type === 'error' ? 'bg-red-600' : 'bg-[#111827]'} text-white`}>{toast.msg}</div>}

            <div className="max-w-7xl mx-auto space-y-5">
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-4 md:p-5 flex justify-between items-center shadow-sm border border-gray-100 sticky top-3 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-green-600/20">💊</div>
                        <div><div className="font-black text-[15px] flex items-center gap-2">{ph.name} {newOrderCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-full animate-pulse">🔔 {newOrderCount} طلب جديد</span>}</div><div className="text-[11px] text-gray-500">لوحة تحكم الصيدلية • {ph.username}</div></div>
                    </div>
                    <button onClick={() => { localStorage.clear(); nav('/login') }} className="bg-gray-50 hover:bg-red-50 hover:text-red-600 border px-4 py-2 rounded-full text-xs font-bold transition">خروج</button>
                </div>

                {lowStock.length > 0 && <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-[20px] p-4 text-sm font-bold text-red-700 flex items-center gap-2"><span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">!</span> تنبيه: {lowStock.length} أصناف على وشك النفاد: {lowStock.map(m => m.name).join('، ')}</div>}

                <div className="relative bg-[#111827] rounded-[24px] p-5 flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/20 rounded-full blur-[50px]"></div>
                    <div className="relative flex items-center gap-4 flex-1 w-full">
                        <div className="bg-white p-2 rounded-2xl shadow-lg"><img src={qrLink} className="w-16 h-16 rounded-xl" /></div>
                        <div className="flex-1 min-w-0"><div className="text-[11px] text-white/50">رابط متجرك للزبائن</div><div className="font-mono text-[12px] bg-white/10 border border-white/10 p-2.5 rounded-xl text-white truncate mt-1.5">{shopLink}</div></div>
                    </div>
                    <div className="relative flex gap-2 w-full md:w-auto flex-wrap">
                        <a href={shopLink} target="_blank" className="flex-1 md:flex-none bg-white text-black px-6 py-3 rounded-full text-xs font-black text-center hover:bg-gray-100">فتح المتجر</a>
                        <button onClick={() => { navigator.clipboard.writeText(shopLink); setToast({ type: 'success', msg: 'تم نسخ الرابط ✅' }) }} className="flex-1 md:flex-none bg-white/10 border border-white/10 text-white px-6 py-3 rounded-full text-xs font-bold hover:bg-white/20">📋 نسخ</button>
                        <button onClick={handlePrintQR} className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full text-xs font-black shadow-lg shadow-green-500/20 transition">🖨️ طباعة الـ QR</button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white border rounded-[20px] p-3">
                    <div className="text-xs font-black text-gray-600 flex items-center gap-2"><span className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center">📊</span> طريقة عرض الأرباح</div>
                    <div className="bg-[#f8fafc] border rounded-full p-1 flex text-[11px] font-black"><button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded-full transition ${viewMode === 'daily' ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:text-black'}`}>يومي</button><button onClick={() => setViewMode('weekly')} className={`px-4 py-2 rounded-full transition ${viewMode === 'weekly' ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:text-black'}`}>أسبوعي</button><button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded-full transition ${viewMode === 'monthly' ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:text-black'}`}>شهري</button><button onClick={() => setViewMode('total')} className={`px-4 py-2 rounded-full transition ${viewMode === 'total' ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:text-black'}`}>كلي</button></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <button onClick={() => setShowProfitModal(true)} className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 rounded-[22px] p-5 text-white shadow-lg shadow-green-600/20 text-right group hover:scale-[1.02] transition">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full"></div>
                        <div className="relative text-[11px] opacity-90 flex items-center gap-1.5">{modeLabels[viewMode].icon} {modeLabels[viewMode].title} • {modeLabels[viewMode].desc}</div><div className="relative text-2xl font-black mt-2">{filteredProfit.toLocaleString()} <span className="text-sm font-bold">ر.ي</span></div><div className="relative text-[10px] bg-white/15 inline-block px-2 py-1 rounded-full mt-2">اضغط للتفاصيل</div>
                    </button>
                    <button onClick={() => setShowSalesModal(true)} className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100 text-right hover:shadow-md hover:border-gray-200 transition text-right"><div className="text-[11px] text-gray-500 flex items-center gap-1.5">📦 {modeLabels[viewMode].ops}</div><div className="text-2xl font-black mt-2">{filteredSales.length}</div><div className="text-[11px] text-blue-600 mt-2 bg-blue-50 inline-block px-2.5 py-1 rounded-full">عرض كل العمليات</div></button>
                    <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="text-[11px] text-gray-500">💰 الربح الكلي</div><div className="text-xl font-black mt-2">{totalProfit.toLocaleString()} ر.ي</div><div className="text-[10px] text-gray-400 mt-2">منذ بداية النظام</div></div>
                    <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="text-[11px] text-gray-500">📊 المخزون / الطلبات</div><div className="text-2xl font-black mt-2">{meds.length} <span className="text-sm text-gray-400">/</span> {orders.length}</div><div className="text-[10px] text-gray-400 mt-2">{lowStock.length} تحتاج إعادة طلب</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-4"><div className="font-black text-sm">📈 مبيعات آخر 7 أيام</div><div className="text-[10px] bg-gray-50 border px-2.5 py-1 rounded-full">الربح بالريال</div></div><div className="flex items-end gap-2 h-36 bg-[#f8fafc] rounded-2xl p-3 border">{chartData.map((c, i) => <div key={i} className="flex-1 flex flex-col items-center gap-2"><div className="w-full bg-green-100 rounded-full overflow-hidden flex items-end justify-center" style={{ height: `100%` }}><div className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-full transition-all" style={{ height: `${(c.profit / maxChart) * 100}%`, minHeight: c.profit > 0 ? '14px' : '2px' }}></div></div><div className="text-[10px] font-bold text-gray-500">{c.day}</div><div className="text-[9px] text-gray-400">{c.profit > 0 ? c.profit : ''}</div></div>)}</div></div>
                    <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100"><div className="font-black text-sm mb-4">🔥 الأكثر مبيعاً</div>{topSelling.length === 0 ? <div className="bg-[#f8fafc] border border-dashed rounded-2xl p-8 text-center"><div className="text-2xl">📭</div><div className="text-xs text-gray-400 mt-2">لا يوجد مبيعات بعد</div></div> : topSelling.map((s, i) => <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 group"><span className="flex items-center gap-2.5"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-200' : i === 2 ? 'bg-orange-200' : 'bg-gray-50'}`}>{i + 1}</span><span className="font-bold text-sm">{s.medicine_name}</span></span><span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-black">{s.qty}</span></div>)}</div>
                </div>

                <div className="bg-white rounded-[22px] shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 border-b flex justify-between items-center"><div className="font-black text-sm flex items-center gap-2"><span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">📦</span> الطلبات الواردة ({orders.length})</div><button onClick={() => { setNewOrderCount(0); loadOrders() }} className="bg-white border shadow-sm px-4 py-2 rounded-full text-xs font-bold hover:bg-black hover:text-white transition">🔄 تحديث</button></div>
                    {orders.length === 0 && <div className="p-16 text-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-2xl">📭</div><div className="text-gray-400 text-sm mt-3">لا يوجد طلبات حالياً</div></div>}
                    <div className="divide-y max-h-[900px] overflow-auto">
                        {orders.map(o => (
                            <div key={o.id} className="p-5 bg-[#fffef8] hover:bg-yellow-50/50 transition">
                                <div className="flex justify-between gap-3"><div><div className="font-black text-sm flex items-center gap-2">{o.customer_name} <span className="bg-[#111827] text-white text-[10px] px-2 py-0.5 rounded-full">{o.customer_phone}</span></div><div className="text-[11px] text-gray-600 mt-2 bg-white border inline-flex items-center gap-2 px-3 py-1.5 rounded-full">🏠 {o.address || 'بدون عنوان'} • 💳 {o.payment_method} • ⏰ {new Date(o.created_at).toLocaleString('ar-EG')}</div></div><div className="text-right"><div className="font-black text-green-600 text-lg">{o.total || 0} ر.ي</div><div className="text-[10px] text-gray-400">{orderItems[o.id]?.length || 0} أدوية</div></div></div>
                                <div className="mt-4 grid md:grid-cols-2 gap-3">
                                    <div className="bg-white border rounded-2xl p-3">
                                        {orderItems[o.id]?.length > 0 ? orderItems[o.id]?.map((it, i) => <div key={i} className="flex justify-between text-[13px] py-2 border-b last:border-0"><span className="font-medium">{it.medicine_name} <span className="text-gray-400">x{it.qty}</span></span><span className="font-bold">{it.price * it.qty} ر.ي</span></div>) : <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-xl font-bold">📸 طلب وصفة طبية فقط - بدون سلة</div>}
                                    </div>
                                    {(o.prescription_url || o.receipt_url) && (
                                        <div className="bg-white border rounded-2xl p-3">
                                            <div className="font-black text-xs mb-2">📎 المرفقات:</div>
                                            <div className="flex gap-3">
                                                {o.prescription_url && (
                                                    <a href={o.prescription_url} target="_blank" className="group flex-1">
                                                        <img src={o.prescription_url} className="w-full h-36 rounded-2xl border-2 border-orange-200 object-cover group-hover:scale-[1.02] transition" />
                                                        <div className="text-[11px] text-center mt-2 bg-orange-500 text-white rounded-full py-1.5 font-black group-hover:bg-orange-600">📸 فتح الوصفة</div>
                                                    </a>
                                                )}
                                                {o.receipt_url && (
                                                    <a href={o.receipt_url} target="_blank" className="group flex-1">
                                                        <img src={o.receipt_url} className="w-full h-36 rounded-2xl border-2 border-blue-200 object-cover group-hover:scale-[1.02] transition" />
                                                        <div className="text-[11px] text-center mt-2 bg-blue-600 text-white rounded-full py-1.5 font-black">🧾 فتح السند</div>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-4"><button onClick={() => setConfirmModal({ open: true, order: o })} className="bg-[#111827] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-black shadow transition">✅ تم التوصيل وحساب الربح</button><a href={`https://wa.me/967${o.customer_phone?.replace(/^0/, '')}`} target="_blank" className="bg-[#25D366] hover:bg-[#1ea952] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow transition">واتساب</a></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 font-black text-sm mb-4"><span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">🏦</span> حسابات التحويل البنكي للزبائن</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-[#f8fafc] p-3 rounded-2xl border">
                        <select value={accForm.bank_name} onChange={e => setAccForm({ ...accForm, bank_name: e.target.value })} className="border border-gray-200 p-3.5 rounded-xl text-sm bg-white"><option>الكريمي</option><option>النجم</option><option>بن دول</option><option>العمقي</option><option>الكاش</option><option>بنك حضرموت</option></select>
                        <input value={accForm.account_number} onChange={e => setAccForm({ ...accForm, account_number: e.target.value })} placeholder="رقم الحساب" className="border p-3.5 rounded-xl text-sm" />
                        <input value={accForm.account_name} onChange={e => setAccForm({ ...accForm, account_name: e.target.value })} placeholder="باسم من" className="border p-3.5 rounded-xl text-sm" />
                        <button onClick={async () => { if (!accForm.account_number) return setToast({ type: 'error', msg: 'اكتب رقم الحساب' }); if (accForm.id) { await supabase.from('payment_accounts').update({ bank_name: accForm.bank_name, account_number: accForm.account_number, account_name: accForm.account_name }).eq('id', accForm.id) } else { await supabase.from('payment_accounts').insert({ pharmacy_id: pharmacyId, bank_name: accForm.bank_name, account_number: accForm.account_number, account_name: accForm.account_name }) } setAccForm({ id: null, bank_name: 'الكريمي', account_number: '', account_name: '' }); loadAll() }} className="bg-blue-600 text-white p-3.5 rounded-xl text-sm font-black">{accForm.id ? '💾 حفظ التعديل' : '➕ إضافة حساب'}</button>
                    </div>
                    <div className="mt-4 grid md:grid-cols-2 gap-2">{accounts.map(a => <div key={a.id} className="flex justify-between items-center border bg-blue-50/50 p-3.5 rounded-2xl text-sm"><div><span className="font-black text-blue-700">{a.bank_name}</span> • {a.account_number}</div><div className="flex gap-1.5"><button onClick={() => setAccForm({ id: a.id, bank_name: a.bank_name, account_number: a.account_number, account_name: a.account_name })} className="bg-white border px-3 py-1.5 rounded-full text-[11px]">تعديل</button><button onClick={async () => { if (confirm('حذف الحساب؟')) { await supabase.from('payment_accounts').delete().eq('id', a.id); loadAll() } }} className="bg-white border px-3 py-1.5 rounded-full text-[11px] text-red-600">حذف</button></div></div>)}</div>
                </div>

                <div className="bg-white rounded-[22px] shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-5 border-b bg-[#f8fafc]/70 flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="font-black text-sm flex items-center gap-2"><span className="w-8 h-8 bg-[#111827] text-white rounded-full flex items-center justify-center text-xs">💊</span> قائمة الأدوية ({filteredMeds.length} / {meds.length})</div>
                            {selectedCount > 0 && <button onClick={() => setBulkSellModal({ open: true })} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2 rounded-full text-xs font-black">🛒 بيع المحدد ({selectedCount})</button>}
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder="بحث باسم الدواء..." className="flex-1 border rounded-full px-4 py-2.5 text-xs" />
                            <button onClick={() => setAddModal({ open: true, step: 1, category: 'أدوية', rows: [{ name: '', qty: '', buy: '', sell: '' }] })} className="bg-[#111827] text-white px-5 py-2.5 rounded-full text-xs font-black">➕ إضافة دواء</button>
                        </div>
                    </div>
                    <div className="p-3 flex gap-2 overflow-auto border-b bg-white">
                        <button onClick={() => setCategoryFilter('الكل')} className={`px-4 py-2 rounded-full text-xs font-black border ${categoryFilter === 'الكل' ? 'bg-[#111827] text-white' : 'bg-[#f8fafc]'}`}>الكل ({meds.length})</button>
                        {CATEGORIES.map(c => { const co = meds.filter(m => (m.category || 'أدوية') === c).length; return <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-2 rounded-full text-xs font-black border ${categoryFilter === c ? 'bg-blue-600 text-white' : 'bg-[#f8fafc]'}`}>{c} ({co})</button> })}
                    </div>
                    <div className="divide-y">
                        <div className="grid grid-cols-12 gap-2 p-3.5 bg-[#f8fafc] text-[11px] font-black text-gray-500"><div className="col-span-1 text-center">✓</div><div className="col-span-4">الاسم</div><div className="col-span-1 text-center">الكمية</div><div className="col-span-2 text-center hidden md:block">شراء</div><div className="col-span-2 text-center">بيع</div><div className="col-span-2 text-center">إجراء</div></div>
                        {filteredMeds.map(m => {
                            const sel = !!selectedForSale[m.id];
                            return (
                                <div key={m.id} className={`grid grid-cols-12 gap-2 p-4 text-[13px] items-center ${sel ? 'bg-green-50 border-r-4 border-r-green-500' : ''}`}>
                                    <div className="col-span-1 text-center"><input type="checkbox" checked={sel} onChange={() => toggleSelectMed(m)} className="w-5 h-5" /></div>
                                    <div className="col-span-4"><div className="font-bold">{m.name}</div><span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{m.category || 'أدوية'}</span></div>
                                    <div className="col-span-1 text-center font-bold">{m.quantity}</div>
                                    <div className="col-span-2 text-center hidden md:block">{m.buy_price} ر.ي</div>
                                    <div className="col-span-2 text-center font-black text-green-600">{m.sell_price} ر.ي</div>
                                    <div className="col-span-2 text-center flex gap-1 justify-center">
                                        <button onClick={() => openEdit(m)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-blue-100 transition">✏️ تعديل</button>
                                        <button onClick={() => delMed(m.id)} className="bg-red-50 text-red-600 px-3.5 py-1.5 rounded-full text-[11px]">حذف</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {editModal.open && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3" onClick={() => setEditModal({ open: false, id: null, name: '', qty: '', buy: '', sell: '', category: 'أدوية' })}>
                    <div className="bg-white rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl border" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-[#f8fafc]">
                            <div className="font-black">✏️ تعديل الدواء</div>
                            <button onClick={() => setEditModal({ open: false, id: null, name: '', qty: '', buy: '', sell: '', category: 'أدوية' })} className="w-8 h-8 bg-white border rounded-full">✕</button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <div className="text-[11px] font-bold text-gray-500 mb-1">اسم الدواء</div>
                                <input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} className="w-full border p-3.5 rounded-xl text-sm" placeholder="اسم الدواء" />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-gray-500 mb-1">القسم</div>
                                <select value={editModal.category} onChange={e => setEditModal({ ...editModal, category: e.target.value })} className="w-full border p-3.5 rounded-xl text-sm bg-white">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div><div className="text-[11px] font-bold text-gray-500 mb-1">الكمية</div><input type="number" value={editModal.qty} onChange={e => setEditModal({ ...editModal, qty: e.target.value })} className="w-full border p-3.5 rounded-xl text-sm" /></div>
                                <div><div className="text-[11px] font-bold text-gray-500 mb-1">سعر الشراء</div><input type="number" value={editModal.buy} onChange={e => setEditModal({ ...editModal, buy: e.target.value })} className="w-full border p-3.5 rounded-xl text-sm" /></div>
                                <div><div className="text-[11px] font-bold text-gray-500 mb-1">سعر البيع</div><input type="number" value={editModal.sell} onChange={e => setEditModal({ ...editModal, sell: e.target.value })} className="w-full border p-3.5 rounded-xl text-sm" /></div>
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-2">
                            <button onClick={() => setEditModal({ open: false, id: null, name: '', qty: '', buy: '', sell: '', category: 'أدوية' })} className="flex-1 bg-[#f8fafc] border p-3.5 rounded-full text-sm font-bold">إلغاء</button>
                            <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full text-sm font-black">💾 حفظ التعديل</button>
                        </div>
                    </div>
                </div>
            )}

            {addModal.open && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3" onClick={() => setAddModal({ open: false, step: 1, category: 'أدوية', rows: [{ name: '', qty: '', buy: '', sell: '' }] })}>
                    <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border" onClick={e => e.stopPropagation()}>
                        {addModal.step === 1 ? <div className="p-7"><div className="font-black text-xl text-center">اختر القسم</div><div className="grid grid-cols-2 gap-3 mt-7">{CATEGORIES.map(cat => <button key={cat} onClick={() => setAddModal(s => ({ ...s, category: cat, step: 2 }))} className="border-2 rounded-[20px] p-6 bg-[#f8fafc]"><div className="text-3xl">{cat === 'أدوية' ? '💊' : cat === 'أدوات تجميل' ? '💄' : cat === 'أدوات جراحة' ? '🩺' : '📦'}</div><div className="font-black text-sm mt-3">{cat}</div></button>)}</div></div>
                            : <><div className="p-5 border-b flex justify-between"><div className="font-black">➕ إضافة في: {addModal.category}</div><button onClick={() => setAddModal(s => ({ ...s, step: 1 }))} className="text-xs border px-3 py-1.5 rounded-full">← الأقسام</button></div><div className="p-4 space-y-3 max-h-[60vh] overflow-auto">{addModal.rows.map((row, i) => <div key={i} className="grid grid-cols-12 gap-2"><input value={row.name} onChange={e => setAddModal(s => { const r = [...s.rows]; r[i].name = e.target.value; return { ...s, rows: r } })} placeholder="اسم الدواء" className="col-span-5 border p-3 rounded-xl" /><input value={row.qty} type="number" onChange={e => setAddModal(s => { const r = [...s.rows]; r[i].qty = e.target.value; return { ...s, rows: r } })} placeholder="الكمية" className="col-span-2 border p-3 rounded-xl" /><input value={row.buy} type="number" onChange={e => setAddModal(s => { const r = [...s.rows]; r[i].buy = e.target.value; return { ...s, rows: r } })} placeholder="شراء" className="col-span-2 border p-3 rounded-xl" /><input value={row.sell} type="number" onChange={e => setAddModal(s => { const r = [...s.rows]; r[i].sell = e.target.value; return { ...s, rows: r } })} placeholder="بيع" className="col-span-2 border p-3 rounded-xl" /><button onClick={() => setAddModal(s => { const r = s.rows.filter((_, idx) => idx !== i); return { ...s, rows: r.length ? r : [{ name: '', qty: '', buy: '', sell: '' }] } })} className="col-span-1">✕</button></div>)}<button onClick={() => setAddModal(s => ({ ...s, rows: [...s.rows, { name: '', qty: '', buy: '', sell: '' }] }))} className="w-full border-2 border-dashed rounded-2xl p-3.5 text-xs">+ إضافة سطر</button></div><div className="p-4 border-t flex gap-2"><button onClick={() => setAddModal({ open: false, step: 1, category: 'أدوية', rows: [{ name: '', qty: '', buy: '', sell: '' }] })} className="flex-1 bg-[#f8fafc] border p-3.5 rounded-full">إلغاء</button><button onClick={saveBulkMeds} className="flex-[2] bg-[#111827] text-white p-3.5 rounded-full">✅ إضافة</button></div></>}
                    </div>
                </div>
            )}

            {bulkSellModal.open && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3"><div className="bg-white rounded-[28px] w-full max-w-lg overflow-hidden"><div className="p-5 border-b flex justify-between"><div className="font-black">🛒 تأكيد بيع</div><button onClick={() => setBulkSellModal({ open: false })}>✕</button></div><div className="p-4 space-y-2 max-h-[60vh] overflow-auto">{Object.keys(selectedForSale).map(id => { const med = meds.find(m => m.id === id); return <div key={id} className="flex justify-between border rounded-2xl p-3"><div>{med?.name}</div><input type="number" value={selectedForSale[id]} onChange={e => updateSaleQty(id, +e.target.value)} className="w-16 border rounded-xl p-2" /></div> })}</div><div className="p-5 flex gap-2"><button onClick={() => setBulkSellModal({ open: false })} className="flex-1 border p-3.5 rounded-full">إلغاء</button><button onClick={confirmBulkSell} disabled={bulkSellLoading} className="flex-1 bg-green-600 text-white p-3.5 rounded-full font-black">{bulkSellLoading ? 'جاري...' : '✅ بيع وطباعة'}</button></div></div></div>)}

            {invoice && (<div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3"><div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden"><div className="p-7"><div className="text-center border-b pb-5"><div className="font-black">{ph.name}</div><div className="text-[11px]">فاتورة #{invoice.invoiceNo}</div></div><div className="mt-5">{invoice.items.map((it, i) => <div key={i} className="flex justify-between py-2 border-b"><div>{it.name} x{it.qty}</div><div>{it.total} ر.ي</div></div>)}</div><div className="mt-5 bg-[#111827] text-white rounded-2xl p-4 flex justify-between"><span>الإجمالي:</span><span>{invoice.total} ر.ي</span></div></div><div className="p-4 flex gap-2"><button onClick={() => setInvoice(null)} className="flex-1 border p-3.5 rounded-full">إغلاق</button><button onClick={() => window.print()} className="flex-1 bg-[#111827] text-white p-3.5 rounded-full">🖨️ طباعة</button></div></div></div>)}

            {confirmModal.open && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden"><div className="p-7 text-center bg-green-500 text-white"><div className="font-black">تأكيد التوصيل؟</div></div><div className="p-5 flex gap-2"><button onClick={() => setConfirmModal({ open: false, order: null })} className="flex-1 border p-3.5 rounded-full">إلغاء</button><button onClick={markDone} disabled={confirmLoading} className="flex-1 bg-green-600 text-white p-3.5 rounded-full font-black">{confirmLoading ? 'جاري...' : '✅ نعم'}</button></div></div></div>)}
        </div>
    )
}