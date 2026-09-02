create table if not exists public.product_related_products (
  product_id integer not null references public.products(id) on delete cascade,
  related_product_id integer not null references public.products(id) on delete cascade,
  sort_order integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, related_product_id),
  check (product_id <> related_product_id)
);

create index if not exists product_related_products_product_idx
  on public.product_related_products (product_id, sort_order);

insert into public.product_related_products (product_id, related_product_id, sort_order)
select p.id, (related_id.value)::integer, related_id.ordinality::integer
from public.products p
cross join lateral jsonb_array_elements_text(coalesce(p.related_product_ids, '[]'::jsonb)) with ordinality as related_id(value, ordinality)
where p.deleted_at is null
  and (related_id.value)::integer <> p.id
  and exists (select 1 from public.products related where related.id = (related_id.value)::integer and related.deleted_at is null)
on conflict (product_id, related_product_id) do nothing;
