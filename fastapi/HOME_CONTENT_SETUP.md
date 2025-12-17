# Configuración de Home Content

Este documento explica cómo configurar la tabla `home_content` en Supabase para que el editor del home funcione correctamente.

## Problema

Si ves un error 500 al intentar acceder al editor del home (`/home-content`), es probable que la tabla `home_content` no exista en tu base de datos de Supabase.

## Solución

### Paso 1: Acceder a Supabase SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**

### Paso 2: Ejecutar el Script SQL

Copia y pega el contenido completo del archivo `app/core/home_content_schema.sql` en el editor SQL y ejecútalo.

El script creará:
- La tabla `home_content` con todas las columnas necesarias
- Índices para optimizar las consultas
- Políticas RLS (Row Level Security) para acceso público y staff
- Un trigger para actualizar automáticamente `updated_at`

### Paso 3: Verificar

Después de ejecutar el script, deberías poder:
- Acceder a `/home-content` en el panel de staff sin errores
- Ver contenido por defecto si no hay datos
- Crear y editar contenido del home

## Estructura de la Tabla

La tabla `home_content` tiene las siguientes columnas:

- `id` (BIGSERIAL): ID único del registro
- `welcome_text` (TEXT): Texto de bienvenida
- `carousel_images` (JSONB): Array de imágenes para el carrusel
- `sections` (JSONB): Array de secciones de contenido
- `is_active` (BOOLEAN): Indica si el contenido está activo
- `created_at` (TIMESTAMPTZ): Fecha de creación
- `updated_at` (TIMESTAMPTZ): Fecha de última actualización

## Notas

- Solo puede haber un registro con `is_active = true` a la vez
- El endpoint público solo retorna registros activos
- El endpoint staff puede ver todos los registros

