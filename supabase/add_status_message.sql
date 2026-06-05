-- status_message талбар нэмэх (захиалга бүрт админ тусгай мессеж бичих)
-- Supabase → SQL Editor дотор RUN дарна
alter table orders add column if not exists status_message text;
