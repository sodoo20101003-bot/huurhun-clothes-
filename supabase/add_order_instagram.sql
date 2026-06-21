-- 📷 Instagram хаягийг тусдаа баганд хадгалах
alter table orders add column if not exists instagram text;

-- Шалгах
select column_name, data_type from information_schema.columns 
where table_name = 'orders' and column_name = 'instagram';
