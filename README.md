
# 💊 نظام صيدليات حضرموت - Aliyat Hadhramout

نظام متكامل لإدارة الصيدليات، المبيعات، الطلبات، والمتجر الإلكتروني لكل صيدلية برابط خاص و QR.

*الموقع الحي:* https://aliyat-hadhramout.vercel.app

### ✨ المميزات

*لوحة تحكم الصيدلية `/dashboard`*
- 📊 أرباح يومي / أسبوعي / شهري / كلي
- 📈 مبيعات آخر 7 أيام
- 🔥 الأكثر مبيعاً
- 📦 طلبات لحظية Realtime + تنبيه صوتي
- 💰 حساب الربح تلقائي `سعر البيع - سعر الشراء`
- 🛒 بيع مباشر مع فاتورة وطباعة
- 🏦 حسابات التحويل (الكريمي، النجم...)
- 💊 إدارة أدوية (إضافة جماعية، تعديل، حذف، أقسام، تنبيه النواقص)

*متجر الزبون `/p/:username`*
- تصفح وطلب مع رفع الوصفة وسند التحويل

*لوحة المدير `/admin`*
- إنشاء / تعديل / حذف / إيقاف الصيدليات
- اشتراك 30 يوم ينتهي تلقائي

### 🛠️ التقنيات
React + Vite + Tailwind CSS + Supabase + Vercel

### 🗄️ قاعدة البيانات - شغل هذا في Supabase SQL مرة واحدة
create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  name text not null,
  password text not null,
  is_active boolean default true,
  subscription_status text default 'active',
  end_date timestamp,
  created_at timestamp default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  name text not null,
  quantity int default 0,
  buy_price numeric default 0,
  sell_price numeric default 0,
  category text default 'أدوية',
  created_at timestamp default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  customer_name text,
  customer_phone text,
  address text,
  payment_method text,
  total numeric,
  prescription_url text,
  receipt_url text,
  created_at timestamp default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  medicine_id uuid references public.medicines(id),
  medicine_name text,
  qty int,
  price numeric
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  medicine_id uuid references public.medicines(id),
  medicine_name text,
  qty int,
  profit numeric,
  total numeric,
  created_at timestamp default now()
);

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete cascade,
  bank_name text,
  account_number text,
  account_name text,
  created_at timestamp default now()
);

alter table public.pharmacies enable row level security;
alter table public.medicines enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sales enable row level security;
alter table public.payment_accounts enable row level security;

drop policy if exists "allow_all" on public.pharmacies;
drop policy if exists "allow_all" on public.medicines;
drop policy if exists "allow_all" on public.orders;
drop policy if exists "allow_all" on public.order_items;
drop policy if exists "allow_all" on public.sales;
drop policy if exists "allow_all" on public.payment_accounts;

create policy "allow_all" on public.pharmacies for all using (true) with check (true);
create policy "allow_all" on public.medicines for all using (true) with check (true);
create policy "allow_all" on public.orders for all using (true) with check (true);
create policy "allow_all" on public.order_items for all using (true) with check (true);
create policy "allow_all" on public.sales for all using (true) with check (true);
create policy "allow_all" on public.payment_accounts for all using (true) with check (true);

create extension if not exists pgcrypto;

create or replace function public.complete_order_delivery(order_id_param uuid)
returns void language plpgsql security definer as $$
declare o record; item record; med record; profit_per_item numeric;
begin
  select * into o from public.orders where id = order_id_param;
  for item in select * from public.order_items where order_id = order_id_param loop
    select * into med from public.medicines where id = item.medicine_id;
    profit_per_item := (coalesce(med.sell_price,0) - coalesce(med.buy_price,0)) * item.qty;
    insert into public.sales (pharmacy_id, medicine_id, medicine_name, qty, profit, total)
    values (o.pharmacy_id, item.medicine_id, med.name, item.qty, profit_per_item, item.qty * coalesce(med.sell_price,0));
    update public.medicines set quantity = quantity - item.qty where id = item.medicine_id;
  end loop;
  delete from public.order_items where order_id = order_id_param;
  delete from public.orders where id = order_id_param;
end;
$$;

create or replace function public.sell_medicine_direct(p_pharmacy_id uuid, p_medicine_id uuid, p_quantity int)
returns void language plpgsql security definer as $$
declare med record; profit_calc numeric;
begin
  select * into med from public.medicines where id = p_medicine_id;
  if coalesce(med.quantity,0) < p_quantity then raise exception 'الكمية غير كافية'; end if;
  profit_calc := (coalesce(med.sell_price,0) - coalesce(med.buy_price,0)) * p_quantity;
  insert into public.sales (pharmacy_id, medicine_id, medicine_name, qty, profit, total)
  values (p_pharmacy_id, p_medicine_id, med.name, p_quantity, profit_calc, p_quantity * coalesce(med.sell_price,0));
  update public.medicines set quantity = quantity - p_quantity where id = p_medicine_id;
end;
$$;
### ⚙️ التشغيل
git clone https://github.com/yourname/aliyat-hadhramout.git
cd aliyat-hadhramout
npm install
أنشئ `.env`:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ADMIN_PASS=admin123
npm run dev
### 🚀 Vercel
1. ارفع على GitHub
2. Vercel > New Project
3. أضف Env Variables الثلاثة
4. Deploy

### 📁 الملفات
src/pages/Dashboard.jsx - لوحة الصيدلية
src/pages/Shop.jsx - متجر الزبون
src/pages/Admin.jsx - لوحة المدير
src/pages/Login.jsx - تسجيل دخول
### 🔐 الدخول
- صيدلية: `/login`
- مدير: `/admin`

تواصل: 775443254
