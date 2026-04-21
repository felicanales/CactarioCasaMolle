# CactarioCasaMolle — Contexto de Desarrollo

## Visión General del Proyecto

Sistema web para un hotel con dos aplicaciones interconectadas por una sola base de datos en Supabase:

1. **WMS interno (`nextjs/`)** — Staff del hotel. Gestión de inventario de cactus: especies, sectores, ejemplares, compras, movimientos y trazabilidad. Genera los QR que alimentan la app pública.
2. **App pública (`mobile/`)** — Huéspedes. Exploran el cactario del hotel escaneando códigos QR. Acceso de solo lectura, sin autenticación.

**Stack completo:**

* Backend: FastAPI (Python), deployado en Railway
* Base de datos y Auth: Supabase
* Storage de imágenes: Cloudflare R2 (con fallback/dual-write a Supabase Storage)
* Frontend interno: Next.js (`nextjs/`)
* Frontend público: Next.js (`mobile/`)
* Infraestructura: Railway para todos los servicios

---

## Arquitectura del Backend

### Patrón dominante

```
routes_*.py  →  services_*.py  →  Supabase (via cliente Python)
```

Cada recurso tiene su par ruta/servicio. Las rutas no contienen lógica de negocio — solo validan, extraen contexto del request (usuario, IP, user-agent) y delegan al servicio.

### Segmentación de API

Cada router de recurso expone **dos grupos de endpoints**:

| Grupo   | Prefijo   | Auth                        | Uso                        |
| ------- | --------- | --------------------------- | -------------------------- |
| Público | `/public` | Ninguna                     | App móvil / huéspedes / QR |
| Staff   | `/staff`  | `Depends(get_current_user)` | WMS interno                |

Ejemplo en `routes_species.py`:

- `GET /public` y `GET /public/{slug}` → sin auth
- `GET|POST|PUT|DELETE /staff/*` → con `Depends(get_current_user)` del `AuthMiddleware`

Cuando escribas nuevas rutas, respeta siempre esta separación.

### Clientes Supabase

Los servicios usan distintos clientes según el contexto:

- `get_public_clean()` — para consultas públicas (sin exponer datos internos)
- `get_public()` / `get_service()` — para operaciones de staff/admin

### Campos públicos vs internos

Los servicios definen explícitamente qué campos son visibles al público. Ejemplo: `PUBLIC_SPECIES_FIELDS` en `species_service.py`. Al crear endpoints públicos, usa siempre la lista de campos permitidos — nunca expongas el objeto completo de la tabla.

---

## Autenticación y Seguridad (`core/security.py`)

### Flujo completo

1. Login por OTP (email) definido en `routes_auth.py`
2. Al autenticar, se setean cookies: `sb-access-token` y `sb-refresh-token`
3. El middleware extrae el JWT desde `Authorization: Bearer ...` (header) o desde la cookie como fallback
4. `validate_supabase_jwt` verifica el token contra Supabase Auth
5. `validate_user_active` comprueba en la tabla `usuarios` que el usuario esté activo

### Configuración por entorno

`security.py` detecta el entorno a través de la variable de Railway `IS_PRODUCTION`:

| Entorno | samesite | secure  | Propósito                                           |
| ------- | -------- | ------- | --------------------------------------------------- |
| Dev     | `lax`    | `False` | Permite HTTP en localhost                           |
| Prod    | `none`   | `True`  | Permite cookies cross-domain entre dominios Railway |

Nunca hardcodees `samesite` o `secure` — siempre usa la lógica de `IS_PRODUCTION`.

### En el frontend (`AuthContext`)

- `getAccessTokenFromContext` tiene prioridad: estado AuthContext → cookie → localStorage
- Existe el flag `BYPASS_AUTH` (controlado por `NEXT_PUBLIC_BYPASS_AUTH=true`) para saltarse la auth en desarrollo local
- El refresh automático del token está manejado dentro de `AuthContext`

---

## Media Pipeline (Fotos)

**Archivo clave:** `photos_service.py` + `storage_router.py`

Flujo:

