# Migration — Contexto de Desarrollo

Herramienta **standalone** (fuera del backend) para carga masiva de especies y fotos de
especies al sistema Cactario, vía la API HTTP del backend. No accede a Supabase
directamente: todo pasa por los endpoints `/staff` y `/photos`, por lo que respeta
auditoría, RLS y la misma validación que el WMS.

El script conserva soporte técnico para ejemplares, pero el alcance operativo actual de la
migración es **solo especies + fotos de especies**. No se deben cargar ejemplares, compras,
sectores asociados ni fotos de ejemplares.

---

## Propósito

Migrar de una sola corrida muchas especies con sus fotos, desde un **Excel** + una
**carpeta de fotos organizada por slug**, sin tener que cargarlas a mano en el WMS.

---

## Archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `generate_template.py` | Genera `plantilla_migracion.xlsx` con las columnas exactas (hojas `especies`, `ejemplares`, `instrucciones`) |
| `migrate.py` | Migrador principal: lee Excel + fotos y orquesta las llamadas a la API |
| `requirements.txt` | `requests` + `openpyxl` |
| `README.md` | Guía de uso paso a paso para el operador |
| `CONTEXT.md` | Este archivo — contexto técnico |

Artefactos generados (no versionar): `plantilla_migracion.xlsx`, `.venv/`, cualquier
`*.xlsx` de datos reales, la carpeta `fotos/`.

---

## Flujo de orquestación

Para el alcance actual, el orden activo es:

```
1) especie     POST /species/staff          -> species_id
2) fotos esp   POST /photos/especie/{id}     (multipart, campo 'files')
```

La hoja `ejemplares` debe quedar vacía. No se ejecutan llamadas a `/ejemplar/staff` ni se
suben fotos de ejemplares.

Si en el futuro se reactiva carga de ejemplares, el flujo técnico completo agrega:

```
3) ejemplar    POST /ejemplar/staff          -> ejemplar_id   (necesita species_id, sector_id)
4) fotos ej    POST /photos/ejemplar/{id}    (multipart, campo 'files')
```

---

## Contrato con el backend (mantener sincronizado)

Si cambian los campos en el backend, actualizar en `migrate.py`:

- `ESPECIE_FIELDS` ← campos editables de `species_service.py`. **No incluye `slug`**: se
  genera con `slugify(scientific_name)` replicando la lógica del WMS
  (`scientific_name.toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]/g,'')`, con `re.ASCII`).
  **Ojo con tildes y `ñ`**: `nombre_común`, `distribución`, `estado_conservación`,
  `categoría_de_conservación`, `tipo_morfología`, `floración`, `historia_y_leyendas`, `expectativa_vida`.
- `EJEMPLAR_FIELDS` ← campos válidos de `ejemplar_service.py` (excepto `species_id`/`sector_id`
  que el script setea aparte).
- `NUMERIC_FIELDS` ← `purchase_price`, `sale_price`, `age_months`.
- `BOOL_FIELDS` ← `Endémica` (acepta Sí/No/true/false en el Excel; vacío → `None`).

Lo único **obligatorio** en el Excel es `scientific_name` (de él sale el `slug`).
En ejemplar: `species_id` (lo setea el script); `sector_id` puede ir nulo (*standby*).

Valores de menú validados contra el formulario del WMS (`species/page.jsx`):
- `categoría_de_conservación`: No amenazado | Preocupación menor | Protegido | En peligro de extinción
- `tipo_morfología`: Columnar | Redondo | Agave | Tallo plano | Otro
- `tipo_planta`: texto libre (ej: Cactácea)

### Endpoints usados

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| POST | `/auth/master-key-login` | — | Login no interactivo (requiere `MASTER_LOGIN_KEY` en backend) |
| POST | `/auth/request-otp` + `/auth/verify-otp` | — | Login interactivo por email |
| POST | `/species/staff` | Bearer | Crear especie |
| POST | `/photos/especie/{id}` | Bearer | Subir fotos de especie |

Endpoints soportados por el script pero fuera del alcance actual: `GET /sectors/staff`,
`POST /ejemplar/staff` y `POST /photos/ejemplar/{id}`.

