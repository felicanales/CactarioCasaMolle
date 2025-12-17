-- =============================================================================
-- MIGRACIÓN: Agregar soporte multiidioma a home_content
-- =============================================================================
-- Este script agrega las columnas para inglés y migra los datos existentes
-- Ejecutar después de home_content_schema.sql si ya existe contenido

-- Agregar nuevas columnas si no existen
DO $$
BEGIN
    -- Agregar welcome_text_es si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'home_content' AND column_name = 'welcome_text_es'
    ) THEN
        ALTER TABLE public.home_content 
        ADD COLUMN welcome_text_es TEXT;
        
        -- Migrar datos de welcome_text a welcome_text_es
        UPDATE public.home_content 
        SET welcome_text_es = welcome_text 
        WHERE welcome_text IS NOT NULL;
        
        -- Establecer valor por defecto
        ALTER TABLE public.home_content 
        ALTER COLUMN welcome_text_es SET DEFAULT 'Bienvenido al Cactario CasaMolle';
        
        -- Hacer NOT NULL después de migrar
        UPDATE public.home_content 
        SET welcome_text_es = 'Bienvenido al Cactario CasaMolle' 
        WHERE welcome_text_es IS NULL;
        
        ALTER TABLE public.home_content 
        ALTER COLUMN welcome_text_es SET NOT NULL;
    END IF;
    
    -- Agregar welcome_text_en si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'home_content' AND column_name = 'welcome_text_en'
    ) THEN
        ALTER TABLE public.home_content 
        ADD COLUMN welcome_text_en TEXT DEFAULT 'Welcome to Cactario CasaMolle';
    END IF;
    
    -- Agregar sections_es si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'home_content' AND column_name = 'sections_es'
    ) THEN
        ALTER TABLE public.home_content 
        ADD COLUMN sections_es JSONB DEFAULT '[]'::jsonb;
        
        -- Migrar datos de sections a sections_es
        UPDATE public.home_content 
        SET sections_es = sections 
        WHERE sections IS NOT NULL AND sections != '[]'::jsonb;
    END IF;
    
    -- Agregar sections_en si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'home_content' AND column_name = 'sections_en'
    ) THEN
        ALTER TABLE public.home_content 
        ADD COLUMN sections_en JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Actualizar comentarios
COMMENT ON COLUMN public.home_content.welcome_text_es IS 'Texto de bienvenida en español';
COMMENT ON COLUMN public.home_content.welcome_text_en IS 'Texto de bienvenida en inglés';
COMMENT ON COLUMN public.home_content.sections_es IS 'Array JSON con las secciones de contenido en español';
COMMENT ON COLUMN public.home_content.sections_en IS 'Array JSON con las secciones de contenido en inglés';

