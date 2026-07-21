alter table public.auditoria_cambios
  drop constraint if exists auditoria_cambios_accion_check;

alter table public.auditoria_cambios
  add constraint auditoria_cambios_accion_check
  check (accion in ('CREATE', 'UPDATE', 'DELETE', 'PURCHASE', 'SALE'))
  not valid;

alter table public.auditoria_cambios
  validate constraint auditoria_cambios_accion_check;

comment on column public.auditoria_cambios.accion is
  'Accion auditada: CREATE, UPDATE, DELETE, PURCHASE o SALE.';
