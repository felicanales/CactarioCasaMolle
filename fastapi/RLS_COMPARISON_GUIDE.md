# 🔐 Comparación de Políticas RLS: Genéricas vs Ownership

## 📊 Resumen Ejecutivo

He creado **DOS versiones** de políticas RLS basadas en el esquema real de tus tablas:

| Archivo | Nivel de Seguridad | Uso Recomendado |
|---------|-------------------|-----------------|
| `rls_policies_secure.sql` | 🟡 **MEDIO** | Si TODOS los staff comparten datos |
| `rls_policies_ownership.sql` | 🟢 **ALTO** | Si cada usuario maneja SUS propios datos |

---

## 🔍 Diferencias Clave

### Tabla: `ejemplar` (Especímenes)

#### 🟡 Versión Genérica (`rls_policies_secure.sql`):
```sql
-- TODOS los usuarios autenticados ven TODOS los ejemplares
CREATE POLICY "ejemplar_authenticated_select"
ON ejemplar FOR SELECT TO authenticated
USING (true);
```

**Resultado:**
- ✅ Usuario A ve ejemplares de Usuario B, C, D...
- ✅ Todos pueden editar cualquier ejemplar
- ⚠️ No hay separación de datos entre usuarios

---

#### 🟢 Versión Ownership (`rls_policies_ownership.sql`):
```sql
-- SOLO ves TUS propios ejemplares (basado en ejemplar.user_id)
CREATE POLICY "ejemplar_select_own"
ON ejemplar FOR SELECT TO authenticated
USING (user_id = public.get_current_user_id());
```

**Resultado:**
- ✅ Usuario A solo ve SUS ejemplares
- ✅ Usuario B solo ve SUS ejemplares
- ✅ Separación completa de datos
- 🔐 Mayor privacidad y seguridad

---

### Tabla: `purchases` (Compras)

#### 🟡 Versión Genérica:
```sql
-- Todos ven todas las compras
USING (true);
```

**Escenario:**
```
👤 María puede ver las compras de:
- Pedro
- Juan
- Ana
- Todos los demás staff
```

---

#### 🟢 Versión Ownership:
```sql
-- Solo ves tus propias compras (basado en purchases.created_by)
USING (created_by = public.get_current_user_id());
```

**Escenario:**
```
👤 María solo ve:
- SUS propias compras
- Nadie más puede ver las compras de María
```

---

### Tabla: `movimiento_de_inventario` (Auditoría)

#### 🟡 Versión Genérica:
```sql
-- Todos ven todos los movimientos
USING (true);
```

---

#### 🟢 Versión Ownership:
```sql
-- Solo ves los movimientos que TÚ registraste
USING (user_id = public.get_current_user_id());

-- PLUS: Solo INSERT (no UPDATE/DELETE) - Protege auditoría
```

**Beneficio Adicional:** 
- ✅ Movimientos de inventario son **inmutables**
- ✅ Nadie puede modificar/borrar registros históricos
- 🔒 Auditoría protegida

---

## 🎯 ¿Cuál Usar?

### Usa `rls_policies_secure.sql` (Genérica) si:

✅ Trabajas en un **equipo pequeño** que comparte todo  
✅ Todos los staff necesitan ver **todos los datos**  
✅ Es un **jardín colaborativo** donde todos manejan todas las plantas  
✅ Confías en que los usuarios no modificarán datos de otros  

**Ejemplo:** Jardín comunitario con 3-5 jardineros que comparten responsabilidades.

---

### Usa `rls_policies_ownership.sql` (Ownership) si:

✅ Cada usuario maneja **sus propias plantas/compras**  
✅ Necesitas **separación de datos** entre usuarios  
✅ Tienes **múltiples jardineros independientes**  
✅ Necesitas **auditoría clara** de quién hizo qué  
✅ Requieres **mayor privacidad** entre usuarios  

**Ejemplo:** Vivero con múltiples empleados, cada uno responsable de sus propias compras e inventario.

---

## 🔧 Función Helper Requerida (Solo Ownership)

La versión **Ownership** requiere una función helper para mapear el UUID de Supabase Auth al ID numérico de tu tabla `usuarios`:

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS BIGINT AS $$
  SELECT id FROM usuarios 
  WHERE supabase_uid = auth.uid() 
  AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Esta función:**
