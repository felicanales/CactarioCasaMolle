# 🚫 Cómo Desactivar Autenticación en Producción (Railway)

## 📋 Contexto

El sistema tiene un sistema de bypass de autenticación que está activado por defecto. Esto significa que en producción (Railway) NO se requiere autenticación a menos que configuremos la variable de entorno `BYPASS_AUTH=false`.

## ✅ Opción Recomendada: Mantener sin Autenticación

**Estado actual:** La autenticación está **DESACTIVADA** por defecto en el backend de Railway.

Esto significa que:
- ✅ No necesitas hacer login
- ✅ Puedes acceder a todas las rutas directamente
- ✅ El sistema funciona sin credenciales

## 🔧 Si Necesitas Reactivar la Autenticación

Si en el futuro necesitas activar la autenticación en producción:

### Paso 1: Configurar Variable de Entorno en Railway

1. Ve a https://railway.app
2. Selecciona tu proyecto **backend**
3. Ve a la pestaña **Variables**
4. Agrega o edita la variable:
   - **Clave:** `BYPASS_AUTH`
   - **Valor:** `false`
5. Railway desplegará automáticamente con la nueva configuración

### Paso 2: Desactivar BYPASS en el Frontend

Edita `nextjs/.env.local`:
```env
NEXT_PUBLIC_BYPASS_AUTH=false
```

O si estás desplegando en Railway/Vercel, configura esa variable en el entorno.

### Paso 3: Reiniciar Servicios

Railway desplegará automáticamente. Si estás corriendo el frontend localmente:
```bash
cd nextjs
npm run dev
```

## 🔄 Cómo Volver a Desactivar la Autenticación

Si activaste la autenticación y quieres desactivarla nuevamente:

### Paso 1: Configurar BYPASS en Railway

1. Ve a Railway → Tu proyecto backend → Variables
2. Cambia `BYPASS_AUTH=false` a `BYPASS_AUTH=true`
3. O simplemente **elimina** la variable (por defecto es `true`)

### Paso 2: Desactivar BYPASS en el Frontend

Edita `nextjs/.env.local`:
```env
NEXT_PUBLIC_BYPASS_AUTH=true
```

O elimina la variable (por defecto está activado).

### Paso 3: Reiniciar

Railway desplegará automáticamente. El frontend se actualizará al recargar la página.

## ⚙️ Resumen de Variables de Entorno

### Backend (Railway)

| Variable | Valor | Efecto |
|----------|-------|--------|
| `BYPASS_AUTH=true` | Activado | Sin autenticación (actual) |
| `BYPASS_AUTH=false` | Desactivado | Con autenticación |

**Por defecto:** `BYPASS_AUTH=true` (sin autenticación)

### Frontend (Next.js)

| Variable | Valor | Efecto |
|----------|-------|--------|
| `NEXT_PUBLIC_BYPASS_AUTH=true` | Activado | Sin login (actual) |
| `NEXT_PUBLIC_BYPASS_AUTH=false` | Desactivado | Con login |

**Por defecto:** `NEXT_PUBLIC_BYPASS_AUTH=true` (sin autenticación)

## 📝 Estado Actual del Sistema

✅ **Backend:** Autenticación DESACTIVADA (sin requerir login)
✅ **Frontend:** Autenticación DESACTIVADA (sin requerir login)
✅ **Producción:** Funciona sin credenciales
✅ **Desarrollo local:** Funciona sin credenciales
✅ **ngrok:** Funciona sin credenciales

## 🎯 Para Usar el Sistema Ahora

1. **Desde computador:** Abre `http://localhost:3000`
2. **Desde celular:** Abre tu URL de ngrok (ej: `https://xxxxx.ngrok-free.dev`)
3. **Sin login:** Las especies se mostrarán automáticamente
4. **Sin errores:** Todo funcionará sin autenticación

---

## 📞 Configuración en Railway

Para cambiar el estado de autenticación en Railway:

1. Ve a: https://railway.app
2. Selecciona el proyecto **cactariocasamolle-production**
3. Click en **Variables**
4. Busca o crea `BYPASS_AUTH`
5. Configura el valor:
   - `true` = SIN autenticación (actual, recomendado)
   - `false` = CON autenticación (requiere login)

---

**💡 Recomendación:** Mantén la autenticación desactivada para facilitar el desarrollo y pruebas desde cualquier dispositivo (computador, celular, etc.).

