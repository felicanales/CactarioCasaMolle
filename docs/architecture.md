# Arquitectura del Sistema — Cactario Casa Molle

Sistema de gestión de cactáceas para un hotel boutique. Permite al staff administrar el inventario (especies, sectores, ejemplares, fotos, compras) y a los huéspedes explorar el cactario escaneando códigos QR.

---

## C4 Level 1 — Contexto del Sistema

Muestra quién interactúa con el sistema y qué sistemas externos utiliza.

```mermaid
C4Context
  title Cactario Casa Molle — Contexto del sistema

  Person(staff, "Staff del hotel", "Administra inventario de cactus, sectores y fotos desde el WMS interno")
  Person(huesped, "Huésped", "Escanea QR en el cactario y explora especies desde su celular")

  System(cactario, "Sistema Cactario Casa Molle", "WMS interno + App pública conectados por un backend FastAPI y una base de datos Supabase")

  System_Ext(supabase, "Supabase", "PostgreSQL + Auth (OTP) + Storage (fallback de imágenes)")
  System_Ext(r2, "Cloudflare R2", "Almacenamiento primario de imágenes y variantes")
  System_Ext(railway, "Railway", "Plataforma que construye y ejecuta 3 servicios Docker independientes")

  Rel(staff, cactario, "Gestiona inventario via WMS", "HTTPS")
  Rel(huesped, cactario, "Explora cactario via QR", "HTTPS")
  Rel(cactario, supabase, "Lee/escribe datos y autentica usuarios", "HTTPS + JWT")
  Rel(cactario, r2, "Sube y sirve imágenes", "HTTPS S3-compatible")
  Rel(cactario, railway, "Desplegado desde GitHub con un Dockerfile por servicio", "CI/CD")
```

---

## C4 Level 2 — Contenedores de aplicación

Muestra los tres servicios del sistema y cómo se comunican. Cada contenedor de aplicación corresponde a una imagen Docker desplegable de forma independiente.

```mermaid
C4Container
  title Cactario Casa Molle — Contenedores

  Person(staff, "Staff del hotel")
  Person(huesped, "Huésped")

  System_Boundary(cactario, "Sistema Cactario Casa Molle") {
    Container(wms, "WMS Staff (wms/)", "Next.js 15 · React 19 · Node.js 22 · Docker", "Panel de gestión interna. Contenedor :3000, publicado localmente en :3001")
    Container(app_qr, "App QR pública (app-qr/)", "Next.js 15 · React 19 · Node.js 22 · Docker", "Experiencia huéspedes y escáner QR. Contenedor :3000, publicado localmente en :3002")
    Container(backend, "Backend API (backend/)", "FastAPI 0.119 · Python 3.11 · Docker", "API REST con endpoints /public y /staff. Contenedor y puerto local :8000")
  }

  ContainerDb(supabase_db, "PostgreSQL", "Supabase", "Base de datos principal: especies, ejemplares, sectores, fotos, usuarios, auditoría")
  Container_Ext(supabase_auth, "Supabase Auth", "Supabase", "Autenticación OTP por email + emisión de JWT")
  Container_Ext(r2, "R2 Bucket", "Cloudflare", "Imágenes originales + variantes (w=400, w=800)")

  Rel(staff, wms, "Usa", "HTTPS / Browser")
  Rel(huesped, app_qr, "Usa", "HTTPS / Browser")
  Rel(wms, backend, "Llama a /staff/*", "HTTPS + JWT cookie")
  Rel(app_qr, backend, "Llama a /public/*", "HTTPS / sin auth")
  Rel(backend, supabase_db, "Lee y escribe datos", "Supabase SDK Python")
  Rel(backend, supabase_auth, "Valida JWT + OTP", "Supabase SDK")
  Rel(backend, r2, "Sube imágenes (S3-compatible)", "boto3")
```

---

## Vista de despliegue — Local con Docker Compose

`compose.yaml` orquesta el mismo conjunto de tres servicios para desarrollo o validación local. Supabase y R2 siguen siendo servicios cloud externos; no se crean contenedores de base de datos ni storage local.

