-- 🏷 БРЭНД СИСТЕМ
-- ====================================

-- 1. brands хүснэгт
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  sort int default 0,
  created_at timestamptz default now()
);
create index if not exists brands_sort_idx on brands(sort);

alter table brands enable row level security;
drop policy if exists "public read brands" on brands;
create policy "public read brands" on brands for select using (true);
drop policy if exists "public write brands" on brands;
create policy "public write brands" on brands for all using (true) with check (true);

-- 2. products дээр brand_id foreign key
alter table products add column if not exists brand_id uuid references brands(id) on delete set null;
create index if not exists products_brand_id_idx on products(brand_id);

-- 3. Анхдагч брэндүүдийг нэмэх
insert into brands (name, sort) values
  ('Nike', 1),
  ('Adidas', 2),
  ('Puma', 3),
  ('Dior', 4)
on conflict (name) do nothing;
