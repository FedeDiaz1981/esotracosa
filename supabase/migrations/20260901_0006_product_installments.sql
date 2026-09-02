alter table public.products
  add column if not exists installment_count integer not null default 0;

alter table public.products
  add column if not exists interest_free_installments jsonb not null default '[]'::jsonb;