```mermaid
flowchart LR
  browser_staff["Browser staff<br/>localhost:3001"]
  browser_guest["Browser huésped<br/>localhost:3002"]

  subgraph compose["Docker Compose — red cactario-casa-molle_default"]
    wms_local["wms<br/>Next.js standalone<br/>host 3001 → container 3000"]
    app_local["app-qr<br/>Next.js standalone<br/>host 3002 → container 3000"]
    backend_local["backend<br/>FastAPI / Uvicorn<br/>host 8000 → container 8000<br/>healthcheck /health"]
  end

  supabase_local[("Supabase Cloud<br/>PostgreSQL + Auth")]
  r2_local[("Cloudflare R2")]

  browser_staff --> wms_local
  browser_guest --> app_local
  wms_local -->|"NEXT_PUBLIC_API_URL<br/>http://localhost:8000"| backend_local
  app_local -->|"NEXT_PUBLIC_API_URL<br/>http://localhost:8000"| backend_local
  backend_local --> supabase_local
  backend_local --> r2_local
```

| Servicio Compose | Contexto de build | Puerto contenedor | Puerto host | Configuración |
|------------------|-------------------|-------------------|-------------|---------------|
| `backend` | `./backend` | `8000` | `8000` | Imagen `python:3.11-slim`; secretos runtime desde `backend/.env`; `IS_PRODUCTION=false`; `ENABLE_DEBUG_ROUTES=false` |
| `wms` | `./wms` | `3000` | `3001` | `NEXT_PUBLIC_*` incorporadas durante build; `depends_on: backend (healthy)` |
| `app-qr` | `./app-qr` | `3000` | `3002` | `NEXT_PUBLIC_*` incorporadas durante build; `depends_on: backend (healthy)` |

El backend local en Docker es una instancia propia de FastAPI. No llama al backend de Railway ni reutiliza su runtime. Se conecta directamente a Supabase y R2 con las variables de `backend/.env`. Si ese `.env` apunta al mismo proyecto Supabase de producción, los datos creados o modificados localmente quedan disponibles para Railway porque ambos backends leen la misma base.

Los frontends esperan el health check exitoso de `backend` antes de iniciarse. Los archivos `.dockerignore` impiden copiar archivos `.env` locales a las imágenes.

Los contenedores `wms` y `app-qr` ejecutan el build standalone de Next.js. No montan `src/` ni ofrecen hot reload: un cambio de JSX requiere reconstruir el servicio correspondiente con `docker compose up -d --build wms` o `docker compose up -d --build app-qr`. Para desarrollo interactivo se usan los comandos `npm run dev:wms` y `npm run dev:app-qr`.

---

## Vista de despliegue — Railway

En producción, Railway no ejecuta `compose.yaml` como una unidad. El repositorio se conecta a tres servicios Railway separados; cada servicio usa su directorio raíz, su `Dockerfile` y su `railway.json`.

```mermaid
flowchart LR
  github["Repositorio GitHub<br/>CactarioCasaMolle"]

  subgraph railway["Railway — producción"]
    api_prod["Servicio Backend API<br/>Root: backend/<br/>Watch: /backend/**<br/>Dockerfile + railway.json<br/>GET /health"]
    wms_prod["Servicio WMS Staff<br/>Root: wms/<br/>Watch: /wms/**<br/>Dockerfile + railway.json"]
    qr_prod["Servicio App QR<br/>Root: app-qr/<br/>Watch: /app-qr/**<br/>Dockerfile + railway.json"]
  end

  staff_prod["Staff"] -->|"HTTPS"| wms_prod
  guest_prod["Huésped"] -->|"HTTPS"| qr_prod
  wms_prod -->|"HTTPS /staff/*"| api_prod
  qr_prod -->|"HTTPS /public/*"| api_prod
  api_prod --> supabase_prod[("Supabase")]
  api_prod --> r2_prod[("Cloudflare R2")]

  github -.->|"build Docker"| api_prod
  github -.->|"build Docker"| wms_prod
  github -.->|"build Docker"| qr_prod
```

