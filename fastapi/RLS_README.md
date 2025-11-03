# 🔐 Row-Level Security (RLS) - Guía Rápida

## ⚠️ Problema Detectado

Supabase detectó que **10 tablas** están sin Row-Level Security (RLS) habilitado.

**Nivel de Riesgo:** 🔴 **CRÍTICO** - La base de datos está públicamente accesible.

---

## ⚡ Solución Rápida (5 minutos)

### Paso 1: Elige tu nivel de seguridad

Tienes **DOS opciones** de políticas RLS:

#### 🟡 Opción A: Políticas Genéricas (Datos Compartidos)
- **Archivo:** `app/core/rls_policies_secure.sql`
- **Uso:** Equipos pequeños (3-5 personas) donde todos comparten datos
- **Comportamiento:** Todos los usuarios autenticados ven todos los datos

#### 🟢 Opción B: Políticas con Ownership (Datos Privados) ⭐ RECOMENDADO
- **Archivo:** `app/core/rls_policies_ownership.sql`
- **Uso:** Cada usuario maneja sus propios datos
- **Comportamiento:** Cada usuario solo ve SUS propios registros

---

### Paso 2: Ejecuta en Supabase

1. Abre **Supabase Dashboard** → SQL Editor
2. Copia TODO el contenido del archivo elegido
3. Pega y ejecuta (`Ctrl+Enter`)

---

### Paso 3: Verifica

1. Ejecuta el contenido de `verify_rls.sql` en Supabase SQL Editor
2. Confirma que todas las tablas muestran "✅ SECURE"

---

## 🤔 ¿Cuál Debo Usar?

### Usa **Genérica** (`rls_policies_secure.sql`) si:
- ✅ Equipo pequeño (2-5 personas)
- ✅ Todos confían entre sí
- ✅ Jardín/vivero comunitario
- ✅ Datos compartidos entre todo el personal

**Ejemplo:** *"Somos 3 jardineros que cuidamos todas las plantas juntos."*

---

### Usa **Ownership** (`rls_policies_ownership.sql`) si:
- ✅ Equipo grande (6+ personas)
- ✅ Cada usuario responsable de su área
- ✅ Necesitas privacidad entre usuarios
- ✅ Auditoría y compliance importantes

**Ejemplo:** *"Somos un vivero con 10 empleados. Cada uno maneja sus propias plantas y compras."*

---

## 📊 Comparación Visual

### Escenario: María registra un cactus

#### Con GENÉRICA 🟡:
```
María registra → Cactus #123
Pedro puede ver → Cactus #123 ✅
Juan puede ver → Cactus #123 ✅

Todos ven TODO
```

#### Con OWNERSHIP 🟢:
```
María registra → Cactus #123 (user_id: María)
Pedro puede ver → ❌ (no es suyo)
Juan puede ver → ❌ (no es suyo)

Solo María ve SU cactus
```

---

## 🔧 Impacto en Tu Aplicación

### ✅ FastAPI Backend - **SIN CAMBIOS**
Tu backend usa `service_role_key` que **bypassa RLS**.

**Resultado:** Tu API sigue funcionando EXACTAMENTE igual.

### ✅ Next.js Frontend - **Funciona Automáticamente**
Tu frontend usa `anon_key` que **respeta RLS**.

**Resultado:** Los usuarios solo ven datos según las políticas.

---

## 📚 Archivos Disponibles

| Archivo | Descripción |
|---------|-------------|
| `app/core/rls_policies_secure.sql` | Políticas genéricas - Todos comparten datos |
| `app/core/rls_policies_ownership.sql` | Políticas ownership - Datos privados por usuario ⭐ |
| `verify_rls.sql` | Script de verificación |
| `get_table_schema.sql` | Ver estructura de tablas |

---

## 🔄 ¿Puedo Cambiar Después?

**✅ SÍ**, puedes cambiar en cualquier momento ejecutando el otro script SQL.

### De Genérica → Ownership:
1. Ejecuta `rls_policies_ownership.sql`
2. Asigna ownership a datos existentes:
   ```sql
   UPDATE ejemplar SET user_id = ... WHERE user_id IS NULL;
   UPDATE purchases SET created_by = ... WHERE created_by IS NULL;
   ```

### De Ownership → Genérica:
1. Ejecuta `rls_policies_secure.sql`
2. ¡Listo! (no necesitas cambiar datos)

---

## 🆘 Troubleshooting

### "No veo datos después de habilitar RLS"
**Normal** - RLS está funcionando correctamente.
- Verifica que el usuario esté autenticado
- Verifica que la política permita la operación
- Usa `service_role_key` para operaciones de admin

### "Permission denied for table"
Ejecuta los statements GRANT al final del script SQL.

### "get_current_user_id() devuelve NULL" (solo Ownership)
Verifica que existe un registro en `usuarios` con el `supabase_uid` del usuario actual.

---

## 📊 Tablas Protegidas

| Tabla | Políticas Genéricas | Políticas Ownership |
|-------|-------------------|---------------------|
| `usuarios` | Solo perfil propio | Solo perfil propio |
| `especies` | Todos ven todo | Todos ven todo |
| `sectores` | Todos ven todo | Todos ven todo |
| `ejemplar` | Todos ven todo | Solo SUS ejemplares |
| `purchases` | Todos ven todo | Solo SUS compras |
| `receipts` | Todos ven todo | Solo SUS recibos |
| `movimiento_de_inventario` | Todos ven todo | Solo SUS movimientos (read-only) |

---

## ✅ Checklist Final

### Antes de Ejecutar
- [ ] Decidí entre Genérica u Ownership
- [ ] Tengo acceso a Supabase Dashboard
- [ ] Hice backup de mi base de datos (opcional pero recomendado)

### Ejecución
- [ ] Ejecuté el script SQL en Supabase SQL Editor
- [ ] Ejecuté `verify_rls.sql` y todo muestra "✅ SECURE"
- [ ] (Si Ownership) Asigné ownership a datos existentes
- [ ] (Si Ownership) Verifiqué que `get_current_user_id()` funciona

### Verificación
- [ ] Mi API FastAPI sigue funcionando
- [ ] Mi frontend Next.js funciona correctamente
- [ ] Supabase Linter muestra 0 errores de RLS

---

## 🎯 Recomendación

**Para Producción:** Usa `rls_policies_ownership.sql` 🟢

**Razones:**
1. ✅ Más seguro por defecto
2. ✅ Escalable (funciona con 3 o 300 usuarios)
3. ✅ Auditoría clara
4. ✅ Cumplimiento GDPR/privacidad
5. ✅ Puedes relajar después si necesitas

**Siempre es más fácil relajar seguridad que endurecerla después.**

---

## 📞 Recursos Adicionales

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)
- Ver también: `SECURITY_CHECKLIST.md` en la raíz del proyecto

---

**🔒 Implementa RLS antes de ir a producción.**

