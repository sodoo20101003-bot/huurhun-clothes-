-- ============================================
--  Нөөцийг АТОМААР нэмэх функц (ачаа нэмэх race-ийг засна)
--  Supabase → SQL Editor дээр copy хийгээд RUN
-- ============================================

create or replace function increment_variant_stock(p_variant_id uuid, p_branch text, p_qty int)
returns void
language sql
security definer
as $$
  update public.product_variants
  set stock_branch1 = coalesce(stock_branch1, 0) + (case when p_branch = 'branch1' then p_qty else 0 end),
      stock_branch2 = coalesce(stock_branch2, 0) + (case when p_branch = 'branch2' then p_qty else 0 end),
      stock        = coalesce(stock_branch1, 0) + coalesce(stock_branch2, 0) + p_qty
  where id = p_variant_id;
$$;

grant execute on function increment_variant_stock(uuid, text, int) to service_role, authenticated, anon;

notify pgrst, 'reload schema';
