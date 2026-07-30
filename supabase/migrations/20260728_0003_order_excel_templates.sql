create table if not exists public.order_excel_templates (
  id integer primary key,
  template_key text not null,
  audience text not null,
  version integer not null,
  file_name text not null,
  storage_bucket text not null default 'uploads',
  storage_path text not null,
  mime_type text not null default 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists order_excel_templates_key_version_key
  on public.order_excel_templates (template_key, audience, version);

create index if not exists order_excel_templates_active_idx
  on public.order_excel_templates (template_key, audience, active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_order_excel_templates_updated_at on public.order_excel_templates;
create trigger trg_order_excel_templates_updated_at
before update on public.order_excel_templates
for each row execute function public.set_updated_at();