| Servicio Railway | Directorio raíz | Archivo de config | Watch path | Configuración relevante |
|------------------|-----------------|-------------------|------------|------------------------|
| Backend API | `backend/` | `/backend/railway.json` | `/backend/**` | Dockerfile `python:3.11-slim` + Uvicorn; `runtime.txt` declara `python-3.11.9`; secretos runtime; `IS_PRODUCTION=true`; health check `/health` |
| WMS Staff | `wms/` | `/wms/railway.json` | `/wms/**` | Node.js 22 + Next.js standalone; `NEXT_PUBLIC_*` durante build |
| App QR | `app-qr/` | `/app-qr/railway.json` | `/app-qr/**` | Node.js 22 + Next.js standalone; `NEXT_PUBLIC_*` durante build |

El repositorio migró los directorios de servicios de `nextjs/`, `mobile/` y `fastapi/` a `wms/`, `app-qr/` y `backend/`. Railway filtra los pushes mediante los watch paths configurados en cada servicio; si un servicio conserva una ruta anterior, reporta `No deployment needed - watched paths not modified` y no llega a leer el `railway.json` nuevo. En una migración se debe actualizar una vez el watch path en el Dashboard y ejecutar **Deploy Latest Commit**.

---

## C4 Level 3 — Componentes del Backend (`backend/`)

```mermaid
flowchart TD
  request(["Request HTTP"])

  subgraph middleware["Middleware (app/middleware/)"]
    auth_mw["auth_middleware.py\nExtrae JWT → Authorization header o cookie → request.state.user"]
    rate["rate_limiter.py\nLimitación de tasa en auth endpoints"]
    cors["CORSMiddleware en main.py\nlocales + Railway + ngrok"]
  end

  subgraph api["Capa de Rutas (app/api/) — 9 routers"]
    r_auth["routes_auth.py\n/auth · OTP · refresh · logout · /me"]
    r_species["routes_species.py\n/species · /public + /staff CRUD"]
    r_sectors["routes_sectors.py\n/sectors · /public (QR 3 estrategias) · /staff CRUD + N:M"]
    r_ejemplar["routes_ejemplar.py\n/ejemplar · /staff CRUD + 16 filtros"]
    r_photos["routes_photos.py\n/photos · upload · list · cover · delete"]
    r_tx["routes_transactions.py\n/transactions · compras + ventas agrupadas (solo lectura)"]
    r_audit["routes_audit.py\n/audit · log filtrable"]
    r_home["routes_home_content.py\n/home-content · /public + /staff · multi-idioma es|en · upload imagen"]
    r_debug["routes_debug.py\n/debug · solo ENABLE_DEBUG_ROUTES=true"]
  end

  subgraph services["Capa de Servicios (app/services/) — 7 archivos"]
    s_species["species_service.py\nCRUD · PUBLIC_SPECIES_FIELDS · slug único · cover photos"]
    s_sectors["sectors_service.py\nCRUD · búsqueda QR 3 estrategias · relación N:M sectores_especies"]
    s_ejemplar["ejemplar_service.py\nCRUD · 16 filtros · crea sectores_especies al crear ejemplar"]
    s_photos["photos_service.py\nresize max 2048px · variantes w=400/w=800 · metadata tabla fotos"]
    s_tx["transactions_service.py\nagrupa por purchase_date + nursery + invoice_number"]
    s_audit["audit_service.py\nlog_change() · get_audit_log() · siempre get_service()"]
    s_home["home_content_service.py\ncontenido dinámico · soporte es|en"]
  end

  subgraph models["Modelos ORM (app/models/) — 2 archivos"]
    m_species["species.py\nModelo Especie (28+ campos)"]
    m_sectors["sectors.py\nModelo Sector (id, name, description, qr_code único)"]
  end

  subgraph core["Infraestructura (app/core/) — 6 archivos Python + 3 SQL"]
    supabase_clients["supabase_auth.py\nget_public_clean() · get_public() · get_service()"]
    security["security.py\nJWT validation · cookies samesite/secure dinámico por IS_PRODUCTION"]
    storage_rtr["storage_router.py\nOrquesta R2 primario + Supabase fallback/dual-write"]
    r2_client["r2_storage.py\nCliente Cloudflare R2 (boto3 S3-compatible)"]
    supa_storage["supabase_storage.py\nCliente Supabase Storage (fallback)"]
    sql_files["home_content_schema.sql\nrls_policies_secure.sql\nrls_policies_ownership.sql"]
  end

  request --> cors --> auth_mw --> rate
  auth_mw --> r_auth & r_species & r_sectors & r_ejemplar & r_photos & r_tx & r_audit & r_home & r_debug
  r_species --> s_species --> supabase_clients
  r_sectors --> s_sectors --> supabase_clients
  r_ejemplar --> s_ejemplar --> supabase_clients
  r_photos --> s_photos --> storage_rtr
  storage_rtr --> r2_client & supa_storage
  s_photos --> supabase_clients
  r_tx --> s_tx --> supabase_clients
  r_audit --> s_audit --> supabase_clients
  r_home --> s_home --> supabase_clients
  s_species & s_sectors & s_ejemplar & s_photos & s_home --> s_audit
  s_species -.-> m_species
  s_sectors -.-> m_sectors
```

