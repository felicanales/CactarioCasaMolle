# Deployment y Configuración — Cactario Casa Molle

---

## Desarrollo local

### Prerrequisitos

- Node.js 18+
- Python 3.9+
- Acceso a las variables de entorno del proyecto (ver sección siguiente)

### Comandos

```bash
# Instalar dependencias (una sola vez)
cd nextjs && npm install
cd ../mobile && npm install
cd ../fastapi && pip install -r requirements.txt

# Levantar todos los servicios en paralelo (desde la raíz CactarioCasaMolle/)
npm run start:all

# O individualmente:
npm run dev:nextjs        # WMS Staff en http://localhost:3000
npm run dev:mobile        # App pública en http://localhost:3002
npm run start:fastapi     # Backend API en http://localhost:8000

# FastAPI con recarga automática:
cd fastapi
uvicorn app.main:app --reload --port 8000
```

---

## Variables de entorno

### Backend — `fastapi/.env`

```bash
# Supabase (obligatorio)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT
JWT_SECRET=<mismo valor que el JWT secret de Supabase>
JWT_EXPIRE_MIN=120

# Cloudflare R2 (obligatorio para fotos)
R2_ACCOUNT_ID=<account_id>
R2_ACCESS_KEY_ID=<access_key>
R2_SECRET_ACCESS_KEY=<secret_key>
R2_BUCKET=<bucket_name>
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://<custom_domain_o_r2_public_url>
R2_SIGNED_URL_TTL=3600

# Almacenamiento (opcional — defaults: R2 primario, sin dual-write)
STORAGE_READ_SOURCE=r2            # r2 | supabase
STORAGE_DUAL_WRITE_SUPABASE=false # true | false
STORAGE_FALLBACK_SUPABASE=true    # true | false
STORAGE_R2_WRITE_RETRIES=1

# SMTP para envío de OTP (obligatorio para login)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=usuario@ejemplo.com
SMTP_PASS=<password>
SMTP_FROM=noreply@casamolle.cl

# Entorno
IS_PRODUCTION=true               # Solo en Railway. Controla samesite/secure de cookies.
ENABLE_DEBUG_ROUTES=false        # true para activar /debug/* endpoints
```

### WMS Staff — `nextjs/.env.local`

```bash
# URL del backend (obligatorio)
NEXT_PUBLIC_API_URL=https://<backend>.railway.app
# En desarrollo: http://localhost:8000

# URL pública de R2 (debe coincidir con R2_PUBLIC_BASE_URL del backend)
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://<custom_domain_o_r2_public_url>

# Opciones de desarrollo
NEXT_PUBLIC_BYPASS_AUTH=false    # true para saltarse el login en desarrollo
NEXT_PUBLIC_AUTH_DEBUG=false     # true para mostrar panel de debug de auth
```

### App Pública — `mobile/.env.local`

```bash
# URL del backend (obligatorio)
NEXT_PUBLIC_API_URL=https://<backend>.railway.app
# En desarrollo: http://localhost:8000

# URL pública de R2
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://<custom_domain_o_r2_public_url>

# Opciones de desarrollo
NEXT_PUBLIC_ENABLE_LOGS=false    # true para mostrar logs de API en consola
```

---

## Deploy en Railway

El proyecto tiene tres servicios Railway independientes, cada uno con su propio `railway.json`.

### Estructura de servicios

| Servicio | Directorio raíz | Runtime detectado |
|----------|----------------|------------------|
| Backend API | `fastapi/` | Python (Dockerfile) |
| WMS Staff | `nextjs/` | Node.js (Dockerfile) |
| App Pública | `mobile/` | Node.js (nixpacks.toml) |

### Setup inicial (primera vez)

1. Conectar el repositorio GitHub al proyecto Railway.
2. Crear tres servicios, uno por directorio.
3. Configurar las variables de entorno en cada servicio (Railway Dashboard → Settings → Variables).
4. Asegurarse de que `IS_PRODUCTION=true` está seteado en el backend.
5. El deploy se dispara automáticamente en cada push a `main`.

### Health check

El backend expone `GET /health` → `{"status": "ok"}`. Railway lo usa para verificar que el servicio arrancó correctamente.

### Rollback

Disponible desde Railway Dashboard → Deployments → seleccionar deploy anterior → Rollback.

---

## Gestión de usuarios (whitelist)

El sistema usa una whitelist basada en la tabla `usuarios`. Solo los emails registrados con `active = true` pueden hacer login.

### Agregar un nuevo usuario

1. Abrir el SQL Editor de Supabase.
2. Ejecutar el script `agregar_usuario.sql` (raíz del proyecto), reemplazando los valores marcados:

```sql
SELECT * FROM public.insert_usuario_admin(
    'email@casamolle.cl',   -- email del usuario (se normaliza a minúsculas)
    'username_unico',        -- username único
    'Nombre Apellido'        -- nombre completo (opcional)
);
```

El script crea la función `insert_usuario_admin` si no existe y la ejecuta.

**Comportamiento:**
- Si el email ya existe pero está inactivo → lo reactiva.
- Si el email ya existe y está activo → actualiza username y full_name.
- El campo `supabase_uid` se sincroniza automáticamente al primer login.

**Error común:** _"Este correo no está autorizado"_ → el email no está en `usuarios` o tiene `active = false`.

---

## Setup de la tabla `home_content`

Si el endpoint `/home-content` devuelve error 500, la tabla no existe. Ejecutar en el SQL Editor de Supabase:

```bash
# El schema está en:
fastapi/app/core/home_content_schema.sql
```

El script crea:
- Tabla `home_content` con columnas `welcome_text`, `carousel_images` (JSONB), `sections` (JSONB), `is_active`.
- Índices de optimización.
- Policies RLS (lectura pública para registros activos, escritura solo staff).
- Trigger para `updated_at` automático.

**Reglas:**
- Solo puede haber un registro con `is_active = true` a la vez.
- El endpoint público solo retorna el registro activo.

---

## Billing de infraestructura

### Railway

- Plan: Hobby Workspace (usage-based).
- Cuenta: `felcanales@alumnos.uai.cl` (GitHub).
- Billing email: `claudia@casamolle.cl`.
- Tarjeta: terminada en `9456`.
- Costo histórico: ~$5/mes.

### Cloudflare R2

- Cuenta: `felcanales@alumnos.uai.cl` (GitHub).
- Servicio: R2 Object Storage.
- Costo: $0.00/mes (dentro del free tier).
- Renovación: mensual.
