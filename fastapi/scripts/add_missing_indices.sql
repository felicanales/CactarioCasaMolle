-- Índices adicionales para optimizar queries frecuentes
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Búsqueda case-insensitive de sectores por qr_code (reemplaza O(n) fallback en Python)
CREATE INDEX IF NOT EXISTS idx_sectores_qr_code_lower ON sectores (lower(qr_code));

-- Búsqueda de especies por slug (confirmar, ya debería ser UNIQUE)
CREATE INDEX IF NOT EXISTS idx_especies_slug ON especies (slug);

-- Búsqueda por nombre en listados (ilike sobre nombre_común)
CREATE INDEX IF NOT EXISTS idx_especies_nombre_lower ON especies (lower(nombre_común));

-- Búsqueda por tipo_morfología (filtro desde ejemplar_service pre-query)
CREATE INDEX IF NOT EXISTS idx_especies_morfologia_lower ON especies (lower(tipo_morfología));

-- Transacciones: filtros de rango de fecha frecuentes
CREATE INDEX IF NOT EXISTS idx_ejemplar_purchase_date ON ejemplar (purchase_date)
    WHERE purchase_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ejemplar_sale_date ON ejemplar (sale_date)
    WHERE sale_date IS NOT NULL;

-- Fotos: listados ordenados por order_index (frecuente en PhotoGallery)
CREATE INDEX IF NOT EXISTS idx_fotos_especie_order ON fotos (especie_id, order_index)
    WHERE especie_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fotos_sector_order ON fotos (sector_id, order_index)
    WHERE sector_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fotos_ejemplar_order ON fotos (ejemplar_id, order_index)
    WHERE ejemplar_id IS NOT NULL;

-- Fotos: filtrar portadas rápidamente (is_cover = true)
CREATE INDEX IF NOT EXISTS idx_fotos_cover ON fotos (especie_id, is_cover)
    WHERE is_cover = true AND especie_id IS NOT NULL;
