alter table if exists public.fotos
  add column if not exists variants jsonb;

comment on column public.fotos.variants is
  'Mapa de variantes derivadas por ancho, por ejemplo {"w=400": "w=400/...jpg"}';
