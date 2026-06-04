# Formato de datos — App QR ↔ Backend ↔ Supabase

Documento único que define **qué información maneja la app pública (app-qr) y cómo la recibe
y almacena el backend/Supabase**. Sirve como especificación para preparar un archivo de
migración masiva de especies (en vez de cargarlas una por una en el WMS).

**Alcance operativo actual:** esta migración carga solo `especies` + fotos de especies. La
información de `ejemplar`, sectores asociados y fotos de ejemplares queda documentada como
referencia del modelo, pero no debe cargarse en la corrida actual.

---

## 1. Cómo fluye el dato

```
Archivo (Excel)
      │  migrate.py  (POST /species/staff, /photos/especie/{id})
      ▼
Backend FastAPI  ──valida y limpia──►  Supabase (tablas: especies, fotos)
      ▲
      │  GET /species/public/...  ·  GET /sectors/public/...
      ▼
App QR (huésped escanea código)  ──muestra──►  ficha de especie, sectores, etc.
```

- La app-qr **solo lee** (endpoints `/public`, sin login). No escribe nada.
- Lo que el huésped ve en pantalla son columnas de la tabla `especies` (más sus fotos).
- Migrar = crear esas filas vía API. El backend exige los mismos campos/valores que el WMS.

---

## 2. Tabla `especies` — la información principal a migrar

Cada fila de `especies` alimenta la **ficha de especie** de la app-qr
(`/especies/{slug}`, endpoint `GET /species/public/{slug}`).

| Columna Supabase | Dónde aparece en la app-qr | Tipo | Oblig. | Valores permitidos / formato |
|------------------|----------------------------|------|:------:|------------------------------|
| `scientific_name` | Subtítulo en cursiva; título si no hay nombre común | texto | **Sí** | Texto libre. Ej: `Echinopsis chiloensis` |
| `slug` | URL de la ficha (`/especies/echinopsis-chiloensis`) | texto único | auto | **Se genera del `scientific_name`** (no se escribe). Ver §6 |
| `nombre_común` | Título principal de la ficha | texto | No | Texto libre. Ej: `Quisco` |
| `nombres_comunes` | "También conocida como: …" | texto | No | Separados por comas. Ej: `Quisco, Cardón` |
| `categoría_de_conservación` | Badge "Conservación" | enum/texto | No | `No amenazado` · `Preocupación menor` · `Protegido` · `En peligro de extinción` |
| `Endémica` | Badge "🇨🇱 Endémica de Chile" (solo si es verdadero) | booleano | No | `Sí` / `No` (en Excel) → `true`/`false` |
| `tipo_morfología` | Badge "Morfología" | enum | No | `Columnar` · `Redondo` · `Agave` · `Tallo plano` · `Otro` |
| `tipo_planta` | Badge "Tipo" | texto | No | Texto libre. Ej: `Cactácea` |
| `estado_conservación` | Tarjeta "Estado de Conservación" (ⓘ) | texto | No | Descripción libre |
| `habitat` | Tarjeta "Hábitat" (🌍) | texto | No | Descripción libre |
| `distribución` | Tarjeta "Distribución" (🗺️) | texto | No | Descripción libre |
| `expectativa_vida` | Tarjeta "Expectativa de Vida" (⏱️) | texto | No | Ej: `Más de 100 años` |
| `floración` | Tarjeta "Floración" (🌸) | texto | No | Ej: `Primavera-verano` |
| `cuidado` | Tarjeta "Cuidado y Recomendaciones" (💧) | texto | No | Descripción libre |
| `usos` | Tarjeta "Usos" (🔧) | texto | No | Descripción libre |
| `historia_nombre` | Tarjeta "Historia del Nombre" (📖) | texto | No | Descripción libre |
| `historia_y_leyendas` | Tarjeta "Historia y Leyendas" (📚) | texto | No | Descripción libre |
| `cover_photo` / `photos[]` | Imagen de portada + galería "Imágenes" | fotos | No | No van en el Excel — ver §5 |

**Notas de comportamiento de la app-qr:**
- Cualquier tarjeta cuyo campo esté vacío **no se muestra** (no aparece vacía).
- Si no hay ninguna foto, se muestra un fondo beige; la primera foto es la portada.
- Los **nombres de columna llevan tildes y `ñ`** (`nombre_común`, `distribución`,
  `categoría_de_conservación`, `tipo_morfología`, `floración`). Hay que escribirlos exactos.
- Campos que el endpoint público **no expone** (internos): precios, fechas de compra, etc.
  (viven en `ejemplar`, no en `especies`).

---

## 3. Tabla `ejemplar` — instancias físicas (referencia, no cargar ahora)

