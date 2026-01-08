-- =============================================================================
-- CREACIÓN DE TABLA GENÉRICA DE FOTOS CON FOREIGN KEYS
-- =============================================================================
-- Este script crea una tabla genérica de fotos que puede usarse para
-- especies, sectores, ejemplares y otras entidades futuras.
-- 
-- Ejecuta este script en Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- PARTE 1: CREAR TABLA DE FOTOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fotos (
    id BIGSERIAL PRIMARY KEY,
    
    -- Foreign keys a cada entidad (nullable, pero al menos una debe ser NOT NULL)
    especie_id BIGINT,
    sector_id BIGINT,
    ejemplar_id BIGINT,
    -- Agregar más según necesites: purchase_id, receipt_id, etc.
    
    storage_path TEXT NOT NULL,
    variants JSONB,
    is_cover BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign keys explícitas con CASCADE
    CONSTRAINT fotos_especie_id_fkey FOREIGN KEY (especie_id) 
        REFERENCES public.especies(id) ON DELETE CASCADE,
    CONSTRAINT fotos_sector_id_fkey FOREIGN KEY (sector_id) 
        REFERENCES public.sectores(id) ON DELETE CASCADE,
    CONSTRAINT fotos_ejemplar_id_fkey FOREIGN KEY (ejemplar_id) 
        REFERENCES public.ejemplar(id) ON DELETE CASCADE,
    
    -- CHECK constraint: exactamente una foreign key debe ser NOT NULL
    CONSTRAINT fotos_entity_check CHECK (
        (especie_id IS NOT NULL AND sector_id IS NULL AND ejemplar_id IS NULL) OR
        (especie_id IS NULL AND sector_id IS NOT NULL AND ejemplar_id IS NULL) OR
        (especie_id IS NULL AND sector_id IS NULL AND ejemplar_id IS NOT NULL)
    )
);

-- =============================================================================
-- PARTE 2: CREAR ÍNDICES Y CONSTRAINTS ÚNICOS
-- =============================================================================

-- Índices únicos parciales: no duplicar el mismo storage_path para la misma entidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_fotos_unique_especie 
    ON public.fotos(especie_id, storage_path) 
    WHERE especie_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fotos_unique_sector 
    ON public.fotos(sector_id, storage_path) 
    WHERE sector_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fotos_unique_ejemplar 
    ON public.fotos(ejemplar_id, storage_path) 
    WHERE ejemplar_id IS NOT NULL;

-- Índices parciales para búsquedas por tipo de entidad
CREATE INDEX IF NOT EXISTS idx_fotos_especie_id ON public.fotos(especie_id) 
    WHERE especie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fotos_sector_id ON public.fotos(sector_id) 
    WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fotos_ejemplar_id ON public.fotos(ejemplar_id) 
    WHERE ejemplar_id IS NOT NULL;

-- Índices para búsquedas de portadas
CREATE INDEX IF NOT EXISTS idx_fotos_cover_especie ON public.fotos(especie_id, is_cover) 
    WHERE especie_id IS NOT NULL AND is_cover = TRUE;
CREATE INDEX IF NOT EXISTS idx_fotos_cover_sector ON public.fotos(sector_id, is_cover) 
    WHERE sector_id IS NOT NULL AND is_cover = TRUE;
CREATE INDEX IF NOT EXISTS idx_fotos_cover_ejemplar ON public.fotos(ejemplar_id, is_cover) 
    WHERE ejemplar_id IS NOT NULL AND is_cover = TRUE;

-- Índices para ordenamiento
CREATE INDEX IF NOT EXISTS idx_fotos_order_especie ON public.fotos(especie_id, order_index) 
    WHERE especie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fotos_order_sector ON public.fotos(sector_id, order_index) 
    WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fotos_order_ejemplar ON public.fotos(ejemplar_id, order_index) 
    WHERE ejemplar_id IS NOT NULL;

-- =============================================================================
-- PARTE 3: TRIGGER PARA ACTUALIZAR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_fotos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fotos_updated_at
    BEFORE UPDATE ON public.fotos
    FOR EACH ROW
    EXECUTE FUNCTION update_fotos_updated_at();

-- =============================================================================
-- PARTE 4: POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =============================================================================

ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquiera puede ver fotos)
CREATE POLICY "fotos_public_select"
ON public.fotos
FOR SELECT
TO anon, authenticated
USING (true);

-- Usuarios autenticados pueden insertar
CREATE POLICY "fotos_authenticated_insert"
ON public.fotos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Usuarios autenticados pueden actualizar
CREATE POLICY "fotos_authenticated_update"
ON public.fotos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Usuarios autenticados pueden eliminar
CREATE POLICY "fotos_authenticated_delete"
ON public.fotos
FOR DELETE
TO authenticated
USING (true);

-- =============================================================================
-- PARTE 5: CONFIGURAR SUPABASE STORAGE
-- =============================================================================

-- Crear bucket único para todas las fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Políticas de storage para subida (usuarios autenticados)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Políticas de storage para actualización (usuarios autenticados)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos');

-- Políticas de storage para eliminación (usuarios autenticados)
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
    'fotos' as tabla,
    COUNT(*) as total_fotos
FROM public.fotos;

-- Verificar que el bucket existe
SELECT 
    id, 
    name, 
    public 
FROM storage.buckets 
WHERE id = 'photos';

-- =============================================================================
-- NOTAS
-- =============================================================================
-- 
-- 1. La tabla fotos_especies existente puede mantenerse o eliminarse.
--    Si no tiene datos, puedes eliminarla con:
--    DROP TABLE IF EXISTS public.fotos_especies;
-- 
-- 2. Para agregar soporte a nuevas entidades (ej: purchases, receipts):
--    - Agregar columna: purchase_id BIGINT
--    - Agregar foreign key
--    - Actualizar CHECK constraint
--    - Agregar unique constraint
--    - Agregar índices
-- 
-- 3. La estructura de carpetas en storage será:
--    photos/especies/{especie_id}/{uuid}.jpg
--    photos/sectores/{sector_id}/{uuid}.jpg
--    photos/ejemplares/{ejemplar_id}/{uuid}.jpg
-- 
-- =============================================================================
