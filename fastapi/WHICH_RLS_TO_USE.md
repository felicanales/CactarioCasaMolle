# 🤔 ¿Qué Políticas RLS Debo Usar?

## Responde estas 3 preguntas:

### 1️⃣ ¿Cuántas personas usarán el sistema?
- **1-5 personas** → Cualquiera funciona
- **6+ personas** → Usa **Ownership** 🟢

---

### 2️⃣ ¿Los usuarios deben ver datos de otros usuarios?
- **SÍ** - Todos comparten plantas/compras → Usa **Genérica** 🟡
- **NO** - Cada usuario sus propios datos → Usa **Ownership** 🟢

---

### 3️⃣ ¿Necesitas auditoría clara de quién hizo qué?
- **NO** - Solo necesito que funcione → Usa **Genérica** 🟡
- **SÍ** - Necesito rastrear responsabilidad → Usa **Ownership** 🟢

---

## 🎯 Decisión Rápida

### Usa `rls_policies_secure.sql` (GENÉRICA 🟡) si:

```
✅ Equipo pequeño (2-5 personas)
✅ Todos confían entre sí
✅ Jardín/vivero comunitario
✅ Datos compartidos
✅ No necesitas separación estricta
```

**Ejemplo:** 
> *"Somos 3 jardineros que cuidamos todas las plantas juntos. Cualquiera puede registrar compras y movimientos."*

---

### Usa `rls_policies_ownership.sql` (OWNERSHIP 🟢) si:

```
✅ Equipo grande (6+ personas)
✅ Cada usuario responsable de su área
✅ Múltiples empleados independientes
✅ Necesitas privacidad entre usuarios
✅ Auditoría y compliance importantes
```

**Ejemplo:**
> *"Somos un vivero con 10 empleados. Cada uno maneja sus propias plantas y compras. Necesito saber quién registró cada cosa."*

---

## 📊 Comparación Visual

### Escenario: María registra un ejemplar de cactus

#### Con GENÉRICA 🟡:
```
María registra → Cactus #123
Pedro puede ver → Cactus #123 ✅
Juan puede ver → Cactus #123 ✅
Ana puede ver → Cactus #123 ✅

Todos ven TODO
```

#### Con OWNERSHIP 🟢:
```
María registra → Cactus #123 (user_id: María)
Pedro puede ver → ❌ (no es suyo)
Juan puede ver → ❌ (no es suyo)
Ana puede ver → ❌ (no es suyo)

Solo María ve SU cactus
```

---

## 🔍 Diferencias Clave por Tabla

### `ejemplar` (Especímenes)

| Política | María ve | Pedro ve |
|----------|----------|----------|
| **Genérica** | Todos los ejemplares | Todos los ejemplares |
| **Ownership** | Solo SUS ejemplares | Solo SUS ejemplares |

---

### `purchases` (Compras)

| Política | María ve | Pedro ve |
|----------|----------|----------|
| **Genérica** | Todas las compras | Todas las compras |
| **Ownership** | Solo SUS compras | Solo SUS compras |

---

### `movimiento_de_inventario` (Movimientos)

| Política | María ve | Pedro ve | Puede modificar |
|----------|----------|----------|-----------------|
| **Genérica** | Todos | Todos | ✅ Sí |
| **Ownership** | Solo suyos | Solo suyos | ❌ No (solo lectura) |

---

## ⚡ Recomendación por Defecto

### 🏆 **OWNERSHIP** (`rls_policies_ownership.sql`)

**¿Por qué?**
1. ✅ Más seguro por defecto
2. ✅ Escala mejor a futuro
3. ✅ Puedes relajar después si necesitas
4. ✅ Mejor para auditoría
5. ✅ Cumplimiento GDPR/privacidad

**Siempre es más fácil relajar seguridad que endurecerla después.**

---

## 📝 Archivos a Ejecutar

### Opción A: Genérica 🟡
```bash
# En Supabase SQL Editor:
fastapi/app/core/rls_policies_secure.sql
```

### Opción B: Ownership 🟢 ⭐ RECOMENDADO
```bash
# En Supabase SQL Editor:
fastapi/app/core/rls_policies_ownership.sql
```

---

## 🔄 ¿Puedo Cambiar Después?

**✅ SÍ**, puedes cambiar en cualquier momento:

### De Genérica → Ownership:
```sql
-- 1. Ejecuta rls_policies_ownership.sql
-- 2. Asigna ownership a datos existentes:
UPDATE ejemplar SET user_id = ... WHERE user_id IS NULL;
UPDATE purchases SET created_by = ... WHERE created_by IS NULL;
```

### De Ownership → Genérica:
```sql
-- Solo ejecuta rls_policies_secure.sql
-- Sobrescribirá las políticas
```

---

## 🆘 ¿Todavía No Estás Seguro?

### Empieza con GENÉRICA si:
- Es un proyecto de prueba/desarrollo
- Equipo muy pequeño (2-3 personas)
- Solo quieres que funcione rápido

### Empieza con OWNERSHIP si:
- Es para producción
- Planeas crecer el equipo
- Necesitas auditoría
- Quieres la opción más segura

---

## 📞 Próximos Pasos

1. **Lee** `RLS_COMPARISON_GUIDE.md` (guía completa)
2. **Decide** qué versión usar
3. **Ejecuta** el script SQL en Supabase
4. **Verifica** con `verify_rls.sql`
5. **Prueba** con usuarios reales

---

## 💡 Mi Decisión

```
☐ Genérica (rls_policies_secure.sql)
☐ Ownership (rls_policies_ownership.sql)

Razón: _________________________________

Fecha de implementación: ______________
```

---

**🎯 Si tienes dudas, ve por OWNERSHIP. Es más seguro y puedes relajarlo después si necesitas.**

