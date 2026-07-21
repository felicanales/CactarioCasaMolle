# Validación QA integral — aplicación de inventario

**Fecha:** 21 de julio de 2026

**Zona horaria:** America/Santiago

**Resultado general inicial:** **con observaciones; requería correcciones antes de considerar el flujo completo estable**

**Estado de corrección al 21 de julio de 2026:** **10/10 hallazgos corregidos y revalidados**

## Resumen ejecutivo

Se validaron el WMS, la API, la persistencia en Supabase y los archivos almacenados en R2. La batería principal registró **66 comprobaciones satisfactorias**. Cuatro fallos iniciales del arnés relacionados con `multipart/form-data` se reejecutaron con el cliente HTTP nativo y resultaron satisfactorios, por lo que no se contabilizan como defectos del producto.

Se identificaron **10 hallazgos de producto**:

- **2 de severidad alta:** creación de facturas de compra bloqueada y cierre de sesión sin invalidación efectiva del bearer token.
- **6 de severidad media:** archivos derivados huérfanos, filtro por vivero, validación de paginación de especies, clasificación de auditoría, overflow móvil del dashboard y número de factura ausente en ventas agrupadas.
- **2 de severidad baja:** total de auditoría incorrecto y controles táctiles pequeños.

El `build` de producción del WMS finaliza correctamente. No se modificaron ni eliminaron especies o sectores. Los registros y archivos temporales creados para QA fueron eliminados al finalizar.

## Estado de corrección y revalidación

Las secciones de hallazgos conservan la evidencia del comportamiento inicial. Esta matriz registra el resultado posterior a las correcciones:

| ID | Estado | Revalidación final |
|---|---|---|
| QA-001 | Resuelto | Compra real creada con `created_by` resuelto a `usuarios.id`; luego eliminada. Prueba automatizada aprobada. |
| QA-002 | Resuelto | El mismo access token fue rechazado por `/auth/me` y `/audit` después de logout. La sesión de Supabase se cerró y la revocación temporal ya obsoleta fue limpiada. |
| QA-003 | Resuelto | Tras eliminar una foto, original, `w=400` y `w=800` respondieron 404. Se agregó metadata `variants` y compatibilidad con filas antiguas. |
| QA-004 | Resuelto | El filtro dedicado `nursery` y la búsqueda general devolvieron exactamente el ejemplar temporal (`total=1`). |
| QA-005 | Resuelto | Límites negativos en especies público/staff responden HTTP 422. |
| QA-006 | Resuelto | Una compra temporal quedó registrada con `accion=PURCHASE`, sin degradarse a `UPDATE`. |
| QA-007 | Resuelto | Con `limit=1`, la API devolvió `count=1` y `total_available=724`. |
| QA-008 | Resuelto | Sin overflow global en 360×740, 390×844, 412×915, 768×1024 y 1280×800. |
| QA-009 | Resuelto | Cero controles visibles bajo 44×44 px en la revalidación; especies, sectores e inventario también quedaron sin overflow a 390 px. |
| QA-010 | Resuelto | Una venta real temporal conservó `invoice_number` en la respuesta agrupada; luego se eliminó. Prueba de contrato aprobada. |

Evidencia automatizada final:

- Backend: `12 passed` con `pytest`.
- WMS: `npm run build` exitoso.
- Consola del dashboard en la regresión responsive final: 0 errores.
- Advertencias de hooks e imágenes resueltas en los módulos incluidos. Las advertencias restantes pertenecen exclusivamente a Editor del Home y Editor de la información, excluidos de este trabajo.
- Migraciones aplicadas: revocación de sesiones, metadata de variantes fotográficas y ampliación de acciones de auditoría.

## Alcance y entorno

