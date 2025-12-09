# 🔧 Solución: Error "cd nextjs: No such file or directory" en Railway - Mobile

## 🐛 Problema

El servicio Mobile estaba intentando ejecutar `cd nextjs && node start-server.js`, lo cual es incorrecto porque:
- El servicio Mobile tiene Root Directory = `mobile/`
- No existe el directorio `nextjs/` dentro de `mobile/`
- El comando correcto es `next start`

## ✅ Solución Implementada

He creado los archivos de configuración correctos para el servicio Mobile:

### 1. `mobile/railway.json`
```json
{
    "deploy": {
        "startCommand": "next start -H 0.0.0.0 -p ${PORT:-3002}"
    }
}
```

### 2. `mobile/nixpacks.toml`
```toml
[start]
cmd = "next start -H 0.0.0.0 -p ${PORT:-3002}"
```

### 3. `railway.json` de la raíz
- Eliminado el comando problemático que afectaba otros servicios

## 🚀 Próximos Pasos

1. **Haz commit y push de los cambios**:
   ```bash
   git add mobile/railway.json mobile/nixpacks.toml railway.json
   git commit -m "Fix Railway configuration for mobile service"
   git push
   ```

2. **En Railway Dashboard**:
   - Ve a tu servicio **Mobile**
   - Haz clic en **Deploy** → **Redeploy**
   - O espera a que el auto-deploy se active con el push

3. **Verifica los logs**:
   - Deberías ver: `next start -H 0.0.0.0 -p ${PORT:-3002}`
   - NO debería aparecer: `cd nextjs`

## 📝 Variables de Entorno Requeridas

Asegúrate de tener configuradas en Railway:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
PORT=3002 (opcional, Railway lo asignará automáticamente)
```

## ✅ Verificación

Después del redeploy, los logs deberían mostrar:

```
✓ Build completed
✓ Starting server on 0.0.0.0:${PORT}
✓ Ready on http://0.0.0.0:${PORT}
```

## 🔍 Si el Problema Persiste

1. **Verifica Root Directory**:
   - Settings → Root Directory debe ser: `mobile/`

2. **Verifica que Railway esté usando el archivo correcto**:
   - En los logs de build, debería mencionar `mobile/nixpacks.toml` o `mobile/railway.json`

3. **Limpia y redesplega**:
   - Settings → Delete Service
   - Crea un nuevo servicio con Root Directory = `mobile/`
   - Railway detectará automáticamente los archivos de configuración


