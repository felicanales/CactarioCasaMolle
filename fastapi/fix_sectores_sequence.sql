-- Script para corregir la secuencia de auto-incremento de la tabla sectores
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Encontrar el nombre correcto de la secuencia
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'sectores' 
    AND column_name = 'id'
    AND table_schema = 'public';

-- Paso 2: Buscar todas las secuencias relacionadas con la tabla sectores
SELECT 
    sequence_name,
    sequence_schema
FROM information_schema.sequences
WHERE sequence_schema = 'public'
    AND sequence_name LIKE '%sectores%';

-- Paso 3: Obtener el nombre de la secuencia desde pg_get_serial_sequence
SELECT 
    pg_get_serial_sequence('public.sectores', 'id') as nombre_secuencia;

-- Paso 4: Una vez que tengas el nombre de la secuencia, ejecuta esto:
-- (Reemplaza 'NOMBRE_SECUENCIA' con el nombre real que obtuviste en el paso 3)
-- 
-- Ejemplo si el nombre es 'sectores_id_seq':
-- SELECT setval('sectores_id_seq', (SELECT MAX(id) FROM sectores) + 1, false);
--
-- Ejemplo si el nombre es diferente, por ejemplo 'public.sectores_id_seq':
-- SELECT setval('public.sectores_id_seq', (SELECT MAX(id) FROM sectores) + 1, false);

-- Paso 5: Verificar que la secuencia fue corregida
-- (Reemplaza 'NOMBRE_SECUENCIA' con el nombre real)
-- SELECT last_value FROM NOMBRE_SECUENCIA;

