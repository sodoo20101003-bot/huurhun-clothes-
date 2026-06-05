-- ============================================================
--  huurhun_clothes онлайн дэлгүүр — Supabase схем
--  Supabase Dashboard → SQL Editor дотор бүхэлд нь хуулж RUN дарна.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Шинэ хэрэглэгч бүртгэгдэхэд profile автоматаар үүсгэх
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin эсэхийг шалгах туслах функц (RLS recursion-оос сэргийлнэ)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null default 0,
  discount_percent int not null default 0,
  category_id uuid references categories(id) on delete set null,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCT VARIANTS (хэмжээ / өнгө / үлдэгдэл) ----------
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  stock int not null default 0
);

-- ---------- PROMOTIONS (1+1, дагалдан бараа гэх мэт) ----------
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  badge text,
  title text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,        -- 12 оронтой код (хэрэглэгчид өгөх)
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  customer_name text,
  phone text,
  address text,
  note text,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  qpay_invoice_id text,
  qpay_qr_text text,
  qpay_qr_image text,
  qpay_urls jsonb,
  status_message text,              -- Админ тусгай мессеж (ж: "3-5 цагт хүрнэ")
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders(user_id);
create index if not exists orders_code_idx on orders(order_code);

-- ============================================================
--  RLS (Row Level Security)
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table promotions enable row level security;
alter table orders enable row level security;

-- PROFILES: хэрэглэгч зөвхөн өөрийнхөө мэдээллийг
drop policy if exists "own profile read" on profiles;
create policy "own profile read" on profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Унших: бүгд (анонимоор ч) бараа/ангилал/урамшуулал харна
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "public read variants" on product_variants;
create policy "public read variants" on product_variants for select using (true);
drop policy if exists "public read promotions" on promotions;
create policy "public read promotions" on promotions for select using (true);

-- Бичих/засах/устгах: ЗӨВХӨН admin
drop policy if exists "admin write categories" on categories;
create policy "admin write categories" on categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write products" on products;
create policy "admin write products" on products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write variants" on product_variants;
create policy "admin write variants" on product_variants for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write promotions" on promotions;
create policy "admin write promotions" on promotions for all using (public.is_admin()) with check (public.is_admin());

-- ORDERS: хэрэглэгч өөрийн захиалга харна; admin бүгдийг харж/засна.
-- (Захиалга үүсгэх нь серверт service role-оор хийгддэг тул insert policy шаардлагагүй.)
drop policy if exists "user read own orders" on orders;
create policy "user read own orders" on orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin update orders" on orders;
create policy "admin update orders" on orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete orders" on orders;
create policy "admin delete orders" on orders for delete using (public.is_admin());

-- ============================================================
--  STORAGE (барааны зураг)
--  Доорх bucket-ийг Dashboard → Storage хэсэгт ГАРААР үүсгэнэ:
--    bucket нэр: products,  Public: ON
--  Дараа нь доорх policy-уудыг RUN дарна:
-- ============================================================
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

-- ============================================================
--  ӨӨРИЙГӨӨ ADMIN БОЛГОХ
--  Эхлээд апп дээрээ нэвтэрсний дараа доорх мөрийг (имэйлээ тавьж) RUN:
--    update profiles set is_admin = true where email = 'таны_имэйл@gmail.com';
-- ============================================================
