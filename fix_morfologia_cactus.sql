-- Script para corregir valores inválidos de morfología_cactus en Supabase
-- Este script establece morfología_cactus a NULL para todas las especies
-- ya que el frontend solo usa tipo_morfología

-- Opción 1: Establecer todos los valores a NULL (recomendado)
UPDATE especies
SET morfología_cactus = NULL
WHERE morfología_cactus IS NOT NULL;

-- Opción 2: Si quieres mantener algunos valores válidos, puedes hacer:
-- UPDATE especies
-- SET morfología_cactus = NULL
-- WHERE morfología_cactus NOT IN ('columnar', 'redondo', 'agave', 'tallo plano', 'otro')
--    OR morfología_cactus IS NOT NULL;

-- Verificar que se actualizó correctamente
SELECT id, scientific_name, morfología_cactus, tipo_morfología
FROM especies
WHERE morfología_cactus IS NOT NULL;

-- Si la consulta anterior no devuelve resultados, significa que todos los valores fueron establecidos a NULL correctamente

