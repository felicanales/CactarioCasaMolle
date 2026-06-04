# Ejemplo de datos de UNA especie

Así debe verse la información de una especie, **campo por campo, tal como los pide el
formulario "Crear nueva especie" del WMS**. El ejemplo usa una especie real de la zona del
hotel: el **Quisco** (*Echinopsis chiloensis*).

> Los nombres entre paréntesis `(campo_backend)` son la columna real en la base de datos /
> la cabecera que va en el Excel de migración.

---

## Campo obligatorio

### Nombre Científico * `(scientific_name)`
```
Echinopsis chiloensis
```
> Es el **único campo obligatorio**. El `slug` (identificador único de la URL) **NO se
> escribe a mano**: el sistema lo genera solo a partir del nombre científico
> → `echinopsis-chiloensis` (minúsculas, espacios por guiones).

### 📸 Fotos de la Especie
No van en el Excel. Se dejan en una carpeta aparte (ver sección "Fotos" al final).
Hasta 10 por especie; se suben automáticamente después de crear la especie.

---

## Datos principales

| Campo del formulario | Columna backend | Valor de ejemplo |
|----------------------|-----------------|------------------|
| Nombre Común | `nombre_común` | Quisco |
| Estado de Conservación (Descripción Libre) | `estado_conservación` | Endémica de Chile, fuera de peligro pero protegida por ley |
| Categoría de Conservación *(menú)* | `categoría_de_conservación` | Preocupación menor |
| Endémica de Chile 🇨🇱 *(casilla)* | `Endémica` | Sí |
| Hábitat | `habitat` | Laderas rocosas y quebradas secas de Chile central y norte chico, entre 0 y 2.000 msnm |
| Cuidado | `cuidado` | Pleno sol, suelo con muy buen drenaje, riego escaso. Resiste sequía y heladas leves |

**Categoría de Conservación** solo acepta uno de estos valores (menú desplegable):
`No amenazado` · `Preocupación menor` · `Protegido` · `En peligro de extinción`

**Endémica de Chile** es una casilla: en el Excel se escribe `Sí` / `No` (o `true` / `false`).

---

## Información Taxonómica

| Campo del formulario | Columna backend | Valor de ejemplo |
|----------------------|-----------------|------------------|
| Nombres Comunes (separados por comas) | `nombres_comunes` | Quisco, Cardón, Cactus candelabro |
| Tipo de Planta | `tipo_planta` | Cactácea |
| Tipo de Morfología *(menú)* | `tipo_morfología` | Columnar |
| Distribución | `distribución` | Endémica de Chile, desde la Región de Atacama hasta la Región del Maule |
| Expectativa de Vida | `expectativa_vida` | Más de 100 años |
| Floración | `floración` | Primavera-verano; flores blancas grandes que abren de noche |

**Tipo de Morfología** solo acepta uno de estos valores (menú desplegable):
`Columnar` · `Redondo` · `Agave` · `Tallo plano` · `Otro`

**Tipo de Planta** es texto libre (ej. `Cactácea`).

---

## Información Adicional

| Campo del formulario | Columna backend | Valor de ejemplo |
|----------------------|-----------------|------------------|
| Usos | `usos` | Ornamental; su corteza seca se ha usado en artesanía y construcción rural |
| Historia del Nombre | `historia_nombre` | "Quisco" proviene del mapudungun, nombre genérico de los cactus columnares de Chile central |
| Historia y Leyendas | `historia_y_leyendas` | Planta emblemática del norte chico; refugio y alimento de aves e insectos del desierto florido |

---

## Cómo se ve esto como UNA FILA del Excel (hoja `especies`)

En la plantilla es una sola fila. Estas son las columnas con el valor del ejemplo:

| Columna | Valor |
|---------|-------|
| `scientific_name` | Echinopsis chiloensis |
| `nombre_común` | Quisco |
| `nombres_comunes` | Quisco, Cardón, Cactus candelabro |
| `tipo_planta` | Cactácea |
| `tipo_morfología` | Columnar |
| `categoría_de_conservación` | Preocupación menor |
| `estado_conservación` | Endémica de Chile, protegida por ley |
| `Endémica` | Sí |
| `habitat` | Laderas rocosas y quebradas secas de Chile central… |
| `distribución` | Desde Atacama hasta el Maule |
| `expectativa_vida` | Más de 100 años |
| `floración` | Primavera-verano; flores blancas nocturnas |
| `cuidado` | Pleno sol, buen drenaje, riego escaso |
| `usos` | Ornamental; artesanía con su corteza seca |
| `historia_nombre` | Del mapudungun "quisco" |
| `historia_y_leyendas` | Planta emblemática del norte chico… |

> El `slug` NO se incluye: se genera solo desde `scientific_name`.
> Deja en blanco cualquier campo que no tengas; no es obligatorio (excepto el nombre científico).

---

## Fotos (no van en el Excel)

Se dejan en una carpeta en disco, identificadas por el slug que genera el nombre científico:

```
fotos/
  echinopsis-chiloensis/        <- slug autogenerado de "Echinopsis chiloensis"
    01_portada.jpg
    02_floracion.jpg
    03_habitat.jpg
```

- La carpeta se llama igual que el **slug** (`echinopsis-chiloensis`).
- Se suben en orden alfabético; la **primera** queda como portada (nómbralas `01_`, `02_`…).
- Si la especie no tiene fotos, simplemente no crees su carpeta.
- Formatos: `.jpg`, `.jpeg`, `.png`, `.webp`.