Una especie es el "catálogo"; un **ejemplar** es una planta concreta en un sector del hotel.
La app-qr los usa indirectamente: al escanear el QR de un sector
(`GET /sectors/public/{qr}/species`) muestra **qué especies hay en ese sector**, relación que
se crea automáticamente al asignar un ejemplar a un sector.

| Columna Supabase | Tipo | Oblig. | Valores / formato |
|------------------|------|:------:|-------------------|
| `species_id` | FK → especies | **Sí** | Lo resuelve el migrador a partir del nombre científico |
| `sector_id` | FK → sectores | No | Vacío = ejemplar en *standby* (sin sector). Se resuelve por nombre |
| `tamaño` | enum | No | `XS` · `S` · `M` · `L` · `XL` · `XXL` |
| `health_status` | texto | No | Estado de salud |
| `nursery` | texto | No | Vivero de origen |
| `invoice_number` | texto | No | N.º de factura |
| `purchase_date` | fecha | No | `YYYY-MM-DD` |
| `purchase_price` | número | No | Solo interno (no público) |
| `sale_price` | número | No | Solo interno |
| `age_months` | entero | No | Edad en meses |
| `location` | texto | No | Ubicación dentro del sector |

> Para la migración actual, basta con migrar `especies` + fotos. No llenar la hoja
> `ejemplares` ni crear relaciones especie-sector.

---

## 4. Tabla `sectores` — referencia (normalmente ya existen)

Listado de sectores (`/sectores`, `GET /sectors/public`) y cabecera al escanear un QR.
Campos públicos: **`id`, `name`, `description`, `qr_code`**.

- Los sectores no son necesarios para la migración actual, porque no se cargan ejemplares.
- Si en el futuro se reactiva carga de ejemplares con sector, crea antes los sectores en el WMS.

---

## 5. Fotos — cómo las recibe el backend

Las fotos **no son texto ni URL** dentro del Excel. Se suben como **archivo binario** a
`POST /photos/especie/{id}`, y el backend:

1. Valida que sea imagen (`image/*`).
2. Redimensiona a máx. 2048 px y genera variantes `w=400` y `w=800`.
3. Las guarda en Cloudflare R2 y registra la metadata en la tabla `fotos`.
4. Marca la **primera** foto subida como portada (`is_cover`).

En la migración se dejan en disco, en carpetas **por slug**:

```
fotos/
  echinopsis-chiloensis/        ← fotos de la ficha (slug = del nombre científico)
    01_portada.jpg              ← la primera (alfabética) es la portada
    02_floracion.jpg
```

Formatos: `.jpg`, `.jpeg`, `.png`, `.webp`. Hasta 10 por especie.
No crear subcarpetas `ejemplares/` para esta corrida.

---

## 6. Regla del `slug` (idéntica al WMS)

El `slug` es el identificador único de la URL pública y **se deriva del nombre científico**:

```
slug = scientific_name.minúsculas → espacios por "-" → quita lo que no sea [a-z0-9_-]
```

Ejemplos:
- `Echinopsis chiloensis` → `echinopsis-chiloensis`
- `Copiapoa cinerea ssp.` → `copiapoa-cinerea-ssp`

Por eso en el archivo de migración **no se escribe el slug**: basta el nombre científico.
Debe ser único; si ya existe una especie con ese slug, el backend lo rechaza.

---

## 7. Estructura del archivo de migración (Excel)

Dos hojas (ver `plantilla_migracion.xlsx`, generada por `generate_template.py`):

**Hoja `especies`** — una fila por especie. Columnas = las de la §2, **sin `slug`**.
Único obligatorio: `scientific_name`.

**Hoja `ejemplares`** — fuera del alcance actual. Dejarla vacía o eliminar sus filas de
ejemplo antes de ejecutar el migrador.

Migración: `python migrate.py --excel datos.xlsx --fotos ./fotos --api <url> --email <correo>`
(usa `--dry-run` para validar primero). Detalles operativos en `README.md`.

---

## 8. Resumen de endpoints (contrato API)

| Acción | Método | Ruta | Auth |
|--------|--------|------|------|
| Ficha pública de especie | GET | `/species/public/{slug}` | — |
| Lista pública de especies | GET | `/species/public` | — |
| Sectores públicos | GET | `/sectors/public` | — |
| Especies de un sector (QR) | GET | `/sectors/public/{qr}/species` | — |
| Crear especie (migración) | POST | `/species/staff` | Bearer |
| Subir fotos de especie (migración) | POST | `/photos/especie/{id}` | Bearer |

Endpoints soportados por el script pero fuera del alcance actual: `POST /ejemplar/staff` y
`POST /photos/ejemplar/{id}`.
