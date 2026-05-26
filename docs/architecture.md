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
  System_Ext(railway, "Railway", "Plataforma de deploy e infraestructura de los 3 servicios")

  Rel(staff, cactario, "Gestiona inventario via WMS", "HTTPS")
  Rel(huesped, cactario, "Explora cactario via QR", "HTTPS")
  Rel(cactario, supabase, "Lee/escribe datos y autentica usuarios", "HTTPS + JWT")
  Rel(cactario, r2, "Sube y sirve imágenes", "HTTPS S3-compatible")
  Rel(cactario, railway, "Desplegado automáticamente desde GitHub", "CI/CD")
```

---

## C4 Level 2 — Contenedores

Muestra los tres servicios del sistema y cómo se comunican.

```mermaid
C4Container
  title Cactario Casa Molle — Contenedores

  Person(staff, "Staff del hotel")
  Person(huesped, "Huésped")

  System_Boundary(cactario, "Sistema Cactario Casa Molle") {
    Container(wms, "WMS Staff", "Next.js 15 · React 19 · Bootstrap 5", "Panel de gestión interna: especies, sectores, ejemplares, fotos, auditoría. Puerto 3000 (dev) / Railway (prod)")
    Container(mobile, "App Pública", "Next.js 15 · React 19 · html5-qrcode", "App para huéspedes: home, escáner QR, navegación por sectores y detalle de especies. Puerto 3002 (dev) / Railway (prod)")
    Container(api, "Backend API", "FastAPI 0.119 · Python 3.9+", "API REST con endpoints /public y /staff. Puerto 8000 (dev) / Railway (prod)")
  }

  ContainerDb(supabase_db, "PostgreSQL", "Supabase", "Base de datos principal: especies, ejemplares, sectores, fotos, usuarios, auditoría")
  Container_Ext(supabase_auth, "Supabase Auth", "Supabase", "Autenticación OTP por email + emisión de JWT")
  Container_Ext(r2, "R2 Bucket", "Cloudflare", "Imágenes originales + variantes (w=400, w=800)")

  Rel(staff, wms, "Usa", "HTTPS / Browser")
  Rel(huesped, mobile, "Usa", "HTTPS / Browser")
  Rel(wms, api, "Llama a /staff/*", "HTTPS + JWT cookie")
  Rel(mobile, api, "Llama a /public/*", "HTTPS / sin auth")
  Rel(api, supabase_db, "Lee y escribe datos", "Supabase SDK Python")
  Rel(api, supabase_auth, "Valida JWT + OTP", "Supabase SDK")
  Rel(api, r2, "Sube imágenes (S3-compatible)", "boto3")
```

---

## C4 Level 3 — Componentes del Backend (FastAPI)

```mermaid
flowchart TD
  request(["Request HTTP"])

  subgraph middleware["Middleware (app/middleware/)"]
    cors["CORSMiddleware\nlocales + Railway + ngrok"]
    auth_mw["AuthMiddleware\nExtrae JWT → valida → request.state.user"]
    rate["RateLimiter\n(auth endpoints)"]
  end

  subgraph api["Capa de Rutas (app/api/)"]
    r_auth["routes_auth.py\nOTP · refresh · logout · /me"]
    r_species["routes_species.py\n/public · /staff CRUD"]
    r_sectors["routes_sectors.py\n/public (QR) · /staff CRUD"]
    r_ejemplar["routes_ejemplar.py\n/staff CRUD + 16 filtros"]
    r_photos["routes_photos.py\n/upload · /list · /cover · /delete"]
    r_tx["routes_transactions.py\npurchases · sales agrupadas"]
    r_audit["routes_audit.py\nlog de cambios filtrable"]
    r_home["routes_home_content.py\n/public · /staff + upload imagen"]
    r_debug["routes_debug.py\n(solo ENABLE_DEBUG_ROUTES=true)"]
  end

  subgraph services["Capa de Servicios (app/services/)"]
    s_species["species_service.py"]
    s_sectors["sectors_service.py"]
    s_ejemplar["ejemplar_service.py"]
    s_photos["photos_service.py\nresize + variantes"]
    s_tx["transactions_service.py"]
    s_audit["audit_service.py\nlog_change()"]
    s_home["home_content_service.py"]
  end

  subgraph core["Infraestructura (app/core/)"]
    supabase_clients["supabase_auth.py\nget_public() · get_public_clean() · get_service()"]
    security["security.py\nJWT validation · cookies · sync UID"]
    storage["storage_router.py\nR2 primario + Supabase fallback/dual-write"]
  end

  request --> cors --> auth_mw --> rate
  auth_mw --> r_auth & r_species & r_sectors & r_ejemplar & r_photos & r_tx & r_audit & r_home & r_debug
  r_species --> s_species --> supabase_clients
  r_sectors --> s_sectors --> supabase_clients
  r_ejemplar --> s_ejemplar --> supabase_clients
  r_photos --> s_photos --> storage
  s_photos --> supabase_clients
  r_tx --> s_tx --> supabase_clients
  r_audit --> s_audit --> supabase_clients
  r_home --> s_home --> supabase_clients
  s_species & s_sectors & s_ejemplar & s_photos & s_home --> s_audit
