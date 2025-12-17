-- =============================================================================
-- HOME CONTENT TABLE SCHEMA
-- =============================================================================
-- Tabla para almacenar el contenido del home de la aplicación móvil
-- Incluye: texto de bienvenida, imágenes del carrusel y secciones de contenido
-- =============================================================================

-- Crear tabla home_content
CREATE TABLE IF NOT EXISTS public.home_content (
    id BIGSERIAL PRIMARY KEY,
    welcome_text TEXT NOT NULL DEFAULT 'Bienvenido al Cactario CasaMolle',
    carousel_images JSONB DEFAULT '[]'::jsonb,
    sections JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas de contenido activo
CREATE INDEX IF NOT EXISTS idx_home_content_active ON public.home_content(is_active) WHERE is_active = true;

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_home_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe antes de crearlo (para hacer el script idempotente)
DROP TRIGGER IF EXISTS trigger_update_home_content_updated_at ON public.home_content;

CREATE TRIGGER trigger_update_home_content_updated_at
    BEFORE UPDATE ON public.home_content
    FOR EACH ROW
    EXECUTE FUNCTION update_home_content_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.home_content ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para hacer el script idempotente)
DROP POLICY IF EXISTS "home_content_public_select" ON public.home_content;
DROP POLICY IF EXISTS "home_content_staff_all" ON public.home_content;

-- Política para lectura pública (solo contenido activo)
CREATE POLICY "home_content_public_select" ON public.home_content
    FOR SELECT
    USING (is_active = true);

-- Política para staff (usuarios autenticados pueden leer y escribir)
CREATE POLICY "home_content_staff_all" ON public.home_content
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- Otorgar permisos necesarios para que las políticas RLS funcionen correctamente

-- Permisos para usuarios anónimos (solo lectura de contenido activo)
GRANT SELECT ON public.home_content TO anon;

-- Permisos para usuarios autenticados (lectura y escritura completa)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_content TO authenticated;

-- Permisos para usar la secuencia del ID
GRANT USAGE, SELECT ON SEQUENCE public.home_content_id_seq TO authenticated;

-- Comentarios en la tabla y columnas
COMMENT ON TABLE public.home_content IS 'Contenido del home de la aplicación móvil';
COMMENT ON COLUMN public.home_content.welcome_text IS 'Texto de bienvenida que se muestra en el home';
COMMENT ON COLUMN public.home_content.carousel_images IS 'Array JSON con las imágenes del carrusel. Formato: [{"url": "...", "alt": "..."}]';
COMMENT ON COLUMN public.home_content.sections IS 'Array JSON con las secciones de contenido. Cada sección puede ser tipo "text", "bullets" o "image"';
COMMENT ON COLUMN public.home_content.is_active IS 'Indica si este contenido está activo y debe mostrarse en la app móvil';

-- =============================================================================
-- EJEMPLO DE DATOS
-- =============================================================================
-- INSERT INTO public.home_content (welcome_text, carousel_images, sections, is_active)
-- VALUES (
--     'Bienvenido al Cactario CasaMolle',
--     '[
--         {"url": "https://example.com/image1.jpg", "alt": "Cactus 1"},
--         {"url": "https://example.com/image2.jpg", "alt": "Cactus 2"}
--     ]'::jsonb,
--     '[
--         {
--             "type": "text",
--             "title": "Sobre la App",
--             "content": "Esta aplicación te permite explorar el cactario..."
--         },
--         {
--             "type": "bullets",
--             "title": "Características",
--             "bullets": ["Explora especies", "Escanea códigos QR", "Aprende sobre cactus"]
--         }
--     ]'::jsonb,
--     true
-- );

