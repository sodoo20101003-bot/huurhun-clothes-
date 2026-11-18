-- ============================================
--  Нүүрний баннер (hero slider) хүснэгт
--  Supabase → SQL Editor дээр энэ бүгдийг copy хийгээд RUN дарна
-- ============================================

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  image text not null,          -- баннер зураг (заавал)
  title text,                   -- гарчиг (заавал биш)
  subtitle text,                -- дэд гарчиг (заавал биш)
  link text,                    -- дарахад очих холбоос (заавал биш)
  sort int not null default 0,  -- дараалал (бага нь түрүүнд)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.hero_banners enable row level security;

-- Хүн бүр баннер уншиж болно (нүүр хуудсанд харуулахад)
drop policy if exists "hero_banners_read" on public.hero_banners;
create policy "hero_banners_read"
  on public.hero_banners for select
  using (true);

-- Нэвтэрсэн хэрэглэгч (админ) нэмэх/засах/устгах
drop policy if exists "hero_banners_write" on public.hero_banners;
create policy "hero_banners_write"
  on public.hero_banners for all
  to authenticated
  using (true) with check (true);
