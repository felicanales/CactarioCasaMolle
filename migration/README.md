# Migración masiva de especies

Herramienta para cargar **solo especies y fotos de especies** al sistema Cactario desde
un archivo Excel + una carpeta de fotos. Para esta migración no se subirán ejemplares
físicos, compras, sectores asociados ni fotos de ejemplares.

El flujo usado para esta carga es:

```
especie -> fotos de especie
```

Aunque el script también tiene soporte técnico para ejemplares, en este proceso se debe
dejar vacía la hoja `ejemplares` y no crear carpetas `ejemplares/` dentro de las fotos.

## 1. Instalar dependencias

```powershell
cd CactarioCasaMolle\migration
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Generar la plantilla Excel

```powershell
python generate_template.py
```

Crea `plantilla_migracion.xlsx` con 3 hojas:

- **especies** — una fila por especie. Lo **único obligatorio** es `scientific_name`
  (cabecera roja); el `slug` se genera solo a partir de él, igual que en el WMS
  (`Echinopsis chiloensis` → `echinopsis-chiloensis`). Respeta las tildes y la `ñ` en los
  nombres de columna (`nombre_común`, `distribución`, `tipo_morfología`…).
- **ejemplares** — no se usa en esta migración. Deja esta hoja vacía o elimina sus filas
  de ejemplo antes de ejecutar el migrador.
- **instrucciones** — recordatorio de formato.

Las columnas con **menú de valores fijos**:

- `categoría_de_conservación`: `No amenazado` · `Preocupación menor` · `Protegido` · `En peligro de extinción`
- `tipo_morfología`: `Columnar` · `Redondo` · `Agave` · `Tallo plano` · `Otro`
- `Endémica`: `Sí` / `No`

Columnas auxiliares de `ejemplares` (cabecera naranja) que **no se usan** en esta migración:

| Columna | Para qué sirve |
|---------|----------------|
| `especie_cientifico` | Enlaza el ejemplar con su especie (debe igualar un `scientific_name`) |
| `ref` | Identificador local del ejemplar → nombre de su carpeta de fotos |
| `sector_nombre` | Se resuelve a `sector_id`. Vacío = ejemplar en standby |

Para cargar solo especies, no llenes estas columnas.

## 3. Organizar las fotos

La carpeta de cada especie se nombra con su **slug** (derivado del nombre científico):

```
fotos/
  echinopsis-chiloensis/        <- slug de "Echinopsis chiloensis" (fotos de la FICHA)
    01_portada.jpg
    02_detalle.jpg
```

La **primera foto en orden alfabético** se marca como portada automáticamente.
Nombra los archivos `01_`, `02_`, … para controlar el orden.

No crees subcarpetas `ejemplares/`: las fotos de esta carga pertenecen solo a la ficha
pública de cada especie.

## 4. Probar en seco (no escribe nada)

```powershell
python migrate.py --excel plantilla_migracion.xlsx --fotos .\fotos --dry-run
```

## 5. Migrar de verdad (entorno local)

Asegúrate de tener el backend corriendo. Puedes hacerlo sin Docker:

```powershell
cd ..\backend
python -m uvicorn app.main:app --port 8000
```

O con Docker, desde la raíz del proyecto:

```powershell
cd "C:\Users\CACTARIO CM\CactarioCasaMolle"
docker compose up backend --build
```

El backend Docker local usa `backend/.env` y se conecta directamente a Supabase/R2. Si ese
`.env` apunta a producción, la migración escribirá en la misma base que lee Railway.

Con clave maestra (no interactivo, recomendado para lotes grandes — requiere que
`MASTER_LOGIN_KEY` esté configurada en el backend activo; para Docker/local debe estar en
`backend/.env`):

```powershell
python migrate.py --excel plantilla_migracion.xlsx --fotos .\fotos `
  --api http://localhost:8000 --email staff@hotel.cl --master-key "TU_CLAVE"
```

Con OTP por email (te pedirá el código por consola):

```powershell
python migrate.py --excel plantilla_migracion.xlsx --fotos .\fotos `
  --api http://localhost:8000 --email staff@hotel.cl
```

## Flags útiles

| Flag | Efecto |
|------|--------|
| `--dry-run` | Valida y muestra qué haría, sin tocar la API |
| `--skip-existing` | Si un `slug` ya existe, salta esa especie en vez de abortar |
| `--api` | URL base del backend (por defecto `http://localhost:8000`) |

## Notas

- Los **sectores no son necesarios** para esta migración, porque no se crearán ejemplares
  ni relaciones especie-sector.
- El token dura 1 hora. Para migraciones muy grandes, divide en lotes o usa la clave maestra.
- Toda creación queda registrada en la auditoría del sistema (usuario, IP, user-agent).
- El backend redimensiona las imágenes (máx 2048px) y genera variantes w=400 y w=800.
