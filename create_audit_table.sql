-- Tabla de auditoría para registrar cambios en especies y sectores
CREATE TABLE IF NOT EXISTS public.auditoria_cambios (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    tabla_afectada text NOT NULL,
    registro_id bigint NOT NULL,
    accion text NOT NULL CHECK (accion IN ('CREATE', 'UPDATE', 'DELETE')),
    usuario_id bigint,
    usuario_email text,
    usuario_nombre text,
    campos_anteriores jsonb,
    campos_nuevos jsonb,
    cambios_detectados jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT auditoria_cambios_pkey PRIMARY KEY (id),
    CONSTRAINT auditoria_cambios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON public.auditoria_cambios(tabla_afectada, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria_cambios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria_cambios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON public.auditoria_cambios(accion);

-- Comentarios
COMMENT ON TABLE public.auditoria_cambios IS 'Registra todos los cambios realizados en especies y sectores por usuarios';
COMMENT ON COLUMN public.auditoria_cambios.tabla_afectada IS 'Nombre de la tabla afectada (especies, sectores, etc.)';
COMMENT ON COLUMN public.auditoria_cambios.registro_id IS 'ID del registro modificado';
COMMENT ON COLUMN public.auditoria_cambios.accion IS 'Tipo de acción: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN public.auditoria_cambios.campos_anteriores IS 'Valores anteriores del registro (solo para UPDATE)';
COMMENT ON COLUMN public.auditoria_cambios.campos_nuevos IS 'Valores nuevos del registro';
COMMENT ON COLUMN public.auditoria_cambios.cambios_detectados IS 'Solo los campos que cambiaron (para UPDATE)';

