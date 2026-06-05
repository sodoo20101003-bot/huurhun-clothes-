-- HUURHUN дэлгүүрийн шинэ боломжуудын баганууд
-- Supabase → SQL Editor дотор бүхэлд нь хуулж RUN дарна

-- Захиалга бүрт админ тусгай мессеж
alter table orders add column if not exists status_message text;

-- Бараа дээр "2 ширхэгийг тэр үнээр" (ижил бараа)
alter table products add column if not exists pair_price numeric;

-- Бараа дээр "Бэлэг" тэмдэглэгээ
alter table products add column if not exists gift_note text;

-- АНГИЛАЛ дээр "2 авбал" багц үнэ (өөр өөр бараа байж болно)
alter table categories add column if not exists pair_price numeric;

-- УРАМШУУЛАЛ дээр зураг
alter table promotions add column if not exists image text;

-- Хуучин нэр устгах (хэрэв байсан бол)
alter table products drop column if exists promo_2for1;

-- ====================================
-- Live chat — хэрэглэгч ↔ админ чат
-- ====================================

-- Чат session — хэрэглэгч нэг бүрд нэг session
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_name text,
  user_email text,
  user_phone text,
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  unread_by_admin int default 0,
  unread_by_user int default 0
);

-- Чат мессеж
create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  sender text check (sender in ('user', 'admin')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Realtime идэвхжүүлэх
alter publication supabase_realtime add table chat_sessions;
alter publication supabase_realtime add table chat_messages;

-- RLS — энгийн хэрэглэгч уншиж бичих боломжтой (chat бол public функцтэй)
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "anyone can create session" on chat_sessions;
create policy "anyone can create session" on chat_sessions
  for insert with check (true);

drop policy if exists "anyone can read session" on chat_sessions;
create policy "anyone can read session" on chat_sessions
  for select using (true);

drop policy if exists "anyone can update session" on chat_sessions;
create policy "anyone can update session" on chat_sessions
  for update using (true);

drop policy if exists "anyone can create message" on chat_messages;
create policy "anyone can create message" on chat_messages
  for insert with check (true);

drop policy if exists "anyone can read message" on chat_messages;
create policy "anyone can read message" on chat_messages
  for select using (true);

-- ====================================
-- Борлуулалтын дэвтэр (Sales Ledger)
-- Зарагдсан бараа болгон 1 бичлэг. Тайлан эндээс тоологдоно.
-- ====================================
create table if not exists sales (
  id bigserial primary key,
  product_id uuid,
  product_name text not null,
  size text,
  color text,
  qty int not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  channel text not null check (channel in ('web', 'shop')), -- web=онлайн, shop=дэлгүүр
  payment_method text,  -- khan, golomt, tdb, state, xac, qpay, cash, card гэх мэт
  order_code text,      -- вэб захиалгын код (shop бол хоосон)
  created_at timestamptz default now()
);

create index if not exists sales_created_at_idx on sales(created_at);
create index if not exists sales_channel_idx on sales(channel);

alter table sales enable row level security;
-- Зөвхөн service role (admin API) бичнэ, admin унших
drop policy if exists "service can do all sales" on sales;
create policy "service can do all sales" on sales for all using (true) with check (true);
