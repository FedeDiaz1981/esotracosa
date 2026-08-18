export const siteContentSchemaSql = `
  create table if not exists site_content_meta (
    id integer primary key,
    session_role text,
    view_mode text,
    active_admin_panel text,
    panel_search_query text,
    active_modal_action text,
    ping boolean,
    next_ids jsonb,
    updated_at timestamptz not null default now()
  );

  create table if not exists header_search_scopes (
    id text primary key,
    label text not null,
    href text not null,
    sort_order integer not null
  );

  create table if not exists header_sections (
    id text primary key,
    label text not null,
    icon text not null,
    href text not null,
    sort_order integer not null
  );

  create table if not exists header_groups (
    id text primary key,
    section_id text not null references header_sections(id) on delete cascade,
    label text not null,
    href text not null,
    sort_order integer not null
  );

  create table if not exists header_group_items (
    id text primary key,
    group_id text not null references header_groups(id) on delete cascade,
    label text not null,
    href text not null,
    sort_order integer not null
  );

  create table if not exists hero_slides (
    id integer primary key,
    order_index integer not null,
    title text not null,
    subtitle text not null,
    badge text not null,
    image text not null,
    image_mobile text,
    link text not null,
    active boolean not null,
    home_spotlight boolean
  );

  create table if not exists banners (
    id integer primary key,
    text text not null,
    order_index integer not null,
    active boolean not null
  );

  create table if not exists categories (
    id integer primary key,
    name text not null,
    slug text not null,
    visible boolean not null,
    home_menu boolean not null default true,
    icon text not null default 'package',
    deleted_at timestamptz
  );

  alter table categories add column if not exists deleted_at timestamptz;
  alter table categories add column if not exists home_menu boolean not null default true;
  alter table categories add column if not exists icon text not null default 'package';
  update categories set home_menu = coalesce(home_menu, true) where home_menu is null;
  update categories set icon = coalesce(nullif(icon, ''), 'package') where icon is null or trim(icon) = '';

  create table if not exists brands (
    id text primary key,
    code text not null unique,
    name text not null,
    image text,
    featured boolean not null,
    active boolean not null default true
  );

  alter table brands add column if not exists active boolean not null default true;

  create table if not exists fabrics (
    id integer primary key,
    name text not null,
    image text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table fabrics add column if not exists created_at timestamptz not null default now();
  alter table fabrics add column if not exists updated_at timestamptz not null default now();

  create table if not exists users (
    id integer primary key,
    auth_user_id uuid unique,
    name text not null,
    email text not null unique,
    role text not null,
    can_see_prices boolean not null,
    active boolean not null
  );

  alter table users add column if not exists auth_user_id uuid;
  create unique index if not exists users_auth_user_id_key on users(auth_user_id);

  create table if not exists products (
    id integer primary key,
    sku text not null unique,
    name text not null,
    detail text not null,
    presentation text not null,
    category_id integer not null references categories(id),
    category_name text not null,
    category_ids jsonb not null default '[]'::jsonb,
    category_names jsonb not null default '[]'::jsonb,
    brand text not null,
    vegano boolean not null,
    kosher boolean not null,
    testeado_en_animales boolean,
    public_price integer not null,
    member_price integer not null,
    image text,
    images jsonb not null default '[]'::jsonb,
    fabric_ids jsonb not null default '[]'::jsonb,
    related_product_ids jsonb not null default '[]'::jsonb,
    only_members boolean not null default false,
    status text not null,
    featured boolean not null,
    featured_priority integer,
    trending boolean,
    stock integer,
    views_count integer not null default 0,
    sales_count integer not null default 0,
    description text,
    source_section text,
    template_row_map jsonb not null default '{}'::jsonb,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table products add column if not exists created_at timestamptz not null default now();
  alter table products add column if not exists updated_at timestamptz not null default now();
  alter table products add column if not exists featured_priority integer;
  alter table products add column if not exists views_count integer not null default 0;
  alter table products add column if not exists sales_count integer not null default 0;
  alter table products add column if not exists category_ids jsonb not null default '[]'::jsonb;
  alter table products add column if not exists category_names jsonb not null default '[]'::jsonb;
  alter table products add column if not exists images jsonb not null default '[]'::jsonb;
  alter table products add column if not exists fabric_ids jsonb not null default '[]'::jsonb;
  alter table products add column if not exists related_product_ids jsonb not null default '[]'::jsonb;
  alter table products add column if not exists only_members boolean not null default false;
  alter table products add column if not exists template_row_map jsonb not null default '{}'::jsonb;
  alter table products add column if not exists deleted_at timestamptz;

  create table if not exists product_lots (
    id integer primary key,
    product_id integer not null references products(id) on delete cascade,
    fixed_fabric_id integer references fabrics(id),
    use_fabric_image boolean not null default false,
    title text not null,
    description text not null default '',
    total_units integer not null,
    reserved_units integer not null default 0,
    regular_unit_price integer not null,
    lot_unit_price integer not null,
    status text not null default 'draft',
    only_members boolean not null default true,
    image text,
    completed_at timestamptz,
    completion_email_sent_at timestamptz,
    admin_notified_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table product_lots add column if not exists description text not null default '';
  alter table product_lots add column if not exists total_units integer not null default 1;
  alter table product_lots add column if not exists reserved_units integer not null default 0;
  alter table product_lots add column if not exists regular_unit_price integer not null default 0;
  alter table product_lots add column if not exists lot_unit_price integer not null default 0;
  alter table product_lots add column if not exists fixed_fabric_id integer references fabrics(id);
  alter table product_lots add column if not exists use_fabric_image boolean not null default false;
  alter table product_lots add column if not exists status text not null default 'draft';
  alter table product_lots add column if not exists only_members boolean not null default true;
  alter table product_lots add column if not exists image text;
  alter table product_lots add column if not exists completed_at timestamptz;
  alter table product_lots add column if not exists completion_email_sent_at timestamptz;
  alter table product_lots add column if not exists admin_notified_at timestamptz;
  alter table product_lots add column if not exists deleted_at timestamptz;
  alter table product_lots add column if not exists created_at timestamptz not null default now();
  alter table product_lots add column if not exists updated_at timestamptz not null default now();

  create index if not exists product_lots_product_id_idx on product_lots (product_id);
  create index if not exists product_lots_status_idx on product_lots (status);

  create table if not exists product_lot_reservations (
    id integer primary key,
    lot_id integer not null references product_lots(id) on delete cascade,
    user_id integer not null references users(id) on delete cascade,
    quantity integer not null,
    unit_price integer not null,
    total_price integer not null,
    status text not null default 'reserved',
    notes text,
    admin_note text,
    cancel_reason text,
    confirmed_at timestamptz,
    cancelled_at timestamptz,
    confirmed_by_user_id integer references users(id) on delete set null,
    cancelled_by_user_id integer references users(id) on delete set null,
    lot_title_snapshot text,
    product_sku_snapshot text,
    product_name_snapshot text,
    fabric_name_snapshot text,
    lot_image_snapshot text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table product_lot_reservations add column if not exists notes text;
  alter table product_lot_reservations add column if not exists admin_note text;
  alter table product_lot_reservations add column if not exists cancel_reason text;
  alter table product_lot_reservations add column if not exists confirmed_at timestamptz;
  alter table product_lot_reservations add column if not exists cancelled_at timestamptz;
  alter table product_lot_reservations add column if not exists confirmed_by_user_id integer references users(id) on delete set null;
  alter table product_lot_reservations add column if not exists cancelled_by_user_id integer references users(id) on delete set null;
  alter table product_lot_reservations add column if not exists lot_title_snapshot text;
  alter table product_lot_reservations add column if not exists product_sku_snapshot text;
  alter table product_lot_reservations add column if not exists product_name_snapshot text;
  alter table product_lot_reservations add column if not exists fabric_name_snapshot text;
  alter table product_lot_reservations add column if not exists lot_image_snapshot text;
  alter table product_lot_reservations add column if not exists created_at timestamptz not null default now();
  alter table product_lot_reservations add column if not exists updated_at timestamptz not null default now();

  create index if not exists product_lot_reservations_lot_id_idx on product_lot_reservations (lot_id);
  create index if not exists product_lot_reservations_user_id_idx on product_lot_reservations (user_id);
  create index if not exists product_lot_reservations_status_idx on product_lot_reservations (status);
  create index if not exists product_lot_reservations_confirmed_by_user_id_idx on product_lot_reservations (confirmed_by_user_id);
  create index if not exists product_lot_reservations_cancelled_by_user_id_idx on product_lot_reservations (cancelled_by_user_id);

  create or replace view v_product_lot_progress as
    select
      pl.id as lot_id,
      pl.product_id,
      pl.fixed_fabric_id,
      pl.title as lot_title,
      pl.description as lot_description,
      pl.total_units,
      pl.reserved_units,
      greatest(pl.total_units - pl.reserved_units, 0) as available_units,
      pl.regular_unit_price,
      pl.lot_unit_price,
      pl.status,
      pl.only_members,
      pl.image as lot_image,
      pl.completed_at,
      pl.completion_email_sent_at,
      pl.admin_notified_at,
      pl.created_at,
      pl.updated_at,
      p.sku as product_sku,
      p.name as product_name,
      p.brand as product_brand,
      p.presentation as product_presentation,
      f.name as fixed_fabric_name,
      case when pl.use_fabric_image then pfv.image else pl.image end as resolved_image
    from product_lots pl
    inner join products p on p.id = pl.product_id
    left join fabrics f on f.id = pl.fixed_fabric_id
    left join product_fabric_variants pfv on pfv.product_id = pl.product_id and pfv.fabric_id = pl.fixed_fabric_id
    where pl.deleted_at is null and p.deleted_at is null;

  create or replace view v_user_lot_reservations as
    select
      r.id as reservation_id,
      r.lot_id,
      r.user_id,
      r.quantity,
      r.unit_price,
      r.total_price,
      r.status,
      r.notes,
      r.admin_note,
      r.cancel_reason,
      r.confirmed_at,
      r.cancelled_at,
      r.confirmed_by_user_id,
      r.cancelled_by_user_id,
      r.lot_title_snapshot,
      r.product_sku_snapshot,
      r.product_name_snapshot,
      r.fabric_name_snapshot,
      r.lot_image_snapshot,
      r.created_at,
      r.updated_at,
      u.name as user_name,
      u.email as user_email,
      pl.product_id,
      pl.title as lot_title,
      pl.total_units as lot_total_units,
      pl.reserved_units as lot_reserved_units,
      greatest(pl.total_units - pl.reserved_units, 0) as available_units,
      pl.status as lot_status,
      pl.only_members,
      pl.image as lot_image,
      pl.completed_at,
      pl.completion_email_sent_at,
      pl.admin_notified_at,
      p.sku as product_sku,
      p.name as product_name,
      p.brand as product_brand,
      f.name as fixed_fabric_name
    from product_lot_reservations r
    inner join product_lots pl on pl.id = r.lot_id
    inner join products p on p.id = pl.product_id
    inner join users u on u.id = r.user_id
    left join fabrics f on f.id = pl.fixed_fabric_id
    where pl.deleted_at is null and p.deleted_at is null;

  create table if not exists product_fabric_variants (
    product_id integer not null references products(id) on delete cascade,
    fabric_id integer not null references fabrics(id),
    image text not null,
    sort_order integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (product_id, fabric_id)
  );

  alter table product_fabric_variants add column if not exists image text not null default '';
  alter table product_fabric_variants add column if not exists sort_order integer not null default 1;
  alter table product_fabric_variants add column if not exists created_at timestamptz not null default now();
  alter table product_fabric_variants add column if not exists updated_at timestamptz not null default now();

  create table if not exists promotion_packs (
    id integer primary key,
    apodo text not null unique,
    title text not null,
    description text not null,
    category text not null,
    public_price integer not null,
    image text,
    active boolean not null,
    featured boolean not null,
    order_index integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists promotion_pack_items (
    pack_id integer not null references promotion_packs(id) on delete cascade,
    product_id integer not null references products(id) on delete cascade,
    quantity integer not null default 1,
    order_index integer not null,
    primary key (pack_id, product_id)
  );

  alter table promotion_packs add column if not exists created_at timestamptz not null default now();
  alter table promotion_packs add column if not exists updated_at timestamptz not null default now();

  create table if not exists order_excel_templates (
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

  create unique index if not exists order_excel_templates_key_version_key on order_excel_templates (template_key, audience, version);
  create index if not exists order_excel_templates_active_idx on order_excel_templates (template_key, audience, active);

  alter table order_excel_templates add column if not exists created_at timestamptz not null default now();
  alter table order_excel_templates add column if not exists updated_at timestamptz not null default now();
`; 
