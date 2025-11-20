-- Políticas RLS para la tabla de auditoría
-- Permite a usuarios autenticados leer todos los logs de auditoría
-- Solo el service_role puede insertar (desde el backend)

-- Habilitar RLS si no está habilitado
ALTER TABLE public.auditoria_cambios ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "audit_authenticated_select" ON public.auditoria_cambios;
DROP POLICY IF EXISTS "audit_service_all" ON public.auditoria_cambios;

-- Política: Usuarios autenticados pueden leer todos los logs
CREATE POLICY "audit_authenticated_select"
ON public.auditoria_cambios
FOR SELECT
TO authenticated
USING (true);

-- Política: Service role tiene acceso completo (para el backend)
CREATE POLICY "audit_service_all"
ON public.auditoria_cambios
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permisos
GRANT SELECT ON public.auditoria_cambios TO authenticated;
GRANT ALL ON public.auditoria_cambios TO service_role;

