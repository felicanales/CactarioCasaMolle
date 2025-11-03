-- Script para actualizar la tabla ejemplar con campos necesarios para stock e inventario
-- Ejecuta este script en el SQL Editor de Supabase

-- =============================================================================
-- AGREGAR CAMPOS PARA COMPRA Y VENTA
-- =============================================================================

-- Fecha de compra (cuando se adquirió el ejemplar)
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Fecha de venta (cuando se vendió el ejemplar, NULL si aún no se ha vendido)
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS sale_date DATE;

-- Vivero o proveedor del cual viene el ejemplar
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS nursery TEXT;

-- Precio de compra (opcional, para inventario)
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

-- Precio de venta (opcional, para inventario)
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);

-- =============================================================================
-- AGREGAR CAMPOS PARA CARACTERÍSTICAS FÍSICAS
-- =============================================================================

-- Edad del ejemplar (en meses o años - definir unidad si es necesario)
-- Puede calcularse desde purchase_date o collection_date, pero también puede guardarse
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS age_months INTEGER;

-- Tamaño del ejemplar (altura en cm, por ejemplo)
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS size_cm INTEGER;

-- Descripción más específica del lugar dentro del sector
-- (location ya existe, pero podemos mejorarlo o agregar más detalles)
-- La columna 'location' ya existe en la tabla según el esquema mostrado

-- =============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================================================

COMMENT ON COLUMN public.ejemplar.purchase_date IS 'Fecha en que se compró/adquirió el ejemplar';
COMMENT ON COLUMN public.ejemplar.sale_date IS 'Fecha en que se vendió el ejemplar (NULL si aún no se ha vendido)';
COMMENT ON COLUMN public.ejemplar.nursery IS 'Nombre del vivero o proveedor del cual proviene el ejemplar';
COMMENT ON COLUMN public.ejemplar.purchase_price IS 'Precio al que se compró el ejemplar';
COMMENT ON COLUMN public.ejemplar.sale_price IS 'Precio al que se vendió el ejemplar';
COMMENT ON COLUMN public.ejemplar.age_months IS 'Edad del ejemplar en meses';
COMMENT ON COLUMN public.ejemplar.size_cm IS 'Tamaño del ejemplar en centímetros (altura)';
COMMENT ON COLUMN public.ejemplar.health_status IS 'Estado de salud del ejemplar';
COMMENT ON COLUMN public.ejemplar.location IS 'Ubicación específica dentro del sector (descripción detallada del lugar)';

-- =============================================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO DE FILTROS
-- =============================================================================

-- Índice para filtrar por especie
CREATE INDEX IF NOT EXISTS idx_ejemplar_species_id ON public.ejemplar(species_id);

-- Índice para filtrar por sector
CREATE INDEX IF NOT EXISTS idx_ejemplar_sector_id ON public.ejemplar(sector_id);

-- Índice para filtrar por tamaño (útil para rangos)
CREATE INDEX IF NOT EXISTS idx_ejemplar_size_cm ON public.ejemplar(size_cm) WHERE size_cm IS NOT NULL;

-- Índice para filtrar por fecha de compra
CREATE INDEX IF NOT EXISTS idx_ejemplar_purchase_date ON public.ejemplar(purchase_date) WHERE purchase_date IS NOT NULL;

-- Índice para filtrar por estado de salud
CREATE INDEX IF NOT EXISTS idx_ejemplar_health_status ON public.ejemplar(health_status) WHERE health_status IS NOT NULL;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ejemplar'
ORDER BY ordinal_position;

