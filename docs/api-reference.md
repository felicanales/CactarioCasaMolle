# Referencia de API — Cactario Casa Molle

Backend: FastAPI · `fastapi/app/main.py`

Todos los endpoints viven bajo la URL base del backend (Railway en prod, `http://localhost:8000` en dev).

Convención de separación:
- `/public/*` — sin autenticación. Usado por la app pública (huéspedes).
- `/staff/*` — requiere JWT válido en cookie `sb-access-token` o header `Authorization: Bearer {token}`.

---

## Auth (`/auth`)

Archivo: `backend/app/api/routes_auth.py`

| Método | Path | Auth | Rate limit | Descripción |
|--------|------|------|-----------|-------------|
| POST | `/auth/request-otp` | No | 5/min por IP | Envía código OTP al email. El email debe existir en `usuarios` con `active=true`. |
| POST | `/auth/verify-otp` | No | 10/min por IP | Verifica código OTP. Si es válido, setea cookies `sb-access-token` y `sb-refresh-token`. Retorna `{user, access_token}`. |
| POST | `/auth/master-key-login` | No | 5/min por IP | Login alternativo con clave maestra (variable de entorno). Solo para emergencias. |
| POST | `/auth/refresh` | No | — | Refresca el access token usando el refresh token (cookie). Setea nuevas cookies. |
| POST | `/auth/logout` | No | — | Limpia las cookies de sesión. |
| GET | `/auth/me` | JWT (manual) | — | Retorna info del usuario autenticado o `{authenticated: false}` si no hay sesión. |

**Body de `/auth/request-otp`:**
```json
{ "email": "usuario@ejemplo.com" }
```

**Body de `/auth/verify-otp`:**
```json
{ "email": "usuario@ejemplo.com", "token": "123456" }
```

---

## Especies (`/species`)

Archivo: `backend/app/api/routes_species.py` · Servicio: `fastapi/app/services/species_service.py`

### Endpoints públicos (sin auth)

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/species/public` | Lista especies. Query params: `q` (búsqueda), `limit` (default 50), `offset` (default 0). |
| GET | `/species/public/{slug}` | Detalle de especie por slug + lista de fotos. |

**Campos retornados (públicos):** `id`, `slug`, `nombre_común`, `scientific_name`, `habitat`, `estado_conservación`, `tipo_planta`, `distribución`, `floración`, `cuidado`, `usos`, `nombres_comunes`, `historia_y_leyendas`, `historia_nombre`, `Endémica`, `expectativa_vida`, `tipo_morfología`, `categoría_de_conservación`, `cover_photo`

### Endpoints staff (JWT requerido)

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/species/staff` | Lista completa de especies (todos los campos). Query params: `q`, `limit`, `offset`. |
| GET | `/species/staff/{species_id}` | Detalle por ID. |
| POST | `/species/staff` | Crea especie. Valida slug único. Registra en auditoría. |
| PUT | `/species/staff/{species_id}` | Actualiza especie. Limpia campos calculados antes de enviar a Supabase. Registra en auditoría. |
| DELETE | `/species/staff/{species_id}` | Elimina especie. Registra en auditoría. |

**Body de POST/PUT (campos editables):**
```json
{
  "slug": "echinopsis-atacamensis",
  "nombre_común": "Cardón",
  "scientific_name": "Echinopsis atacamensis",
  "habitat": "Desierto de Atacama",
  "tipo_morfología": "Columnar",
  "categoría_de_conservación": "LC",
  "Endémica": false,
  "...": "otros campos de texto"
}
```

> Strings vacíos en campos ENUM se convierten a `null` automáticamente.

---

## Sectores (`/sectors`)

Archivo: `backend/app/api/routes_sectors.py` · Servicio: `fastapi/app/services/sectors_service.py`