- Frontend probado: código actual de `wms/`, ejecutado localmente con Next.js 15.5.9.
- Backend probado: despliegue Railway configurado por el proyecto.
- Datos y almacenamiento: Supabase y Cloudflare R2 configurados por el proyecto.
- Autenticación: cuenta activa existente `felicaniu@gmail.com`; no fue necesario crear una cuenta nueva.
- Viewports responsive: 360×740, 390×844, 412×915, 768×1024 y 1280×800.
- Módulos excluidos por solicitud: **Editor del Home** y **Editor de la información**.
- Restricción respetada: especies y sectores se probaron únicamente en lectura, búsqueda, navegación y presentación; no se crearon, editaron ni eliminaron.

## Cobertura ejecutada

| Área | Validaciones principales | Resultado |
|---|---|---|
| Salud, CORS y autenticación | Health check, preflight permitido, credencial inválida, login, `/auth/me`, logout y reutilización de token | Conforme tras QA-002 |
| Especies | Listados público/staff, detalle por ID y slug, privacidad de campos internos, recurso inexistente y parámetros inválidos | Conforme tras QA-005 |
| Sectores | Listado, detalle, relaciones y presentación responsive, sin mutaciones | Conforme |
| Inventario | Crear, consultar, actualizar y eliminar ejemplar temporal; standby, búsqueda general, viveros y validaciones | Conforme tras QA-004 |
| Compras y ventas | Validaciones, compra, venta, duplicado, listados y formulario responsive | Conforme tras QA-001 y QA-010 |
| Fotografías | Subida, variantes, listado, actualización, portada y eliminación | Conforme tras QA-003 |
| Documentos de factura | Rechazo de formato inválido, carga PDF, asociación y eliminación | Conforme |
| Tickets | Validación, creación, búsqueda, resumen, cambio de estado y eliminación | Conforme |
| Auditoría | Consulta, filtros, eventos de CRUD, compras/ventas y metadatos de paginación | Conforme tras QA-006 y QA-007 |
| Reportes | Carga de métricas, gráficos y distribución responsive | Conforme |
| Responsive/UX | Dashboard, especies, sectores, inventario, transacciones, reportes, auditoría y tickets | Conforme tras QA-008 y QA-009 |
| Build | `npm run build` de WMS | Exitoso con advertencias |

## Hallazgos

### QA-001 — Alta — No es posible crear una factura de compra válida

**Resultado actual:** `POST /transactions/purchases` devuelve HTTP 500 con un payload válido.

Payload mínimo reproducible:

```json
{
  "nursery": "QA_INV_<id>",
  "invoice_number": "QA_INV_<id>-FAC",
  "issue_date": "2026-07-21",
  "net_amount": 1000,
  "tax_amount": 190,
  "total_amount": 1190
}
```

**Resultado esperado:** creación exitosa de la factura y respuesta 201/200 según el contrato del endpoint.

**Causa identificada:** `backend/app/services/transactions_service.py:124` asigna a `created_by` el UUID de Supabase Auth, mientras `backend/app/core/facturas_schema.sql:28` define `created_by bigint`. La incompatibilidad UUID → bigint bloquea la inserción.

**Impacto:** el flujo principal de ingreso de compras queda inutilizable, aunque listado, actualización, documento y eliminación funcionan cuando la fila existe.

**Recomendación:** definir una única identidad canónica. Preferentemente migrar `created_by` a `uuid`/`text` y agregar la relación correspondiente, o resolver explícitamente el UUID hacia `usuarios.id` antes de insertar. Añadir una prueba de integración con usuario autenticado real.

### QA-002 — Alta — El bearer token sigue autorizado después de logout

**Reproducción:** iniciar sesión, conservar el bearer token, ejecutar `POST /auth/logout` y volver a consultar `/auth/me` con el mismo token.

**Resultado actual:** logout responde 204, pero `/auth/me` continúa respondiendo 200 y `authenticated: true` con el token anterior.

**Resultado esperado:** la credencial cerrada no debería seguir autorizando endpoints privados, conforme a la expectativa de cierre de sesión de la aplicación.