### Schemas Pydantic (`app/schemas/`)

Los archivos `species.py` y `sectors.py` están **vacíos** por diseño. La validación y el tipado están actualmente inline en rutas y servicios. Al crear schemas nuevos para otros recursos, seguir la convención `{recurso}.py` en este directorio.

---

## C4 Level 3 — Componentes del WMS Staff (`wms/`)

```mermaid
flowchart TD
  subgraph layout["layout.js — Proveedores globales"]
    auth_ctx["AuthContext\nJWT state · auto-refresh (<5min) · apiRequest()\nBypass auth: NEXT_PUBLIC_BYPASS_AUTH=true"]
    rq["ReactQueryProvider\nstaleTime 5min · gcTime 10min · retry 1 · refetchOnWindowFocus false"]
  end

  subgraph pages["app/ — Páginas (rutas Next.js)"]
    p_login["login/page.jsx\nOTP por email"]
    p_staff["staff/page.jsx\nHub principal · grid de módulos"]
    p_species["species/page.jsx\nCatálogo de especies + búsqueda"]
    p_editor["species-editor/page.jsx\nEditor App QR · sidebar colapsable · responsive\nmodo especies | sectores · selector con cover_photo"]
    p_sectors["sectors/page.jsx\nSectores + QR + CRUD"]
    p_inventory["inventory/page.jsx\nEjemplares + 16 filtros avanzados"]
    p_tx["transactions/page.jsx\nCompras + ventas agrupadas (solo lectura)"]
    p_audit["audit-logs/page.jsx\nHistorial de cambios filtrable"]
    p_home["home-content/page.jsx\nEditor contenido dinámico + carrusel"]
    p_reports["reports/page.jsx\nReportes"]
  end

  subgraph hooks["hooks/ — Data fetching (React Query)"]
    h_species["useSpecies.js\nuseSpeciesList · useSpecies(id)\nuseCreateSpecies · useUpdateSpecies · useDeleteSpecies"]
    h_sectors["useSectors.js\nAnálogo para sectores"]
    h_ejemplar["useEjemplares.js\nAnálogo para ejemplares"]
  end

  subgraph components["components/ — UI reutilizable"]
    photo_up["PhotoUploader.jsx\nsubida multiarchivo"]
    photo_gal["PhotoGallery.jsx\ngalería de recurso + eliminar"]
    auth_img["AuthenticatedImage.jsx\nimagen con token de auth"]
    console_s["ConsoleSilencer.jsx\nsuprime logs en producción"]
    inv_table["inventory/InventoryTable.jsx\ntabla con 16 filtros + paginación"]
    inv_modal["inventory/InventoryModal.jsx\nmodal CRUD ejemplares"]
  end

  subgraph utils["utils/ + lib/ + providers/ — Utilidades"]
    api_cfg["utils/api-config.js\ngetApiUrl()"]
    auth_h["utils/auth-helpers.js\ngetAccessTokenFromContext()\nfuente: AuthContext -> cookie legible; prod usa HttpOnly"]
    images["utils/images.js\nbuildR2PublicUrl() · resolvePhotoUrl(photo, {variant})"]
    qclient["providers/query-client.js\ninstancia QueryClient"]
    mw["middleware.js\nredirección por autenticación Next.js"]
  end

  layout --> pages
  pages --> hooks --> auth_ctx
  hooks --> api_cfg
  pages --> components
  components --> auth_h & images
```

