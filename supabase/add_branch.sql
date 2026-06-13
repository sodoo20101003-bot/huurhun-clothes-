-- Sales-д салбар (branch) талбар нэмэх
alter table sales add column if not exists branch text;
-- Index
create index if not exists sales_branch_idx on sales(branch);
