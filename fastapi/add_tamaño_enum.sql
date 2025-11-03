-- Script para agregar el ENUM de tamaño a la tabla ejemplar
-- Ejecuta este script en el SQL Editor de Supabase

-- =============================================================================
-- CREAR TIPO ENUM PARA TAMAÑO
-- =============================================================================

-- Crear el tipo ENUM si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tamaño_enum') THEN
        CREATE TYPE public.tamaño_enum AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');
    END IF;
END $$;

-- =============================================================================
-- AGREGAR COLUMNA TAMAÑO A LA TABLA EJEMPLAR
-- =============================================================================

-- Agregar la columna tamaño si no existe
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS tamaño public.tamaño_enum;

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON COLUMN public.ejemplar.tamaño IS 'Tamaño del ejemplar: XS, S, M, L, XL, XXL';

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- Índice para filtrar por tamaño
CREATE INDEX IF NOT EXISTS idx_ejemplar_tamaño ON public.ejemplar(tamaño) WHERE tamaño IS NOT NULL;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ejemplar'
    AND column_name = 'tamaño';

