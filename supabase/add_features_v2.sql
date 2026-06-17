-- ====================================
-- 4 том шинэчлэлт
-- ====================================

-- 1. Кассын ажилтны эрх (cashier)
alter table profiles add column if not exists is_cashier boolean default false;

-- 2. Брэнд (Nike, Puma...) барааны талбар
alter table products add column if not exists brand text;
create index if not exists products_brand_idx on products(brand);

-- 3. Холимог төлбөр (card + cash хослол) sales-д
alter table sales add column if not exists payments jsonb;
-- Жишээ: [{"method": "card", "amount": 50000}, {"method": "cash", "amount": 30000}]

-- 4. Ачаа орох түүх
create table if not exists restock_logs (
  id bigserial primary key,
  product_id uuid references products(id) on delete cascade,
  product_name text not null,
  size text,
  color text,
  qty int not null,
  note text,
  created_by text,
  created_at timestamptz default now()
);
create index if not exists restock_logs_created_at_idx on restock_logs(created_at);
create index if not exists restock_logs_product_id_idx on restock_logs(product_id);

alter table restock_logs enable row level security;
drop policy if exists "service all restock" on restock_logs;
create policy "service all restock" on restock_logs for all using (true) with check (true);
