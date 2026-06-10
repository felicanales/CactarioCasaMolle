-- ============================================================
-- Tabla de tickets de soporte del WMS
-- ============================================================
-- Los tickets son privados del staff y se operan desde FastAPI con
-- service_role. La autorizacion fina vive en support_tickets_service.py:
-- todos pueden crear/ver, pero solo soporte o el creador pueden cancelar
-- o eliminar, y solo soporte puede cambiar estados de revision/resuelto.
--
-- Aplicar manualmente en el SQL editor de Supabase del proyecto apuntado
-- por backend/.env antes de usar el modulo en produccion.
-- ============================================================

create table if not exists public.support_tickets (
  id bigserial primary key,
  type text not null check (type in ('error', 'mejora', 'duda')),
  status text not null default 'en_espera'
    check (status in ('en_espera', 'en_revision', 'resuelto', 'cancelado')),
  module text not null check (
    module in (
      'Dashboard',
      'Especies',
      'Sectores',
      'Inventario',
      'Compras y Ventas',
      'Reportes',
      'Auditoria',
      'Editor QR',
      'Home App QR',
      'Login',
      'App QR Publica',
      'Otro'
    )
  ),
  title text not null,
  description text not null,
  steps_to_reproduce text,
  expected_result text,
  actual_result text,
  resolution_note text,
  created_by_uid text not null,
  created_by_email text not null,
  created_by_name text,
  page_url text,
  user_agent text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_status_created_at
  on public.support_tickets (status, created_at desc);

create index if not exists idx_support_tickets_type
  on public.support_tickets (type);

create index if not exists idx_support_tickets_module
  on public.support_tickets (module);

create index if not exists idx_support_tickets_created_by_email
  on public.support_tickets (created_by_email);

alter table public.support_tickets enable row level security;

-- El frontend no accede directo a Supabase para tickets. FastAPI opera con
-- service_role y valida permisos por usuario autenticado.
revoke all on table public.support_tickets from anon, authenticated;
revoke all on sequence public.support_tickets_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.support_tickets to service_role;
grant usage, select on sequence public.support_tickets_id_seq to service_role;

comment on table public.support_tickets is 'Tickets internos de soporte creados desde el WMS';
comment on column public.support_tickets.type is 'Tipo del ticket: error, mejora o duda';
comment on column public.support_tickets.status is 'Estado operativo: en_espera, en_revision, resuelto o cancelado';
comment on column public.support_tickets.module is 'Modulo del WMS o app QR asociado al reporte';
