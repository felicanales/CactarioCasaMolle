-- Script simplificado para corregir la secuencia de auto-incremento
-- Ejecuta este script en el SQL Editor de Supabase

-- Obtener el nombre real de la secuencia y corregirla en un solo paso
DO $$
DECLARE
    seq_name TEXT;
    max_id INTEGER;
BEGIN
    -- Obtener el nombre de la secuencia asociada a la columna id de sectores
    SELECT pg_get_serial_sequence('public.sectores', 'id') INTO seq_name;
    
    -- Obtener el máximo ID existente
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM sectores;
    
    -- Si encontramos la secuencia, corregirla
    IF seq_name IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, %s, false)', seq_name, max_id + 1);
        RAISE NOTICE 'Secuencia % corregida. Próximo ID será: %', seq_name, max_id + 1;
    ELSE
        RAISE NOTICE 'No se encontró secuencia para la columna id de sectores';
    END IF;
END $$;

-- Verificar el resultado
SELECT 
    MAX(id) as maximo_id_actual,
    (SELECT last_value FROM pg_get_serial_sequence('public.sectores', 'id')::regclass) as proximo_id_generado
FROM sectores;

