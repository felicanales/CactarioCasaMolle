-- =============================================================================
-- SCRIPT PARA AGREGAR NUEVO USUARIO AL SISTEMA
-- =============================================================================
-- Este script agrega un nuevo correo a la tabla 'usuarios' para autorizarlo
-- a recibir tokens OTP y acceder al sistema.
--
-- INSTRUCCIONES:
-- 1. Reemplaza 'nuevo_correo@ejemplo.com' con el correo real que quieres agregar
-- 2. Reemplaza 'nombre_usuario' con un nombre de usuario único (puede ser el mismo email sin @)
-- 3. Opcionalmente, agrega el nombre completo en 'Nombre Completo'
-- 4. Ejecuta este script en Supabase SQL Editor
-- =============================================================================

-- IMPORTANTE: Reemplaza estos valores con los datos reales del nuevo usuario
-- El email debe estar en minúsculas y coincidir exactamente con el que agregaste en Supabase Auth

INSERT INTO public.usuarios (
    email,
    username,
    full_name,
    active,
    created_at,
    updated_at
) VALUES (
    'felicaniu@gmail.com',  -- ⚠️ CAMBIAR: Correo del nuevo usuario (minúsculas)
    'felipecanales',              -- ⚠️ CAMBIAR: Nombre de usuario único (puede ser el email sin @)
    'Felipe Canales',             -- ⚠️ OPCIONAL: Nombre completo del usuario
    true,                          -- ✅ Debe ser true para que el usuario pueda iniciar sesión
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    active = true,                 -- Activar si el usuario ya existía pero estaba inactivo
    updated_at = NOW();

-- =============================================================================
-- VERIFICACIÓN: Verifica que el usuario se agregó correctamente
-- =============================================================================

SELECT 
    id,
    email,
    username,
    full_name,
    active,
    supabase_uid,
    created_at
FROM public.usuarios
WHERE email = 'felicaniu@gmail.com';  -- ⚠️ CAMBIAR: Mismo correo que arriba

-- =============================================================================
-- NOTAS IMPORTANTES:
-- =============================================================================
-- 1. El campo 'supabase_uid' se sincronizará automáticamente cuando el usuario
--    inicie sesión por primera vez (el sistema lo hace en routes_auth.py)
--
-- 2. Si el correo ya existe en la tabla pero está inactivo (active=false),
--    este script lo activará automáticamente
--
-- 3. El email debe coincidir EXACTAMENTE (incluyendo mayúsculas/minúsculas)
--    con el que agregaste en Supabase Auth. El sistema convierte a minúsculas,
--    así que usa minúsculas aquí también.
--
-- 4. El username debe ser único. Si ya existe, el script fallará.
--    Puedes usar el email sin el @ como username, por ejemplo:
--    'usuario@ejemplo.com' → username: 'usuario.ejemplo.com'
-- =============================================================================

