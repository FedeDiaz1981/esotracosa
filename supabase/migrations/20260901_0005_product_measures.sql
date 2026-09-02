alter table public.products
  add column if not exists measures jsonb not null default '[]'::jsonb;
