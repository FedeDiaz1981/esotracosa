create table if not exists public.product_fabric_variants (
  product_id integer not null references public.products(id) on delete cascade,
  fabric_id integer not null references public.fabrics(id),
  image text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, fabric_id)
);

alter table public.product_fabric_variants add column if not exists image text not null default '';
alter table public.product_fabric_variants add column if not exists sort_order integer not null default 1;
alter table public.product_fabric_variants add column if not exists created_at timestamptz not null default now();
alter table public.product_fabric_variants add column if not exists updated_at timestamptz not null default now();

create index if not exists product_fabric_variants_product_id_idx
  on public.product_fabric_variants (product_id, sort_order, fabric_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_fabric_variants_updated_at on public.product_fabric_variants;
create trigger trg_product_fabric_variants_updated_at
before update on public.product_fabric_variants
for each row execute function public.set_updated_at();
