-- =============================================================================
-- SCRIPT PARA AGREGAR NUEVO USUARIO AL SISTEMA
-- =============================================================================
-- Este script agrega un nuevo correo a la tabla 'usuarios' para autorizarlo
-- a recibir tokens OTP y acceder al sistema.
--
-- INSTRUCCIONES:
-- 1. Reemplaza los valores marcados con ⚠️ en la llamada a la función (línea ~75)
-- 2. Ejecuta este script completo en Supabase SQL Editor
-- 3. El correo será convertido automáticamente a minúsculas
-- =============================================================================

-- Crear función que bypasea RLS usando SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.insert_usuario_admin(
    p_email TEXT,
    p_username TEXT,
    p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE(
    id BIGINT,
    email TEXT,
    username TEXT,
    full_name TEXT,
    active BOOLEAN,
    supabase_uid UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_normalized TEXT := LOWER(TRIM(p_email));
    v_username_trimmed TEXT := TRIM(p_username);
    v_full_name_trimmed TEXT := TRIM(COALESCE(p_full_name, ''));
    v_existing_full_name TEXT;
    v_user_id BIGINT;
BEGIN
    -- Verificar si el usuario ya existe
    SELECT u.id, u.full_name INTO v_user_id, v_existing_full_name
    FROM public.usuarios u
    WHERE u.email = v_email_normalized;
    
    IF v_user_id IS NOT NULL THEN
        -- Usuario existe: actualizar
        UPDATE public.usuarios u
        SET 
            active = true,
            username = v_username_trimmed,
            full_name = COALESCE(NULLIF(v_full_name_trimmed, ''), u.full_name),
            updated_at = NOW()
        WHERE u.id = v_user_id;
    ELSE
        -- Usuario no existe: insertar
        INSERT INTO public.usuarios (
            email,
            username,
            full_name,
            active,
            created_at,
            updated_at
        ) VALUES (
            v_email_normalized,
            v_username_trimmed,
            NULLIF(v_full_name_trimmed, ''),
            true,
            NOW(),
            NOW()
        );
    END IF;

    -- Retornar el usuario insertado/actualizado
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.username,
        u.full_name,
        u.active,
        u.supabase_uid,
        u.created_at
    FROM public.usuarios u
    WHERE u.email = v_email_normalized;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.insert_usuario_admin(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- =============================================================================
-- USAR LA FUNCIÓN PARA AGREGAR EL USUARIO
-- =============================================================================
-- ⚠️ REEMPLAZA LOS VALORES CON LOS DATOS REALES DEL USUARIO

SELECT * FROM public.insert_usuario_admin(
    'karim@casamolle.cl',  -- ⚠️ CAMBIAR: Correo (será convertido a minúsculas)
    'karim',                -- ⚠️ CAMBIAR: Nombre de usuario único
    'Karim Daire'           -- ⚠️ OPCIONAL: Nombre completo
);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

SELECT 
    id,
    email,
    username,
    full_name,
    active,
    supabase_uid,
    created_at,
    updated_at
FROM public.usuarios
WHERE email = 'karim@casamolle.cl';  -- ⚠️ CAMBIAR: Mismo correo (en minúsculas)
