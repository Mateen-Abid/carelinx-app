alter table public.clinics
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists street text,
  add column if not exists address_details text;