### Backend local / Docker

Para migrar contra el backend local, puede levantarse solo el contenedor del backend:

```powershell
cd CactarioCasaMolle
docker compose up backend --build
```

El migrador apunta a ese backend con `--api http://localhost:8000`. Ese contenedor **no**
llama al backend de Railway: lee `backend/.env` y se conecta directamente a Supabase/R2.
Si `backend/.env` apunta al Supabase de producción, la migración local escribe en la misma
base que luego lee Railway.

Para usar `--master-key`, `MASTER_LOGIN_KEY` debe existir en `backend/.env`; tenerla solo
en Railway no habilita el login del backend Docker local.

---

## Estructura de datos de entrada

### Excel

- **especies**: una fila por especie. Solo `scientific_name` es obligatorio; el `slug`
  se deriva de él.
- **ejemplares**: no se usa en esta migración. Dejar la hoja vacía o eliminar sus filas
  de ejemplo. Columnas auxiliares que quedan fuera del alcance actual:
  - `especie_cientifico` → enlaza con la especie (se compara por `slugify()` contra el nombre científico).
  - `ref` → identificador local → nombre de carpeta de sus fotos.
  - `sector_nombre` → se resuelve a `sector_id` vía el mapa de sectores.

### Carpeta de fotos

```
fotos/
  <slug>/                      fotos de la FICHA de la especie
    01_portada.jpg, 02_*.jpg
```

Las fotos se suben en **orden alfabético**; el backend marca la **primera** como portada.
Convención: prefijar `01_`, `02_` para controlar el orden.

No crear subcarpetas `ejemplares/` para el alcance actual.

---

## Decisiones de diseño

- **Vía API, no DB directa**: garantiza auditoría, validación de slug único y pipeline de
  fotos (resize a 2048px + variantes w=400/w=800) idénticos al WMS.
- **`openpyxl` (no pandas)**: dependencias mínimas y control fino de tipos por celda
  (`_clean()` convierte vacíos→`None`, parsea numéricos y fechas `YYYY-MM-DD`).
- **Sin upsert**: no actualiza especies existentes. Con `--skip-existing` salta los slugs
  duplicados; sin el flag, aborta. (Extender aquí si se requiere modo update vía `PUT`.)
- **Sectores no son necesarios en el alcance actual**: no se crean ejemplares ni relaciones especie-sector.
- **Token de 1h**: para lotes grandes usar `--master-key` (no interactivo). Login OTP está
  limitado por Supabase a 2 correos/hora.

---

## Flags

| Flag | Efecto |
|------|--------|
| `--excel` | (req) ruta al `.xlsx` |
| `--fotos` | carpeta raíz de fotos por slug (opcional: sin ella, migra solo datos) |
| `--api` | URL base del backend (default `http://localhost:8000`) |
| `--email` | email autorizado para login |
| `--master-key` | clave maestra (login no interactivo) |
| `--dry-run` | valida y muestra el plan sin tocar la API ni autenticar |
| `--skip-existing` | salta especies cuyo `slug` ya existe en vez de abortar |

---

## Limitaciones conocidas / TODO

- No reintenta automáticamente al expirar el token (1h). Para >1h de carga, dividir en lotes.
- No hay modo **update** (solo create). Añadir `PUT /species/staff/{id}` y
  `PUT /ejemplar/staff/{id}` si se necesita re-migrar.
- No deduplica fotos: re-correr sin limpiar previamente puede duplicar imágenes de especies
  ya creadas.

---

## Cómo extender

- **Nuevo campo de especie/ejemplar**: agrégalo a `ESPECIE_FIELDS`/`EJEMPLAR_FIELDS` y a
  las columnas de `generate_template.py`.
- **Modo update**: añadir lógica en `ApiClient` (`PUT` por id) y resolver el id por `slug`
  vía `GET /species/staff?q=`.
- **Otro origen de datos** (CSV/JSON): reemplazar `read_sheet()` manteniendo el mismo
  formato de dicts `{columna: valor}`.