---

## C4 Level 3 — Componentes de la App QR Pública (`app-qr/`)

```mermaid
flowchart TD
  subgraph layout_m["layout.js — Layout global"]
    header_l["Header.jsx · BottomNavigation.jsx siempre presentes"]
  end

  subgraph pages_m["app/ — Páginas (sin autenticación)"]
    p_home_m["page.js\nHome · carrusel de imágenes · contenido dinámico"]
    p_qr["qr/page.jsx\nEscáner QR (html5-qrcode) · búsqueda manual"]
    p_sectores["sectores/page.jsx\nListado de sectores"]
    p_sec_esp["sectores/[qrCode]/especies/page.jsx\nEspecies por sector vía QR"]
    p_esp_det["especies/[slug]/page.jsx\nDetalle de especie"]
  end

  subgraph comp_m["components/ — UI (6 archivos)"]
    header["Header.jsx\nlogo + navegación superior"]
    bottom_nav["BottomNavigation.jsx\nhome · sectores · qr · búsqueda"]
    carousel["ImageCarousel.jsx\ntimer auto-rotativo reiniciable + swipe touch + controles"]
    vert_car["SpeciesVerticalCarousel.jsx\ncarrusel vertical de especies"]
    auth_img_m["AuthenticatedImage.jsx"]
    console_m["ConsoleSilencer.jsx"]
  end

  subgraph utils_m["utils/ — Utilidades (2 archivos)"]
    api_m["api.js (axios)\nsectorsApi: list() · getByQr() · getSpeciesByQr()\nspeciesApi: list() · getBySlug()\ninterceptores logging (NEXT_PUBLIC_ENABLE_LOGS)\nreintentos + timeout 30s"]
    images_m["images.js\nresolvePhotoUrl() — versión simplificada sin variantes"]
  end

  layout_m --> pages_m
  p_home_m & p_sectores --> api_m
  p_sec_esp & p_esp_det --> api_m
  p_qr -->|"qrCode detectado"| p_sec_esp
  pages_m --> comp_m
  comp_m --> images_m
```

---

## Flujo de datos — Escaneo QR de huésped

```mermaid
sequenceDiagram
  actor Huésped
  participant App as App QR (app-qr)
  participant API as Backend (backend)
  participant DB as Supabase PostgreSQL
  participant R2 as Cloudflare R2

  Huésped->>App: Abre app / escanea QR
  App->>API: GET /sectors/public/{qrCode}
  API->>DB: SELECT sectores WHERE qr_code = '{qrCode}'
  DB-->>API: {id, name, description, qr_code}
  API-->>App: Sector encontrado

  App->>API: GET /sectors/public/{qrCode}/species
  API->>DB: JOIN sectores_especies → especies (campos públicos)
  DB-->>API: Lista de especies con cover_photo
  API-->>App: Especies del sector

  Huésped->>App: Toca una especie
  App->>API: GET /species/public/{slug}
  API->>DB: SELECT especies + fotos WHERE slug = '{slug}'
  DB-->>API: Especie completa + lista de fotos (storage_path)
  API-->>App: Especie con galería

  App->>R2: GET URL resuelta de variante w=800
  R2-->>App: Imagen optimizada
  App-->>Huésped: Muestra detalle de especie con fotos
```

---

## Flujo de datos — Asignación de especies a un sector (staff)

```mermaid
sequenceDiagram
  actor Staff
  participant WMS as species-editor/page.jsx
  participant API as Backend (backend)
  participant Species as species_service.py
  participant Photos as photos_service.py
  participant DB as Supabase DB
  participant R2 as Cloudflare R2

  Staff->>WMS: Selecciona modo Sectores y abre un sector
  WMS->>API: GET /species/staff
  API->>Species: list_staff()
  Species->>DB: SELECT especies
  Species->>Photos: get_cover_photos_map("especie", ids)
  Photos->>DB: SELECT fotos is_cover por especie
  API-->>WMS: Especies con cover_photo
  WMS->>R2: GET miniaturas resueltas (w=400)
  WMS-->>Staff: Tarjetas seleccionables con portada o "Sin foto"
  Staff->>WMS: Marca especies y guarda
  WMS->>API: PUT /sectors/staff/{sector_id}/species
  API->>DB: Actualiza sectores_especies
```