### Endpoints públicos (sin auth)

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/sectors/public` | Lista todos los sectores. Query param: `q` (búsqueda por nombre). |
| GET | `/sectors/public/{qr_code}` | Busca sector por código QR. Estrategia: exacto → `SECTOR{id}` → ilike. |
| GET | `/sectors/public/{qr_code}/species` | Lista especies del sector (solo campos públicos) buscando por QR. |

**Campos retornados (públicos):** `id`, `name`, `description`, `qr_code`

### Endpoints staff (JWT requerido)

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/sectors/staff` | Lista todos los sectores (todos los campos). |
| GET | `/sectors/staff/{sector_id}` | Detalle por ID. |
| GET | `/sectors/staff/{sector_id}/species` | Lista especies asociadas al sector. |
| POST | `/sectors/staff` | Crea sector. Registra en auditoría. |
| PUT | `/sectors/staff/{sector_id}` | Actualiza sector. Registra en auditoría. |
| PUT | `/sectors/staff/{sector_id}/species` | Actualiza lista de especies del sector. Body: `{"especie_ids": [1, 2, 3]}` |
| DELETE | `/sectors/staff/{sector_id}` | Elimina sector. Registra en auditoría. |

---

## Ejemplares (`/ejemplar`)

Archivo: `backend/app/api/routes_ejemplar.py` · Servicio: `fastapi/app/services/ejemplar_service.py`

Todos los endpoints requieren JWT. No hay endpoints públicos de ejemplares.

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/ejemplar/staff` | Lista ejemplares con filtros avanzados. Retorna `{data: [...], total: N}`. |
| GET | `/ejemplar/staff/nurseries` | Lista viveros únicos registrados en el sistema. |
| GET | `/ejemplar/staff/{ejemplar_id}` | Detalle de un ejemplar por ID. |
| POST | `/ejemplar/staff` | Crea ejemplar. Crea relación en `sectores_especies` si no existe. Registra en auditoría. |
| PUT | `/ejemplar/staff/{ejemplar_id}` | Actualiza ejemplar. Registra en auditoría. |
| DELETE | `/ejemplar/staff/{ejemplar_id}` | Elimina ejemplar. Registra en auditoría. |

**Query params de `GET /ejemplar/staff`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Búsqueda general |
| `species_id` | int | Filtrar por especie |
| `sector_id` | int | Filtrar por sector |
| `tamaño` | string | Filtrar por tamaño |
| `morfologia` | string | Filtrar por morfología |
| `nombre_comun` | string | Filtrar por nombre común |
| `health_status` | string | Filtrar por estado de salud |
| `nursery` | string | Filtrar por vivero |
| `invoice_number` | string | Filtrar por número de factura |
| `purchase_date` | date | Fecha exacta de compra |
| `purchase_date_from` | date | Rango inicio |
| `purchase_date_to` | date | Rango fin |
| `sort_by` | string | Campo de ordenamiento |
| `sort_order` | string | `asc` o `desc` |
| `limit` | int | Máximo 200. Default 50. |
| `offset` | int | Default 0. |

---

## Fotos (`/photos`)

Archivo: `backend/app/api/routes_photos.py` · Servicio: `fastapi/app/services/photos_service.py`

Los tipos de entidad válidos son: `especie`, `sector`, `ejemplar`, `home`.

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/photos/{entity_type}/{entity_id}` | JWT | Sube una o más fotos. Crea original + variantes (w=400, w=800). Body: `multipart/form-data` con campo `files`. |
| GET | `/photos/{entity_type}/{entity_id}` | No | Lista fotos de la entidad ordenadas por `order_index`. |
| GET | `/photos/{entity_type}/{entity_id}/cover` | No | Retorna la foto de portada (`is_cover=true`) de la entidad. |
| PUT | `/photos/{photo_id}` | JWT | Actualiza metadatos de una foto. Body: `{is_cover, order_index, caption}`. |
| DELETE | `/photos/{photo_id}` | JWT | Elimina foto del storage y de la tabla `fotos`. Registra en auditoría. |

