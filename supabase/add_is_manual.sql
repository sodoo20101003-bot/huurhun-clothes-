-- 📝 Гараар захиалга тэмдэглэгээ
-- /admin/orders/new-ээс үүсгэсэн захиалга энэ багана = true

alter table orders add column if not exists is_manual boolean default false;
alter table sales add column if not exists is_manual boolean default false;

-- Хуучин гараар захиалгуудыг тэмдэглэх (status_message="Гараар оруулсан захиалга")
update orders set is_manual = true where status_message = 'Гараар оруулсан захиалга';

-- Эдгээр захиалгад харьяалагдах sales-ыг тэмдэглэх
update sales set is_manual = true 
where order_code in (
  select order_code from orders where is_manual = true
);

-- Шалгах
select count(*) as manual_orders from orders where is_manual = true;
select count(*) as manual_sales from sales where is_manual = true;
