-- =============================================================================
-- AGREGAR CAMPO DE FACTURA A LA TABLA EJEMPLAR
-- =============================================================================
-- Este script agrega el campo invoice_number (número de factura) a la tabla ejemplar
-- para poder registrar el número de factura cuando se ingresa una compra
-- =============================================================================

-- Agregar columna invoice_number a la tabla ejemplar
ALTER TABLE public.ejemplar
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.ejemplar.invoice_number IS 'Número de factura de la compra del ejemplar';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Para verificar que la columna se agregó correctamente, ejecuta:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'ejemplar' AND column_name = 'invoice_number';
-- =============================================================================