**Evidencia de código:** `backend/app/api/routes_auth.py:443-458` limpia la sesión/cookies y ejecuta `sb.auth.sign_out()`, pero ese cliente no está asociado al access token recibido en la petición. Además, un JWT de acceso ya emitido puede seguir siendo válido hasta expirar si no existe revocación propia.

**Impacto:** una copia del bearer token puede continuar accediendo a datos privados después de que el usuario cierre sesión.

**Recomendación:** definir la semántica de revocación y aplicarla de extremo a extremo: access tokens de vida corta, revocación/denylist por `jti` o versión de sesión, y cierre de la sesión de Supabase asociada al token/refresh token concreto. Agregar un test automático que exija 401 tras logout.

### QA-003 — Media — Eliminar una foto deja variantes huérfanas en R2

**Reproducción:** subir una imagen, verificar original y variantes `w=400`/`w=800`, eliminarla por API y consultar las tres URLs.

**Resultado actual:** la fila desaparece y el original devuelve 404, pero las dos variantes continuaron respondiendo 200.

**Causa confirmada:** la base desplegada no tiene la columna `fotos.variants` (`42703: column fotos.variants does not exist`). El servicio implementa compatibilidad eliminando ese campo cuando falta (`backend/app/services/photos_service.py:20-73`). Al borrar, solo elimina las variantes persistidas en ese diccionario (`backend/app/services/photos_service.py:545-552`), que en producción queda vacío.

**Impacto:** acumulación de objetos sin referencia, costo de almacenamiento y permanencia de archivos que el usuario cree eliminados.

**Recomendación:** desplegar una migración `variants jsonb`, persistir y respaldar las rutas; adicionalmente, derivar de forma segura las claves `w=400` y `w=800` desde `storage_path` durante la eliminación para soportar registros anteriores.

**Limpieza QA:** las dos variantes detectadas fueron eliminadas manualmente y luego verificadas con respuesta 404.

### QA-004 — Media — El filtro dedicado por vivero no devuelve coincidencias

**Reproducción:** crear un ejemplar temporal con vivero `QA_INV_<id>`, confirmar el valor por detalle y `/ejemplar/staff/nurseries`, y consultar `/ejemplar/staff?nursery=QA_INV_<id>`.

**Resultado actual:** el filtro `nursery` responde 200 con `data: []` y `total: 0`. La búsqueda general `q=QA_INV_<id>` sí encuentra el mismo ejemplar.

**Resultado esperado:** el filtro parcial por vivero debe retornar el ejemplar.

**Observación:** el código actual contiene un `ilike` en `backend/app/services/ejemplar_service.py:108-109`; por tanto, el comportamiento desplegado no coincide con la intención del repositorio y debe verificarse la versión efectiva, el contrato PostgREST y la consulta generada.

### QA-005 — Media — Límites negativos de especies producen HTTP 500

**Reproducción:** consultar tanto `/species/public?limit=-1` como `/species/staff?limit=-1`.

**Resultado actual:** HTTP 500 con error PostgREST `PGRST103 Requested range not satisfiable`.

**Resultado esperado:** HTTP 422 por parámetro inválido.

**Causa:** `backend/app/api/routes_species.py:14-17` y `:45-48` reciben enteros sin restricciones `Query(ge=..., le=...)`.

**Recomendación:** usar `limit: int = Query(..., ge=1, le=<máximo>)` y `offset: int = Query(0, ge=0)` en ambos endpoints, con pruebas de límites negativos, cero y máximos.

### QA-006 — Media — Compras y ventas se presentan como “Actualizar” en auditoría

**Resultado actual:** cuando la base rechaza acciones no estándar, `audit_service` reintenta guardando `accion="UPDATE"` y conserva el evento original en `campos_nuevos.evento` (`backend/app/services/audit_service.py:141-163`). La UI solo trata `PURCHASE` y `SALE` de forma especial cuando están en `log.accion` (`wms/src/app/audit/page.jsx:186-218` y `:768-780`).

**Resultado esperado:** los movimientos deberían visualizarse y filtrarse como compra/venta, no como una actualización genérica.