1. `photos_service.py` recibe el archivo, sube el original más variantes (thumbnails, etc.)
2. Persiste la metadata en la tabla `fotos` de Supabase
3. Delega el almacenamiento físico a `storage_router.py`, que escribe en **Cloudflare R2** con fallback/dual-write a Supabase Storage

Cuando añadas lógica de fotos:

- No escribas lógica de storage directamente en rutas o servicios de recursos — delega siempre a `photos_service`
- El componente frontend correspondiente es `PhotoUploader` / `PhotoGallery` / `AuthenticatedImage`

---

## Auditoría (`audit_service.py`)

Todas las operaciones de creación, actualización y eliminación deben llamar a `audit_service.log_change`. Este método registra en la tabla `auditoria_cambios` los valores anteriores y nuevos, junto con el usuario, IP y user-agent del request.

Patrón en servicios:

```python
# Siempre propaga estos datos desde la ruta al servicio
user_id: str
user_email: str
user_name: str
ip: str
user_agent: str

# Y llama al final de toda mutación exitosa:
await audit_service.log_change(
    tabla="especies",
    registro_id=record_id,
    accion="update",  # create | update | delete
    valores_anteriores=old_data,
    valores_nuevos=new_data,
    usuario_id=user_id,
    usuario_email=user_email,
    ip=ip,
    user_agent=user_agent
)
```

---

## Tablas Supabase (referencia rápida)

| Tabla               | Descripción                                         |
| ------------------- | --------------------------------------------------- |
| `especies`          | Catálogo de especies de cactus                      |
| `sectores`          | Sectores físicos del cactario en el hotel           |
| `ejemplar`          | Ejemplares individuales (instancias de especies)    |
| `fotos`             | Metadata de imágenes (rutas R2/Supabase, variantes) |
| `usuarios`          | Usuarios del sistema (staff) con flag `activo`      |
| `auditoria_cambios` | Log de todas las mutaciones del sistema             |

---

## Frontend — Patrones Clave

### Acceso a la API

Siempre usa `getApiUrl()` de `utils/api-config.js` para construir URLs. Nunca hardcodees la URL base.

```js
import { getApiUrl } from "@/utils/api-config";
const res = await fetch(`${getApiUrl()}/staff/species/${id}`);
```

### Autenticación en componentes

```js
import { getAccessTokenFromContext } from "@/utils/auth-helpers";
// No accedas a localStorage directamente — usa el helper
```

### Componentes reutilizables existentes

Antes de crear componentes nuevos de fotos o imágenes autenticadas, verifica si ya existen:

- `PhotoUploader` — subida de fotos
- `PhotoGallery` — galería de fotos de un recurso
- `AuthenticatedImage` — imagen que requiere token para cargarse

### Estructuras

- `nextjs/src/app/` — páginas del WMS (staff)
- `nextjs/src/components/` — componentes del WMS
- `mobile/src/app/` — páginas de la app pública
- `mobile/src/components/` — componentes de la app pública

---

## Nota Estructural Importante

Los archivos `fastapi/app/schemas/species.py` y `fastapi/app/schemas/sectors.py` están **vacíos**. La validación y tipado actualmente está hecho inline en las rutas/servicios y con los modelos Pydantic de auth.

Si se añaden Pydantic schemas para nuevos recursos, créalos en `fastapi/app/schemas/` siguiendo la convención `{recurso}.py`.

---

## Convenciones al Escribir Código Nuevo

1. **Rutas**: siempre en `fastapi/app/api/routes_{recurso}.py`. Separa `/public` de `/staff`. Extrae usuario, IP y user-agent del request para pasarlos al servicio.
2. **Servicios**: en `fastapi/app/services/{recurso}_service.py`. Toda la lógica de negocio aquí.
3. **Auditoría obligatoria**: toda mutación (create/update/delete) debe llamar a `audit_service.log_change`.
4. **Payload limpio**: en updates, elimina campos calculados/readonly del payload antes de enviar a Supabase. Convierte strings vacíos a `None` para campos ENUM.
5. **Slugs**: validar unicidad antes de crear/actualizar.
6. **No romper el contrato público**: cualquier cambio en endpoints `/public` puede afectar la app de huéspedes y los QR impresos. Tratar estos endpoints como una API pública estable.
