# Modelo de Datos — Cactario Casa Molle

Base de datos PostgreSQL gestionada por Supabase. Todas las tablas tienen Row-Level Security (RLS) habilitado.

---

## Diagrama ER

```mermaid
erDiagram
  usuarios {
    bigint id PK
    uuid supabase_uid UK
    text username UK
    text email UK
    text full_name
    boolean active
    timestamp created_at
    timestamp updated_at
  }

  especies {
    bigint id PK
    text slug UK
    text nombre_común
    text scientific_name
    text habitat
    text estado_conservación
    text nombres_comunes
    enum tipo_morfología
    text expectativa_vida
    text tipo_planta
    text distribución
    text floración
    text cuidado
    text usos
    text historia_y_leyendas
    text historia_nombre
    boolean Endémica
    enum categoría_de_conservación
    timestamp created_at
    timestamp updated_at
  }

  sectores {
    bigint id PK
    text name
    text description
    text image_path
    text qr_code UK
    timestamp created_at
    timestamp updated_at
  }

  sectores_especies {
    bigint id PK
    bigint sector_id FK
    bigint especie_id FK
    timestamp created_at
    timestamp updated_at
  }

  ejemplar {
    bigint id PK
    bigint species_id FK
    bigint sector_id FK
    bigint user_id FK
    date collection_date
    text health_status
    text location
    boolean has_offshoots
    date purchase_date
    date sale_date
    text nursery
    numeric purchase_price
    numeric sale_price
    integer age_months
    integer size_cm
    timestamp created_at
    timestamp updated_at
  }

  fotos {
    bigint id PK
    bigint especie_id FK
    bigint sector_id FK
    bigint ejemplar_id FK
    text storage_path
    boolean is_cover
    integer order_index
    text caption
    timestamp created_at
    timestamp updated_at
  }

  auditoria_cambios {
    bigint id PK
    text tabla_afectada
    bigint registro_id
    text accion
    uuid usuario_id
    text usuario_email
    jsonb valores_anteriores
    jsonb valores_nuevos
    jsonb cambios_detectados
    text ip_address
    text user_agent
    timestamp timestamp
  }

  movimiento_de_inventario {
    bigint id PK
    bigint specimen_id FK
    bigint user_id FK
    enum type
    bigint from_sector_id FK
    bigint to_sector_id FK
    numeric qty
    text note
    timestamp created_at
  }

  purchases {
    bigint id PK
    text supplier
    enum status
    bigint created_by FK
    timestamp created_at
  }

  purchase_items {
    bigint id PK
    bigint purchase_id FK
    bigint species_id FK
    numeric quantity
    numeric unit_price
  }

  receipts {
    bigint id PK
    bigint purchase_id FK
    bigint received_by FK
    timestamp received_at
  }

  receipt_items {
    bigint id PK
    bigint receipt_id FK
    bigint purchase_item_id FK
    numeric quantity_received
  }

  public_views {
    bigint id PK
    text entity_type
    bigint entity_id
    text ip_address
    text user_agent
    timestamp viewed_at
  }

  especies ||--o{ sectores_especies : "pertenece a"
  sectores ||--o{ sectores_especies : "contiene"
  especies ||--o{ ejemplar : "tiene"
  sectores ||--o{ ejemplar : "alberga"
  usuarios ||--o{ ejemplar : "registró"
  especies ||--o{ fotos : "tiene"
  sectores ||--o{ fotos : "tiene"
  ejemplar ||--o{ fotos : "tiene"
  usuarios ||--o{ movimiento_de_inventario : "realizó"
  ejemplar ||--o{ movimiento_de_inventario : "movido"
  sectores ||--o{ movimiento_de_inventario : "desde"
  sectores ||--o{ movimiento_de_inventario : "hacia"
  usuarios ||--o{ purchases : "creó"
  purchases ||--o{ purchase_items : "contiene"
  especies ||--o{ purchase_items : "incluida en"
  purchases ||--o{ receipts : "tiene"
  receipts ||--o{ receipt_items : "contiene"
  purchase_items ||--o{ receipt_items : "recibida como"
```

---

## Descripción de tablas

### `usuarios`
Whitelist de usuarios del staff. Solo los registros con `active = true` pueden iniciar sesión.
- `supabase_uid`: Se sincroniza automáticamente con Supabase Auth al primer login (OTP).
- `username`: Identificador único interno del usuario.
- Los usuarios se crean manualmente via `agregar_usuario.sql` — no hay registro público.

