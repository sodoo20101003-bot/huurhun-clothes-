-- ⚠️ ЭХЛЭЭД хийх: Алдсан Salomon барааг шалгах
select 
  p.name,
  v.size, v.color, v.stock, v.stock_branch1, v.stock_branch2,
  v.id
from product_variants v
join products p on v.product_id = p.id
where p.name ilike '%Salomon%'
order by v.size, v.color;

-- Хэрэв бүх stock_branch1, stock_branch2 = 0 бол → backup-аас restore хийх ёстой

-- === BACKUP RESTORE ALGORITHM ===
-- 1. Supabase Dashboard → Database → Backups
-- 2. "Today" эсвэл өчигдрийн backup сонгох
-- 3. "Restore" дарж зөвхөн product_variants хүснэгтийг restore хийнэ

-- Эсвэл хэрэв backup байхгүй бол:
-- Гар оруулах хэрэгтэй болж магадгүй. Эхлээд жагсаалт хийе.
