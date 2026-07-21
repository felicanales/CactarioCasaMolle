create table if not exists public.revoked_auth_sessions (
  session_id uuid primary key,
  user_id uuid,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default now()
);

comment on table public.revoked_auth_sessions is
  'Sesiones Supabase invalidadas inmediatamente por el backend del WMS';

alter table public.revoked_auth_sessions enable row level security;

revoke all on table public.revoked_auth_sessions from anon, authenticated;
grant select, insert, update, delete on table public.revoked_auth_sessions to service_role;

create index if not exists idx_revoked_auth_sessions_expires_at
  on public.revoked_auth_sessions (expires_at);
