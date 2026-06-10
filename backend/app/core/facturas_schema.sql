-- ============================================================
-- Tabla de facturas de compra (Ingreso de compra)
-- ============================================================
-- Registra las facturas de compra de cactus a viveros/proveedores.
-- El "vivero" se guarda como texto libre (nursery), consistente con
-- la tabla `ejemplar` (no hay tabla de viveros). El documento de la
-- factura (imagen o PDF) se almacena en Cloudflare R2 y aquí solo se
-- guarda su key (document_path).
--
-- Los servicios del backend operan sobre esta tabla con get_service()
-- (service role), que bypassa RLS — igual que la auditoría.
--
-- Aplicar manualmente en el SQL editor de Supabase del proyecto
-- apuntado por backend/.env.
-- ============================================================

create table if not exists public.facturas_compra (
  id bigint generated always as identity primary key,
  nursery text not null,                  -- vivero / proveedor (texto libre)
  invoice_number text,                    -- N° de factura
  issue_date date,                        -- fecha de emisión
  net_amount numeric(14,2) default 0,     -- monto neto
  tax_amount numeric(14,2) default 0,     -- IVA
  total_amount numeric(14,2) default 0,   -- monto total
  document_path text,                     -- key del documento en R2
  document_name text,                     -- nombre original del archivo
  document_content_type text,             -- mime del documento
  created_by bigint,                      -- usuarios.id (opcional)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_facturas_compra_issue_date
  on public.facturas_compra (issue_date desc);
create index if not exists idx_facturas_compra_nursery
  on public.facturas_compra (nursery);

-- RLS habilitado: los servicios usan service role (bypass). No se define
-- política pública: la app de huéspedes no debe leer facturas.
alter table public.facturas_compra enable row level security;