```

---

## C4 Level 3 — Componentes del WMS Staff (Next.js)

```mermaid
flowchart TD
  subgraph layout["layout.js — Proveedores globales"]
    auth_ctx["AuthContext\nJWT state · auto-refresh · apiRequest()"]
    rq["ReactQueryProvider\nstaleTime 5min · gcTime 10min · retry 1"]
  end

  subgraph pages["app/ — Páginas"]
    p_login["login/page.jsx\nOTP form"]
    p_species["species/page.jsx\nCatálogo"]
    p_editor["species-editor/page.jsx\nEditor especie"]
    p_sectors["sectors/page.jsx\nSectores + QR"]
    p_inventory["inventory/page.jsx\nEjemplares + filtros"]
    p_tx["transactions/page.jsx\nCompras + ventas"]
    p_audit["audit-logs/page.jsx\nHistorial"]
    p_home["home-content/page.jsx\nContenido home"]
  end

  subgraph hooks["hooks/ — Data fetching"]
    h_species["useSpecies.js\nuseSpeciesList · useCreateSpecies · useUpdateSpecies"]
    h_sectors["useSectors.js"]
    h_ejemplar["useEjemplares.js"]
  end

  subgraph components["components/ — UI reutilizable"]
    photo_up["PhotoUploader.jsx\nsubida multiarchivo"]
    photo_gal["PhotoGallery.jsx\ngalería de recurso"]
    auth_img["AuthenticatedImage.jsx\nimagen con token"]
    inv_table["inventory/InventoryTable.jsx"]
    inv_modal["inventory/InventoryModal.jsx"]
  end

  subgraph utils["utils/ — Utilidades"]
    api_cfg["api-config.js\ngetApiUrl()"]
    auth_h["auth-helpers.js\ngetAccessTokenFromContext()"]
    images["images.js\nbuildR2PublicUrl · resolvePhotoUrl"]
  end

  layout --> pages
  pages --> hooks --> auth_ctx
  hooks --> api_cfg
  pages --> components
  components --> auth_h & images
```

---

## C4 Level 3 — Componentes de la App Pública (mobile)

```mermaid
flowchart TD
  subgraph pages_m["app/ — Páginas"]
    p_home_m["page.js\nHome con carrusel"]
    p_qr["qr/page.jsx\nEscáner QR (html5-qrcode)"]
    p_sectores["sectores/page.jsx\nListado de sectores"]
    p_sec_esp["sectores/[qrCode]/especies/page.jsx\nEspecies por sector"]
    p_esp_det["especies/[slug]/page.jsx\nDetalle de especie"]
  end

  subgraph comp_m["components/ — UI"]
    header["Header.jsx"]
    bottom_nav["BottomNavigation.jsx"]
    carousel["ImageCarousel.jsx"]
    vert_car["SpeciesVerticalCarousel.jsx"]
    auth_img_m["AuthenticatedImage.jsx"]
  end

  subgraph utils_m["utils/ — Utilidades"]
    api_m["api.js (axios)\nsectorsApi · speciesApi\nreintentos + timeout 30s"]
    images_m["images.js\nbuildR2PublicUrl · resolvePhotoUrl"]
  end

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
  participant App as App Pública (mobile)
  participant API as Backend (FastAPI)
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
  DB-->>API: Especie + lista de fotos (storage_path)
  API-->>App: Especie completa

  App->>R2: GET /{storage_path}?w=800
  R2-->>App: Imagen redimensionada
  App-->>Huésped: Muestra detalle de especie con fotos
```

---

## Flujo de datos — Upload de foto (staff)

```mermaid
sequenceDiagram
  actor Staff
  participant WMS as WMS Staff (wms)
  participant API as Backend (FastAPI)
  participant Photos as photos_service.py
  participant Storage as storage_router.py
  participant R2 as Cloudflare R2
  participant Supabase_S as Supabase Storage
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

| Servicio | Tecnología | Puerto dev | URL prod |
|----------|-----------|-----------|---------|
| WMS Staff | Next.js 15 | 3000 | `*.railway.app` |
| App Pública | Next.js 15 | 3002 | `*.railway.app` |
| Backend API | FastAPI | 8000 | `*.railway.app` |
| Base de datos | Supabase PostgreSQL | — | Supabase Cloud |
| Storage imágenes | Cloudflare R2 | — | R2 CDN / dominio custom |

### Clientes Supabase en el backend

| Función | Uso | RLS |
|---------|-----|-----|
| `get_public_clean()` | Endpoints `/public` | Respeta RLS anónimo |
| `get_public()` | Operaciones staff con token de usuario | Respeta RLS del usuario |
| `get_service()` | Auditoría y operaciones admin | Bypass completo de RLS |
