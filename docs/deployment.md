# Deployment y Configuración — Cactario Casa Molle

---

## Desarrollo local

### Prerrequisitos

- Node.js 22.13+ (solo si se ejecuta sin Docker)
- Python 3.11.x (solo si se ejecuta el backend sin Docker)
- Docker Desktop, si se usara la ejecucion con contenedores
- Acceso a las variables de entorno del proyecto (ver sección siguiente)

### Comandos

```bash
# Instalar dependencias (una sola vez)
cd wms && npm install
cd ../app-qr && npm install
cd ../backend && pip install -r requirements.txt

# Levantar todos los servicios en paralelo (desde la raíz CactarioCasaMolle/)
npm run start:all

# O individualmente:
npm run dev:wms        # WMS Staff en http://localhost:3001
npm run dev:app-qr     # App QR en http://localhost:3002
npm run start:backend  # Backend API en http://localhost:8000

# Backend con recarga automática:
cd backend
uvicorn app.main:app --reload --port 8000
```

### Docker Compose

La raiz del repositorio incluye `compose.yaml` para construir y ejecutar localmente los tres servicios del proyecto. Cada servicio crea su propia imagen local: `backend`, `wms` y `app-qr`.

El backend del contenedor usa `backend/Dockerfile`, basado en `python:3.11-slim`; no usa el Python instalado en Windows. Esto evita problemas de dependencias cuando la maquina local tiene otra version de Python.

```bash
# backend/.env debe contener los secretos del backend.
# .env en la raiz solo contiene variables NEXT_PUBLIC_* de build.
cp compose.env.example .env

# Crear las imagenes de todo el proyecto
docker compose build

# Crear imagenes y levantar todos los servicios
docker compose up --build
```

En PowerShell, usar `Copy-Item compose.env.example .env` en lugar de `cp`.

| Servicio | Puerto local |
|----------|--------------|
| Backend API | `http://localhost:8000` |
| WMS Staff | `http://localhost:3001` |
| App QR | `http://localhost:3002` |

Comandos utiles:

```bash
# Levantar solo el backend local
docker compose up backend --build

# Levantar backend + WMS
docker compose up backend wms --build

# Levantar todo en segundo plano
docker compose up --build -d

# Ver estado de contenedores
docker compose ps

# Ver logs del backend
docker compose logs backend --tail=100

# Validar health check
curl http://localhost:8000/health
```

### Alcance del backend Docker local

El backend Docker local **no se conecta al backend de Railway**. Es otra instancia de FastAPI corriendo en `localhost:8000`.

```text
Docker backend local -> Supabase / R2
Railway backend      -> Supabase / R2
```

No existe una llamada intermedia:

```text
Docker backend local -> Railway backend
```

La conexion a Supabase/R2 depende exclusivamente de las variables en `backend/.env`. Si ese archivo apunta al mismo proyecto Supabase usado en produccion, cualquier mutacion hecha desde Docker local tambien queda visible para el backend de Railway, porque ambos leen la misma base de datos.

Antes de migraciones masivas o pruebas destructivas, confirmar `SUPABASE_URL` y las keys en `backend/.env`.

Los archivos `.dockerignore` excluyen `.env`, dependencias y artefactos locales de las imagenes. Los frontends en Compose ejecutan Next.js standalone y no observan cambios del código fuente. Después de modificar JSX o variables `NEXT_PUBLIC_*`, reconstruir el servicio afectado:

```bash
docker compose up -d --build wms
docker compose up -d --build app-qr
```

Para hot reload, detener el contenedor que ocupa el puerto y ejecutar el servidor de desarrollo:

```bash
docker compose stop wms
npm run dev:wms
```

---

## Variables de entorno

### Backend — `backend/.env`

```bash
# Supabase (obligatorio)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT
JWT_SECRET=<mismo valor que el JWT secret de Supabase>
JWT_EXPIRE_MIN=120

# Login alternativo por clave maestra (opcional, recomendado para scripts/migraciones)
MASTER_LOGIN_KEY=<clave_larga_y_secreta>

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

En Docker/local, si el WMS usa el login con clave maestra, `MASTER_LOGIN_KEY` debe estar en `backend/.env`. Configurar esta variable solo en Railway no habilita `/auth/master-key-login` en el contenedor local.

### WMS Staff — `wms/.env.local`

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

### App QR — `app-qr/.env.local`

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

El proyecto tiene tres servicios Railway independientes, cada uno con su propio `railway.json` y `Dockerfile`. Railway no ejecuta `compose.yaml` como un unico servicio: cada entrada del compose corresponde a un servicio Railway separado.

### Estructura de servicios

| Servicio | Directorio raíz | Archivo Config as Code | Watch path |
|----------|----------------|------------------------|------------|
| Backend API | `backend/` | `/backend/railway.json` | `/backend/**` |
| WMS Staff | `wms/` | `/wms/railway.json` | `/wms/**` |
| App QR | `app-qr/` | `/app-qr/railway.json` | `/app-qr/**` |

### Setup inicial (primera vez)

1. Conectar el repositorio GitHub al proyecto Railway.
2. Crear tres servicios, con Root Directory `backend/`, `wms/` y `app-qr/` respectivamente. Railway detecta el `Dockerfile` en la raiz de cada servicio.
3. En la configuracion como codigo de cada servicio, asignar respectivamente `/backend/railway.json`, `/wms/railway.json` y `/app-qr/railway.json`; Railway no resuelve automaticamente estos archivos desde el Root Directory de un monorepo.
4. En `Settings` de cada servicio, configurar su Watch Path según la tabla anterior. Los patrones se evalúan desde la raíz del repositorio.
5. Configurar las variables de entorno en cada servicio (Railway Dashboard → Settings → Variables). Para `wms/` y `app-qr/`, las variables `NEXT_PUBLIC_*` se consumen durante el build de Docker y requieren redeploy al cambiar.
6. Asegurarse de que `IS_PRODUCTION=true` está seteado en el backend.
7. Con los watch paths correctos, el deploy del servicio afectado se dispara automáticamente en cada push a `main`.

Referencia Railway: [Monorepos y Watch Paths](https://docs.railway.com/guides/monorepo), [Config as Code](https://docs.railway.com/config-as-code/reference) y [Dockerfiles](https://docs.railway.com/deploy/dockerfiles).

### Migración de carpetas y deploy omitido

El repositorio usó anteriormente `nextjs/`, `mobile/` y `fastapi/`. Las carpetas vigentes son `wms/`, `app-qr/` y `backend/`. Los servicios creados antes de la migración pueden conservar watch paths antiguos en Railway.

Síntoma en el status del commit:

```text
No deployment needed - watched paths not modified
```

Si un cambio en `wms/` presenta ese estado:

1. Abrir el servicio `Frontend inventario` en Railway.
2. Cambiar `Root Directory` a `/wms`, `Config as Code` a `/wms/railway.json` y `Watch Paths` a `/wms/**`.
3. Usar **Deploy Latest Commit** para desplegar el último commit de `main`.

Aplicar el mismo procedimiento con `/app-qr/**` o `/backend/**` si esos servicios omiten cambios de sus carpetas actuales. `Redeploy` de un deploy anterior no incorpora commits nuevos.

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
backend/app/core/home_content_schema.sql
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