- ✅ Convierte `auth.uid()` (UUID) → `usuarios.id` (int8)
- ✅ Solo devuelve usuarios activos (`active = true`)
- ✅ Es rápida (usa índice en `supabase_uid`)

---

## 📋 Comparación Detallada por Tabla

### 1. **ejemplar** (Especímenes de Plantas)

| Aspecto | Genérica | Ownership |
|---------|----------|-----------|
| **Quien ve qué** | Todos ven todos | Solo tus ejemplares |
| **Columna usada** | - | `user_id` |
| **Caso de uso** | Inventario compartido | Inventario personal |
| **Privacidad** | 🟡 Baja | 🟢 Alta |

---

### 2. **purchases** (Compras)

| Aspecto | Genérica | Ownership |
|---------|----------|-----------|
| **Quien ve qué** | Todos ven todos | Solo tus compras |
| **Columna usada** | - | `created_by` |
| **Caso de uso** | Presupuesto compartido | Presupuesto por usuario |
| **Auditoría** | 🟡 Difusa | 🟢 Clara |

---

### 3. **receipts** (Recibos)

| Aspecto | Genérica | Ownership |
|---------|----------|-----------|
| **Quien ve qué** | Todos ven todos | Solo tus recibos |
| **Columna usada** | - | `received_by` |
| **Caso de uso** | Recepción compartida | Recepción personal |

---

### 4. **movimiento_de_inventario** (Movimientos)

| Aspecto | Genérica | Ownership |
|---------|----------|-----------|
| **Quien ve qué** | Todos ven todos | Solo tus movimientos |
| **UPDATE/DELETE** | ✅ Permitido | ❌ Bloqueado |
| **Auditoría** | 🟡 Modificable | 🟢 Inmutable |
| **Compliance** | 🟡 Básico | 🟢 Alto |

---

### 5. **usuarios** (Usuarios)

| Aspecto | Genérica | Ownership |
|---------|----------|-----------|
| **Quien ve qué** | Tu perfil | Tu perfil + otros activos |
| **Motivo** | Privacidad | Colaboración |
| **Filtro** | `supabase_uid = auth.uid()` | `supabase_uid = auth.uid() OR active = true` |

**Nota:** Ownership permite ver otros usuarios activos para:
- Asignar tareas
- Mencionar en comentarios
- Ver quién está en el equipo

---

## 🚀 Instrucciones de Implementación

### Opción A: Políticas Genéricas (Más Simple)

```bash
# 1. Ir a Supabase SQL Editor
# 2. Ejecutar:
fastapi/app/core/rls_policies_secure.sql
```

**Ventajas:**
- ✅ Implementación más rápida
- ✅ No requiere función helper
- ✅ Ideal para equipos pequeños

---

### Opción B: Políticas con Ownership (Más Seguro) ⭐ RECOMENDADO

```bash
# 1. Ir a Supabase SQL Editor
# 2. Ejecutar:
fastapi/app/core/rls_policies_ownership.sql
```

**Ventajas:**
- ✅ Mayor seguridad
- ✅ Separación de datos
- ✅ Auditoría más clara
- ✅ Mejor para cumplimiento normativo

**Requisito:** 
- Crea la función `get_current_user_id()` (incluida en el script)

---

## 🧪 Testing

### Test 1: Crear dos usuarios de prueba

```sql
-- En Supabase Dashboard → Authentication → Users
-- Crear usuario A: maria@test.com
-- Crear usuario B: pedro@test.com
```

### Test 2: Insertar datos como usuario A

```sql
-- Login como María
-- Insertar ejemplar:
INSERT INTO ejemplar (species_id, sector_id, user_id, health_status)
VALUES (1, 1, (SELECT id FROM usuarios WHERE email = 'maria@test.com'), 'healthy');
```

### Test 3: Intentar ver como usuario B

```sql
-- Login como Pedro
SELECT * FROM ejemplar;
```

**Resultado esperado:**

| Con Genérica | Con Ownership |
|--------------|---------------|
| ✅ Pedro ve el ejemplar de María | ❌ Pedro NO ve el ejemplar de María |

---

## ⚠️ Migración entre Versiones

### De Genérica → Ownership:

