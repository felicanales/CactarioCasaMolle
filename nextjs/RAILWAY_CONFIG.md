# 🚂 Configuración de Railway para Next.js (Staff Frontend)

## Configuración Correcta del Servicio

### Opción 1: Servicio Separado (Recomendado)

1. En Railway Dashboard, configura el servicio:
   - **Root Directory**: `nextjs/`
   - Railway detectará automáticamente:
     - `nextjs/nixpacks.toml` para el build
     - `nextjs/railway.json` para comandos de despliegue
     - `nextjs/package.json` para dependencias

2. **No necesita comandos personalizados** - Railway usará la configuración automáticamente.

### Opción 2: Desde la Raíz (Monorepo)

Si configuras el servicio desde la raíz del proyecto:
- Railway usará `railway.json` de la raíz
- Los comandos incluyen `cd nextjs` automáticamente

## Archivos de Configuración

- ✅ `nextjs/nixpacks.toml` - Build commands (sin `cd nextjs`)
- ✅ `nextjs/railway.json` - Deploy commands (sin `cd nextjs`)
- ✅ `nextjs/start-server.js` - Server starter
- ✅ `nextjs/package.json` - Dependencies

## Variables de Entorno Requeridas

```
NODE_ENV=production
PORT=3000 (automático en Railway)
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

## Solución de Problemas

Si ves el error: `/bin/bash: line 1: cd: nextjs: No such file or directory`

**Causa**: Railway está intentando hacer `cd nextjs` cuando ya está en ese directorio.

**Solución**:
1. Verifica que el servicio tenga **Root Directory** = `nextjs/`
2. O elimina/renombra `nixpacks.toml` de la raíz si existe
3. Asegúrate de que Railway use `nextjs/nixpacks.toml` y `nextjs/railway.json`

