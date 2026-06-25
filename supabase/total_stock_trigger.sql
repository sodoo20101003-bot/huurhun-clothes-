-- 🔒 stock = stock_branch1 + stock_branch2 ҮРГЭЛЖ тэнцүү байх trigger
-- Ингэснээр хуучин код байсан ч бай stock автомат шинэчлэгдэнэ

-- 1. Шинэ stock_branch1 багана нэмэх (хэрэв алга бол)
alter table product_variants add column if not exists stock_branch1 integer default 0;

-- 2. Анх удаа: stock-ийг stock_branch1-д хуулах (хэрэв одоо stock=Салбар1 бол)
-- Зөвхөн нэг удаа ажиллана, давтан ажиллавал данс буруу болохгүй
do $$
begin
  if not exists (select 1 from product_variants where stock_branch1 > 0 limit 1) then
    update product_variants set stock_branch1 = stock;
  end if;
end $$;

-- 3. stock-ийг нийт болгох
update product_variants set stock = coalesce(stock_branch1, 0) + coalesce(stock_branch2, 0);

-- 4. Trigger: branch values өөрчлөгдөх бүрд stock автомат шинэчлэгдэнэ
create or replace function sync_total_stock() returns trigger as $$
begin
  new.stock := coalesce(new.stock_branch1, 0) + coalesce(new.stock_branch2, 0);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_stock on product_variants;
create trigger trg_sync_stock
before insert or update of stock_branch1, stock_branch2 on product_variants
for each row execute function sync_total_stock();

-- 5. Шалгах
select 
  count(*) as total_variants,
  sum(stock) as web_stock,
  sum(stock_branch1) as salbar1,
  sum(stock_branch2) as salbar2,
  sum(stock) - sum(coalesce(stock_branch1,0) + coalesce(stock_branch2,0)) as should_be_zero
from product_variants;
