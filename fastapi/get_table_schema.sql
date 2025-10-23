-- =============================================================================
-- SCRIPT PARA OBTENER EL ESQUEMA COMPLETO DE TODAS LAS TABLAS
-- =============================================================================
-- Ejecuta este script en Supabase SQL Editor para ver la estructura de tus tablas
-- Copia el resultado y compártelo para crear políticas RLS más específicas
-- =============================================================================

-- =============================================================================
-- OPCIÓN 1: ESQUEMA DETALLADO POR TABLA (Recomendado)
-- =============================================================================

-- Tabla: ejemplar
SELECT 
    'ejemplar' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ejemplar'
ORDER BY ordinal_position;

-- Tabla: purchases
SELECT 
    'purchases' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'purchases'
ORDER BY ordinal_position;

-- Tabla: purchase_items
SELECT 
    'purchase_items' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'purchase_items'
ORDER BY ordinal_position;

-- Tabla: receipts
SELECT 
    'receipts' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'receipts'
ORDER BY ordinal_position;

-- Tabla: receipt_items
SELECT 
    'receipt_items' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'receipt_items'
ORDER BY ordinal_position;

-- Tabla: movimiento_de_inventario
SELECT 
    'movimiento_de_inventario' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'movimiento_de_inventario'
ORDER BY ordinal_position;

-- Tabla: usuarios
SELECT 
    'usuarios' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- Tabla: public_views
SELECT 
    'public_views' as tabla,
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default,
    character_maximum_length as longitud_max
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'public_views'
ORDER BY ordinal_position;

-- =============================================================================
-- OPCIÓN 2: RESUMEN DE TODAS LAS TABLAS (Vista Rápida)
-- =============================================================================

SELECT 
    table_name as tabla,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columnas
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN (
        'ejemplar', 'purchases', 'purchase_items', 'receipts', 
        'receipt_items', 'movimiento_de_inventario', 'usuarios', 'public_views'
    )
GROUP BY table_name
ORDER BY table_name;

-- =============================================================================
-- OPCIÓN 3: RELACIONES (FOREIGN KEYS)
-- =============================================================================

SELECT
    tc.table_name as tabla_origen,
    kcu.column_name as columna_origen,
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'ejemplar', 'purchases', 'purchase_items', 'receipts', 
        'receipt_items', 'movimiento_de_inventario'
    )
ORDER BY tc.table_name;

-- =============================================================================
-- OPCIÓN 4: BUSCAR COLUMNAS IMPORTANTES PARA RLS
-- =============================================================================

-- Buscar columnas de ownership (created_by, user_id, owner_id, etc.)
SELECT 
    table_name as tabla,
    column_name as columna_importante,
    data_type as tipo,
    '👤 OWNERSHIP' as propósito
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'ejemplar', 'purchases', 'purchase_items', 'receipts', 
        'receipt_items', 'movimiento_de_inventario'
    )
    AND (
        column_name LIKE '%user_id%'
        OR column_name LIKE '%created_by%'
        OR column_name LIKE '%owner%'
        OR column_name LIKE '%usuario%'
    )
ORDER BY table_name, column_name;

-- Buscar columnas de tenant/organization (para multi-tenancy)
SELECT 
    table_name as tabla,
    column_name as columna_importante,
    data_type as tipo,
    '🏢 MULTI-TENANT' as propósito
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'ejemplar', 'purchases', 'purchase_items', 'receipts', 
        'receipt_items', 'movimiento_de_inventario'
    )
    AND (
        column_name LIKE '%tenant%'
        OR column_name LIKE '%org%'
        OR column_name LIKE '%organization%'
        OR column_name LIKE '%company%'
    )
ORDER BY table_name, column_name;

-- =============================================================================
-- OPCIÓN 5: VISTA COMPLETA CON PRIMARY Y FOREIGN KEYS
-- =============================================================================

WITH pk_info AS (
    SELECT 
        tc.table_name,
        STRING_AGG(kcu.column_name, ', ') as primary_keys
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    GROUP BY tc.table_name
),
fk_info AS (
    SELECT 
        tc.table_name,
        COUNT(*) as fk_count
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    GROUP BY tc.table_name
)
SELECT 
    t.table_name as tabla,
    COUNT(c.column_name) as num_columnas,
    COALESCE(pk.primary_keys, 'No PK') as primary_key,
    COALESCE(fk.fk_count, 0) as num_foreign_keys
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN pk_info pk ON t.table_name = pk.table_name
LEFT JOIN fk_info fk ON t.table_name = fk.table_name
WHERE t.table_schema = 'public'
    AND t.table_name IN (
        'ejemplar', 'purchases', 'purchase_items', 'receipts', 
        'receipt_items', 'movimiento_de_inventario', 'usuarios', 
        'especies', 'sectores', 'public_views'
    )
GROUP BY t.table_name, pk.primary_keys, fk.fk_count
ORDER BY t.table_name;

-- =============================================================================
-- INSTRUCCIONES PARA COMPARTIR EL RESULTADO
-- =============================================================================
-- 
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Para cada query, copia el resultado (formato CSV o tabla)
-- 3. Compárteme el output, especialmente:
--    - OPCIÓN 1: Esquema detallado (todas las columnas de cada tabla)
--    - OPCIÓN 4: Columnas importantes (si encuentra algo)
-- 
-- Con esa información puedo crear políticas RLS mucho más específicas:
-- - Ownership: usuarios solo ven sus propios registros
-- - Roles: admins vs staff vs usuarios normales
-- - Relaciones: permisos basados en relaciones entre tablas
-- 
-- =============================================================================

