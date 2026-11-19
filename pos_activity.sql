-- ============================================
--  POS үйлдлийн бүртгэл (audit log)
--  Supabase → SQL Editor дээр copy хийгээд RUN
-- ============================================
create table if not exists public.pos_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  action text not null,          -- sale | restock | add_product | add_variant
  branch text,                   -- branch1 | branch2 | online
  detail text,
  amount numeric,
  qty int,
  created_at timestamptz not null default now()
);

create index if not exists pos_activity_created_idx on public.pos_activity (created_at desc);

alter table public.pos_activity enable row level security;

-- Нэвтэрсэн (админ) унших
drop policy if exists "pos_activity_read" on public.pos_activity;
create policy "pos_activity_read" on public.pos_activity for select to authenticated using (true);
-- Бичилт нь сервер (service_role)-оор ордог тул policy шаардлагагүй

notify pgrst, 'reload schema';