**Impacto:** semántica confusa y filtros/reportes de auditoría incompletos.

**Recomendación:** ampliar el tipo/constraint de `accion` en la base para admitir los eventos reales o normalizar en la API/UI usando `campos_nuevos.evento`, igual que ya se hace para eventos de login.

### QA-007 — Baja — `total_available` de auditoría no representa el total

**Reproducción:** consultar `/audit?limit=1` en una base con múltiples registros.

**Resultado actual:** `count=1` y `total_available=1`.

**Resultado esperado:** `count` debe ser el tamaño de la página y `total_available` el total filtrado.

**Causa:** el servicio calcula `total_count` pero no lo devuelve (`backend/app/services/audit_service.py:209-244`); la ruta asigna `len(logs)` a ambos campos (`backend/app/api/routes_audit.py:37-42`).

### QA-008 — Media — Overflow horizontal del dashboard en 360 y 390 px

**Resultado actual:**

- A 360×740: viewport útil de 345 px y documento de 386 px.
- A 390×844: viewport útil de 375 px y documento de 386 px.
- A 412, 768 y 1280 px: no se detectó overflow global.

Visualmente, el encabezado y el identificador de usuario quedan comprimidos/recortados y aparece desplazamiento horizontal.

**Recomendación:** permitir wrap/columna en el encabezado, limitar el ancho del chip de usuario (`min-width: 0`, truncado) y asegurar que los contenedores raíz usen `max-width: 100%` sin anchos mínimos rígidos.

### QA-009 — Baja — Varios controles táctiles quedan bajo 44×44 px

En 390 px se midieron, entre otros:

- Volver: 30×37 px.
- Agregar: 37×40 px.
- Botones “Ver”: 43×29 px.
- Botones “Eliminar”: 72×29 px.
- Filtros/selects: entre 30 y 40 px de alto.
- Acciones principales del inventario: 32 px de alto.

No se detectó overflow global en especies, sectores o inventario; las tablas densas usan un contenedor horizontal desplazable. Sin embargo, el tamaño de los controles reduce la comodidad táctil y aumenta el riesgo de pulsaciones erróneas.

**Recomendación:** establecer una caja táctil de al menos 44×44 px para acciones principales y aumentar el alto de inputs/selects, manteniendo el área visible de las tablas dentro de un contenedor con indicador de desplazamiento.

### QA-010 — Media — `invoice_number` siempre queda nulo en ventas agrupadas

**Hallazgo estático:** `get_sales_grouped` construye el `select` sin `invoice_number` (`backend/app/services/transactions_service.py:363-367`), pero posteriormente lee `ejemplar.get("invoice_number")` (`:422`).

**Impacto:** el contrato incluye el campo, pero nunca puede devolver su valor aunque exista en el ejemplar.

**Recomendación:** incluir `invoice_number` en la selección y agregar una prueba de contrato para ventas agrupadas.

## Observaciones técnicas adicionales

1. `npm run build` finaliza correctamente, pero ESLint informa dependencias faltantes en hooks, incluyendo `fetchLogs` en `wms/src/app/audit/page.jsx`, `fetchPhotos` en `PhotoGallery` y `loadFromSource` en `AuthenticatedImage`. Conviene estabilizar las funciones con `useCallback` o ajustar las dependencias para evitar closures obsoletos.
2. Existen advertencias de `<img>` en especies y componentes de fotografías. Revisar `next/image` o documentar explícitamente los casos donde no aplica.
3. Next.js infiere como raíz `C:\Users\CACTARIO CM` por la existencia de varios `package-lock.json`. Esto puede afectar el output tracing. Configurar `outputFileTracingRoot` o consolidar lockfiles.
4. En una ejecución de login con clave maestra se mostró “Autenticación exitosa” sin redirección automática. Una navegación nueva a `/staff` sí cargó correctamente y no se logró reproducir de forma estable; se deja como observación para monitoreo, no como defecto confirmado.

### Estado de las observaciones técnicas