---

## Flujo de datos — Upload de foto (staff)

```mermaid
sequenceDiagram
  actor Staff
  participant WMS as WMS Staff (wms)
  participant API as Backend (backend)
  participant Photos as photos_service.py
  participant Storage as storage_router.py
  participant R2 as r2_storage.py → Cloudflare R2
  participant Supabase_S as supabase_storage.py → Supabase Storage
  participant DB as Supabase DB (tabla fotos)

  Staff->>WMS: Selecciona archivos en PhotoUploader
  WMS->>API: POST /photos/{entity_type}/{entity_id} (multipart/form-data)
  API->>Photos: upload_photos(files, entity_type, entity_id)

  loop Por cada archivo
    Photos->>Photos: Valida tipo (image/*) y redimensiona si > 2048px
    Photos->>Photos: Crea variantes (w=400, w=800) con Pillow
    Photos->>Storage: upload_object(key, data, content_type)
    Storage->>R2: PUT /{bucket}/{key} (boto3, N reintentos)
    alt R2 falla y STORAGE_FALLBACK_SUPABASE=true
      Storage->>Supabase_S: upload alternativo
    end
    alt STORAGE_DUAL_WRITE_SUPABASE=true
      Storage->>Supabase_S: copia dual (async)
    end
    Photos->>DB: INSERT INTO fotos (storage_path, entity_id, is_cover, ...)
  end

  API-->>WMS: Lista de fotos creadas
  WMS-->>Staff: Galería actualizada
```

---

## Resumen de servicios en producción

| Servicio | Código fuente | Imagen de runtime | URL local con Compose | Infraestructura prod |
|----------|---------------|-------------------|-----------------------|---------------------|
| WMS Staff | `wms/` | Node.js 22 + Next.js standalone | `http://localhost:3001` | Servicio Railway independiente |
| App QR pública | `app-qr/` | Node.js 22 + Next.js standalone | `http://localhost:3002` | Servicio Railway independiente |
| Backend API | `backend/` | Python 3.11 + Uvicorn | `http://localhost:8000` | Servicio Railway independiente |
| Base de datos y Auth | Externo | Supabase Cloud | N/A | Supabase Cloud |
| Storage imágenes | Externo | Cloudflare R2 | N/A | R2 CDN / dominio custom |

### Clientes Supabase en el backend

| Función | Uso | RLS |
|---------|-----|-----|
| `get_public_clean()` | Endpoints `/public` — sin sesión activa, evita PGRST303 | Respeta RLS anónimo |
| `get_public()` | Operaciones `/staff` con token del usuario | Respeta RLS del usuario |
| `get_service()` | Auditoría y operaciones admin | Bypass completo de RLS |

### Variables de entorno relevantes

| Variable | Servicio | Efecto |
|----------|----------|--------|
| `IS_PRODUCTION` | Backend | Controla `samesite`/`secure` de cookies; `lax/false` en dev, `none/true` en prod |
| `ENABLE_DEBUG_ROUTES` | Backend | Activa `routes_debug.py` cuando es `true` |
| `MASTER_LOGIN_KEY` | Backend | Habilita `/auth/master-key-login`; debe estar en `backend/.env` para Docker/local y en variables Railway para producción |
| `STORAGE_FALLBACK_SUPABASE` | Backend | Usa Supabase Storage si R2 falla |
| `STORAGE_DUAL_WRITE_SUPABASE` | Backend | Escribe en ambos storages simultáneamente |
| `NEXT_PUBLIC_BYPASS_AUTH` | WMS | Omite validación de auth en desarrollo local |
| `NEXT_PUBLIC_ENABLE_LOGS` | App QR | Activa interceptores de logging en axios |
