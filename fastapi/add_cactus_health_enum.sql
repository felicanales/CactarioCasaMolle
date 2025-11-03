-- Script para agregar el ENUM de salud del cactus a la tabla ejemplar
-- Ejecuta este script en el SQL Editor de Supabase

-- =============================================================================
-- CREAR TIPO ENUM PARA SALUD DEL CACTUS
-- =============================================================================

-- Crear el tipo ENUM si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cactus_health') THEN
        CREATE TYPE public.cactus_health AS ENUM ('crítico', 'enfermo', 'leve enfermo', 'estable', 'muy bien');
    END IF;
END $$;

-- =============================================================================
-- ACTUALIZAR COLUMNA HEALTH_STATUS EN LA TABLA EJEMPLAR
-- =============================================================================

-- Primero, convertir los valores existentes si los hay
-- (opcional: solo si hay datos existentes)
UPDATE public.ejemplar
SET health_status = CASE 
    WHEN LOWER(health_status) LIKE '%crítico%' OR LOWER(health_status) LIKE '%critico%' THEN 'crítico'
    WHEN LOWER(health_status) LIKE '%enfermo%' AND LOWER(health_status) NOT LIKE '%leve%' THEN 'enfermo'
    WHEN LOWER(health_status) LIKE '%leve%' THEN 'leve enfermo'
    WHEN LOWER(health_status) LIKE '%estable%' THEN 'estable'
    WHEN LOWER(health_status) LIKE '%muy bien%' OR LOWER(health_status) LIKE '%excelente%' OR LOWER(health_status) LIKE '%bueno%' THEN 'muy bien'
    ELSE NULL
END
WHERE health_status IS NOT NULL;

-- Cambiar el tipo de la columna a ENUM
-- Primero, crear una nueva columna temporal
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS health_status_new public.cactus_health;

-- Copiar los valores convertidos
UPDATE public.ejemplar
SET health_status_new = health_status::text::public.cactus_health
WHERE health_status IS NOT NULL;

-- Eliminar la columna antigua
ALTER TABLE public.ejemplar
DROP COLUMN IF EXISTS health_status;

-- Renombrar la nueva columna
ALTER TABLE public.ejemplar
RENAME COLUMN health_status_new TO health_status;

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON COLUMN public.ejemplar.health_status IS 'Estado de salud del ejemplar: crítico, enfermo, leve enfermo, estable, muy bien';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar que la columna se actualizó correctamente
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ejemplar'
    AND column_name = 'health_status';