**Body de POST (multipart/form-data):**
- `files`: uno o más archivos de imagen (image/*)
- `is_cover_photo_id`: (opcional) índice del archivo que será portada

**Respuesta de GET fotos:**
```json
[
  {
    "id": 1,
    "storage_path": "especies/1/foto-original.jpg",
    "public_url": "https://r2.example.com/especies/1/foto-original.jpg",
    "is_cover": true,
    "order_index": 0,
    "caption": null,
    "variants": [
      {"width": 400, "url": "https://r2.example.com/especies/1/foto-w400.jpg"},
      {"width": 800, "url": "https://r2.example.com/especies/1/foto-w800.jpg"}
    ]
  }
]
```

---

## Transacciones (`/transactions`)

Archivo: `backend/app/api/routes_transactions.py` · Servicio: `fastapi/app/services/transactions_service.py`

Todos los endpoints requieren JWT.

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/transactions/purchases` | Lista compras agrupadas por fecha, número de factura y vivero. |
| GET | `/transactions/sales` | Lista ventas agrupadas por fecha. |

**Query params comunes:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `date_from` | date | Fecha inicio del rango |
| `date_to` | date | Fecha fin del rango |
| `limit` | int | Default 50 |
| `offset` | int | Default 0 |

**Respuesta de `/transactions/purchases`:**
```json
{
  "data": [
    {
      "purchase_date": "2025-01-15",
      "nursery": "Vivero El Cactus",
      "invoice_number": "F-001",
      "items": [
        {"species_id": 1, "nombre_común": "Cardón", "cantidad": 3, "purchase_price": 5000}
      ],
      "total": 15000
    }
  ],
  "total": 1
}
```

---

## Auditoría (`/audit`)

Archivo: `backend/app/api/routes_audit.py` · Servicio: `fastapi/app/services/audit_service.py`

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/audit` | JWT | Log de auditoría filtrable. Retorna `{logs, count, limit, offset, total_available}`. |

**Query params:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `table_name` | string | Filtrar por tabla afectada (ej: `especies`) |
| `record_id` | int | Filtrar por ID del registro |
| `user_id` | uuid | Filtrar por usuario |
| `limit` | int | Default 50 |
| `offset` | int | Default 0 |

---

## Contenido del Home (`/home-content`)

Archivo: `backend/app/api/routes_home_content.py` · Servicio: `fastapi/app/services/home_content_service.py`

Gestiona el contenido dinámico de la página de inicio de la app pública (título, descripción, carrusel de imágenes, etc.).

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/home-content/public` | No | Contenido del home para la app pública. Query param: `lang` (`es` o `en`, default `es`). |
| GET | `/home-content/staff` | JWT | Contenido del home para edición (todos los campos). |
| POST | `/home-content/staff/upload-image` | JWT | Sube imagen para el carrusel. Redimensiona a máximo 2048px. |
| POST | `/home-content/staff` | JWT | Crea o actualiza el contenido del home. |
| PUT | `/home-content/staff` | JWT | Alias de POST staff. |

---

## Debug (`/debug`)

Archivo: `backend/app/api/routes_debug.py`

**Solo disponible si** la variable de entorno `ENABLE_DEBUG_ROUTES=true` o `DEBUG=true`.

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/debug/` | Ping |
| GET | `/debug/routes` | Lista todas las rutas registradas en la app |
| GET | `/debug/auth-status` | Estado de tokens en cookies |
| GET | `/debug/supabase-status` | Conectividad a Supabase |
| GET | `/debug/cors-status` | Configuración CORS activa |
| GET | `/debug/environment` | Info completa del entorno (Railway, Supabase, R2, dependencias) |
| GET | `/debug/cookies` | Debug de cookies y headers del request |

---

## Endpoints especiales

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Info básica de la API (versión, entorno) |
| GET | `/health` | No | Health check para Railway. Retorna `{"status": "ok"}`. |
| OPTIONS | `/{path}` | No | CORS preflight handler |

---

## Notas de uso

### Autenticación en el frontend

```js
// nextjs — con AuthContext
const { apiRequest } = useAuth();
const data = await apiRequest(`${getApiUrl()}/staff/species`, { method: "GET" });

// nextjs — con fetch directo
import { getAccessTokenFromContext } from "@/utils/auth-helpers";
const token = getAccessTokenFromContext(accessToken);
const res = await fetch(`${getApiUrl()}/species/staff`, {
  headers: { Authorization: `Bearer ${token}` }
});

// mobile — axios sin auth
import { speciesApi } from "@/utils/api";
const species = await speciesApi.getBySlug("echinopsis-atacamensis");
```

### CORS configurado

El backend acepta requests desde:
- `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`
- `https://*.railway.app` (regex)
- `https://*.ngrok*` (regex — para desarrollo con túnel)

### Formato de errores

```json
{ "detail": "Descripción del error" }
```

Los errores de autenticación retornan `401`. Los de validación retornan `422`.