- Se estabilizaron con `useCallback` las cargas de auditoría y galería, y se eliminó la dependencia inestable de carga en `AuthenticatedImage`.
- Los usos de `<img>` incluidos quedaron documentados como intencionales: variantes R2 ya redimensionadas o blob URLs autenticadas/locales, donde el optimizador de Next.js no aporta valor.
- Se configuró `outputFileTracingRoot`; desapareció la advertencia de múltiples lockfiles.
- La observación de redirección de login continúa como monitoreo, ya que no fue reproducible de manera estable ni generó un fallo confirmado.

## Riesgos de seguridad adicionales detectados

Estos riesgos fueron detectados por el asesor de Supabase después de aplicar las migraciones. No forman parte de los diez defectos funcionales anteriores y **no se modificaron automáticamente**, porque habilitar RLS sin políticas compatibles bloquearía los clientes actuales y requiere un diseño de acceso coordinado:

1. **Alta — RLS deshabilitado:** `especies`, `sectores`, `usuarios`, `ejemplar`, `public_views` y `sectores_especies` están expuestas por PostgREST sin Row Level Security.
2. **Alta — función privilegiada expuesta:** `public.insert_usuario_admin(...)` es `SECURITY DEFINER` y puede ser ejecutada por los roles `anon` y `authenticated`.
3. **Media — políticas demasiado amplias:** las mutaciones de `fotos` para usuarios autenticados usan condiciones siempre verdaderas; el bucket público `photos` permite listado amplio.
4. **Media — hardening pendiente:** tres funciones tienen `search_path` mutable y la protección de contraseñas filtradas está desactivada.
5. **Baja/rendimiento:** existen claves foráneas sin índice en `movimiento_de_inventario` e índices duplicados en `ejemplar` y `fotos`.

Referencia de remediación: [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter) y [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Resultados satisfactorios relevantes

- Acceso anónimo a inventario rechazado con 401.
- Campos internos de compra/salud ocultos en especies públicas.
- CRUD temporal de ejemplares, incluido standby, funcionó y quedó auditado.
- Venta válida y protección ante venta duplicada funcionaron.
- Carga, asociación y eliminación de documento PDF de factura funcionaron; formatos inválidos devolvieron 400.
- Flujo completo de tickets: creación, consulta, resumen, actualización administrativa y eliminación.
- Reportes cargaron métricas coherentes con los 19 ejemplares activos observados.
- No se detectaron errores de consola durante la navegación final por las rutas revisadas.
- Inventario evitó overflow global en todos los viewports probados; la tabla usa desplazamiento interno.

## Limpieza y estado final

- Residuos con prefijos `QA_INV_`/`QA_FIX_` o user-agent `CactarioQA*`/`CactarioFix_QA*`: **0** en `ejemplar`, `facturas_compra`, `support_tickets`, `fotos` y `auditoria_cambios`.
- Eventos de auditoría eliminados durante la limpieza de corrección: **23**; revocaciones obsoletas eliminadas: **1**.
- Objetos R2 temporales verificados: original de foto, `w=400`, `w=800` y PDF responden **404**.
- Scripts QA, override temporal de entorno, dependencias Python temporales y logs locales: eliminados.
- Servidor local de QA: detenido; puerto 3001 liberado.
- Cuenta existente usada para la prueba: conservada.
- Especies y sectores: sin cambios ni eliminaciones.
- `docs/Guia/`: contenido preexistente no modificado.

## Prioridad sugerida posterior a la corrección

1. Diseñar y desplegar el hardening de RLS sin romper los endpoints públicos ni los flujos staff.
2. Revocar `EXECUTE` de `insert_usuario_admin(...)` para roles no administrativos tras confirmar que no existe un consumidor legítimo.
3. Restringir las políticas de mutación de fotos y el listado del bucket.
4. Corregir `search_path`, índices duplicados y claves foráneas sin índice.
5. Monitorear la redirección posterior al login y abrir un defecto solo si vuelve a reproducirse.
