alter table if exists product_lots
  add column if not exists fixed_measure_id text;