### `especies`
Catálogo de especies de cactáceas. Unidad central del sistema.
- `slug`: Identificador URL-friendly único. Usado por la app pública (`/especies/{slug}`).
- `tipo_morfología`: ENUM PostgreSQL — valores: `Columnar`, `Globosa`, `Rastrera`, `Arbustiva`, etc.
- `categoría_de_conservación`: ENUM PostgreSQL — valores UICN: `LC`, `NT`, `VU`, `EN`, `CR`, etc.
- Los campos de texto largo (`historia_y_leyendas`, `cuidado`, `usos`) se muestran en la app pública.

### `sectores`
Zonas físicas del cactario del hotel. Cada sector tiene un código QR impreso.
- `qr_code`: Valor único que se imprime en el cartel QR del sector. Formato libre, generalmente `SECTOR{id}`.
- `image_path`: Ruta de imagen de portada del sector (obsoleto en favor de `fotos`).
- La relación con especies se gestiona en `sectores_especies`.

### `sectores_especies`
Tabla de unión N:M entre sectores y especies. Indica qué especies viven en qué sector.
- Se crea automáticamente cuando se crea un `ejemplar` con `species_id` y `sector_id`.
- También se actualiza manualmente via `PUT /sectors/staff/{sector_id}/species`.

### `ejemplar`
Instancias físicas individuales de una especie. El inventario real del cactario.
- `health_status`: Estado de salud libre (texto).
- `nursery`: Vivero de origen (texto libre, usado para agrupar compras).
- `purchase_date` + `nursery` + `invoice_number`: Campos usados por `transactions_service` para agrupar compras.
- `size_cm`: Tamaño en centímetros al momento del registro.

### `fotos`
Metadata de imágenes. El archivo físico se almacena en Cloudflare R2 (o Supabase Storage como fallback).
- `storage_path`: Clave del objeto en R2/Supabase Storage. Se construye la URL pública concatenando `R2_PUBLIC_BASE_URL + storage_path`.
- `especie_id`, `sector_id`, `ejemplar_id`: Solo uno tiene valor; los demás son NULL. Indica a qué entidad pertenece la foto.
- `is_cover`: Foto de portada del recurso. Solo una foto por entidad debería tener `is_cover = true`.
- Las variantes (w=400, w=800) se almacenan como filas separadas con el sufijo `?w=400` en el `storage_path`.

### `auditoria_cambios`
Log inmutable de todas las mutaciones del sistema.
- `accion`: `create`, `update` o `delete`.
- `valores_anteriores` / `valores_nuevos`: JSON con el estado del registro antes y después.
- `cambios_detectados`: Solo en `update` — JSON con los campos que cambiaron.
- Escrito siempre con `get_service()` (bypass RLS) para garantizar que el log persiste.

### `movimiento_de_inventario`
Registra traslados de ejemplares entre sectores. El ENUM `type` incluye: `transfer`, `purchase`, `sale`, etc.

### `purchases`, `purchase_items`, `receipts`, `receipt_items`
Flujo de compras en dos pasos: orden de compra (`purchases` + `purchase_items`) y recepción (`receipts` + `receipt_items`). Actualmente expuesto via `GET /transactions/purchases` como vista agrupada.

### `public_views`
Registro anónimo de visitas a especies/sectores desde la app pública. No requiere login.

---

## ENUMs de PostgreSQL

| ENUM | Tabla | Valores conocidos |
|------|-------|------------------|
| `tipo_morfología` | `especies` | `Columnar`, `Globosa`, `Rastrera`, `Arbustiva`, `Opuntoide`, `Cespitosa` |
| `categoría_de_conservación` | `especies` | `LC`, `NT`, `VU`, `EN`, `CR`, `EW`, `EX`, `DD`, `NE` |
| `purchase_status` | `purchases` | `Pendiente`, `Recibida`, `Cancelada` |
| `type` (movimiento) | `movimiento_de_inventario` | `transfer`, `purchase`, `sale` |

> Los ENUMs son tipos de PostgreSQL. Al enviar strings vacíos desde el backend, se deben convertir a `None` antes de insertar en Supabase para evitar errores de cast.

---

## Notas de RLS (Row-Level Security)

- Todas las tablas tienen RLS activado en Supabase.
- Las operaciones públicas usan `get_public_clean()` (anon key, sin sesión) — solo ven lo que permite la policy pública.
- Las operaciones de staff usan `get_public()` con el token del usuario — las policies RLS del usuario aplican.
- Las operaciones de auditoría y admin usan `get_service()` (service role key) — bypass completo de RLS.
- Ver `backend/app/core/security.py` y `docs/security.md` para el detalle de las policies.