**IMPORTANTE:** Tus datos existentes necesitan tener `user_id` / `created_by` / `received_by` poblados.

```sql
-- Si tienes ejemplares sin user_id, asígnalos a un usuario por defecto:
UPDATE ejemplar 
SET user_id = (SELECT id FROM usuarios WHERE email = 'admin@tudominio.com')
WHERE user_id IS NULL;

-- Lo mismo para otras tablas
UPDATE purchases SET created_by = ... WHERE created_by IS NULL;
UPDATE receipts SET received_by = ... WHERE received_by IS NULL;
```

### De Ownership → Genérica:

Simple: Solo ejecuta `rls_policies_secure.sql` - sobrescribirá las políticas de ownership.

---

## 📊 Tabla de Decisión

| Pregunta | Sí → Genérica | No → Ownership |
|----------|---------------|----------------|
| ¿Equipo de menos de 5 personas? | ✅ | |
| ¿Todos confían en todos? | ✅ | |
| ¿Datos compartidos entre staff? | ✅ | |
| ¿Necesitas separación de datos? | | ✅ |
| ¿Múltiples usuarios independientes? | | ✅ |
| ¿Auditoría individual requerida? | | ✅ |
| ¿Cumplimiento GDPR/privacidad? | | ✅ |

---

## 💡 Recomendación Final

### 🏆 **Para Producción:** Usa `rls_policies_ownership.sql`

**Razones:**
1. ✅ **Más seguro por defecto**
2. ✅ **Escalable** - Funciona bien con 3 o 300 usuarios
3. ✅ **Auditoría clara** - Sabes quién hizo qué
4. ✅ **Cumplimiento** - Mejor para GDPR/privacidad
5. ✅ **Flexible** - Puedes relajar políticas después si necesitas

### 🧪 **Para Desarrollo/Testing:** Usa `rls_policies_secure.sql`

**Razones:**
1. ✅ Más rápido de implementar
2. ✅ Más fácil de debuggear
3. ✅ No requiere función helper

---

## 🆘 Troubleshooting

### "No veo ningún dato después de aplicar Ownership"

**Causa:** Tus registros existentes no tienen `user_id` / `created_by` asignado.

**Solución:**
```sql
-- Ver cuántos registros están sin ownership:
SELECT COUNT(*) FROM ejemplar WHERE user_id IS NULL;
SELECT COUNT(*) FROM purchases WHERE created_by IS NULL;

-- Asignar a un usuario por defecto:
UPDATE ejemplar SET user_id = 1 WHERE user_id IS NULL;
```

---

### "get_current_user_id() devuelve NULL"

**Causa:** No existe mapeo entre `auth.uid()` y `usuarios.supabase_uid`.

**Solución:**
```sql
-- Verificar:
SELECT auth.uid();  -- Tu UUID de Supabase Auth
SELECT * FROM usuarios WHERE supabase_uid = auth.uid();  -- ¿Existe?

-- Si no existe, crear usuario:
INSERT INTO usuarios (supabase_uid, email, username, active)
VALUES (auth.uid(), 'tu@email.com', 'tu_username', true);
```

---

## 📚 Archivos de Referencia

| Archivo | Descripción |
|---------|-------------|
| `rls_policies_secure.sql` | Políticas genéricas (todos ven todo) |
| `rls_policies_ownership.sql` | Políticas con ownership (solo tus datos) ⭐ |
| `verify_rls.sql` | Script de verificación |
| `get_table_schema.sql` | Ver esquema de tablas |
| `RLS_SECURITY_GUIDE.md` | Guía general de RLS |

---

## ✅ Checklist Final

- [ ] Decidí qué versión usar (Genérica vs Ownership)
- [ ] Ejecuté el script SQL correspondiente en Supabase
- [ ] Verifiqué con `verify_rls.sql` que RLS está habilitado
- [ ] Probé con usuarios diferentes que las políticas funcionan
- [ ] (Si Ownership) Verifiqué que `get_current_user_id()` funciona
- [ ] (Si Ownership) Asigné ownership a registros existentes
- [ ] Mi API FastAPI sigue funcionando (usa service_role)
- [ ] Documenté mi decisión para el equipo

---

**🔒 Ambas versiones son seguras. La diferencia es el nivel de separación de datos entre usuarios.**

