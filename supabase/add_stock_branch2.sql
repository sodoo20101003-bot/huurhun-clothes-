-- 🏪 Салбар 2-ын үлдэгдэл хадгалах багана
-- Одоо stock = Салбар 1, шинэ stock_branch2 = Салбар 2
-- Нийт үлдэгдэл = stock + stock_branch2

alter table product_variants add column if not exists stock_branch2 integer default 0;

-- Шалгах
select 
  count(*) as total_variants,
  sum(stock) as salbar1_total,
  sum(stock_branch2) as salbar2_total
from product_variants;
