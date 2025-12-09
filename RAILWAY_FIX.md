# 🔧 Solución: Error "cd nextjs: No such file or directory" en Railway

## 🐛 Problema

El error `/bin/bash: line 1: cd: nextjs: No such file or directory` ocurre cuando Railway intenta ejecutar comandos con `cd nextjs` desde un contexto incorrecto.

## ✅ Solución

### Paso 1: Configurar el Servicio Correctamente

1. Ve a tu servicio de **Next.js (Staff Frontend)** en Railway Dashboard
2. Ve a **Settings** → **Root Directory**
3. Asegúrate de que esté configurado como: **`nextjs/`** (sin comillas, con la barra al final)

   ⚠️ **Importante**: El Root Directory debe ser `nextjs/` para que Railway:
   - Use `nextjs/nixpacks.toml` para el build
   - Use `nextjs/railway.json` para comandos de despliegue
   - No intente hacer `cd nextjs` (ya está en ese directorio)

### Paso 2: Verificar la Configuración

Railway debería detectar automáticamente:
- ✅ `nextjs/package.json` - Para Node.js y dependencias
- ✅ `nextjs/nixpacks.toml` - Para comandos de build (SIN `cd nextjs`)
- ✅ `nextjs/railway.json` - Para comandos de start (SIN `cd nextjs`)

### Paso 3: Variables de Entorno

Asegúrate de tener estas variables configuradas en Railway:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
PORT=3000 (opcional, Railway lo asigna automáticamente)
```

### Paso 4: Redesplegar

1. Haz clic en **Deploy** → **Redeploy**
2. O haz un nuevo push a GitHub para trigger automático

## 📁 Archivos de Configuración

He corregido los siguientes archivos:

- ✅ `nextjs/nixpacks.toml` - Build commands (sin `cd nextjs`)
- ✅ `nextjs/railway.json` - Deploy commands (sin `cd nextjs`)
- ✅ `nixpacks.toml` (raíz) - Deshabilitado para evitar conflictos

## 🔍 Verificación

Después de redesplegar, deberías ver en los logs:

```
✅ Build completed
✅ Standalone directory exists
✅ Asset copying complete
🚀 Starting Next.js standalone server...
```

## 📝 Nota sobre Servicios Separados

Según el README, deberías tener **3 servicios separados**:

1. **Backend FastAPI**: Root Directory = `fastapi/`
2. **Frontend Staff (Next.js)**: Root Directory = `nextjs/` ← **Este es el que estás corrigiendo**
3. **Frontend Mobile**: Root Directory = `mobile/`

Cada servicio debe tener su Root Directory configurado correctamente.

## 🆘 Si el Problema Persiste

1. **Elimina el servicio** y créalo de nuevo:
   - New Service → Deploy from GitHub repo
   - Selecciona tu repositorio
   - Configura Root Directory = `nextjs/` inmediatamente

2. **Verifica que Railway use el archivo correcto**:
   - En los logs del build, debería decir "Using nixpacks.toml from nextjs/"
   - No debería mencionar comandos con `cd nextjs`

3. **Contacta soporte** si el problema continúa después de estos pasos.


