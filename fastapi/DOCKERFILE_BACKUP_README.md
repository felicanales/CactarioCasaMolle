# 📦 Dockerfile Backup

El archivo `Dockerfile` ha sido renombrado a `Dockerfile.backup` para evitar que Railway lo use automáticamente.

## ¿Por qué?

Railway estaba intentando usar el Dockerfile automáticamente, lo que causaba errores de ruta. Al renombrarlo, Railway ahora usará Nixpacks (configurado en `railway.json` y `nixpacks.toml`).

## ¿Cómo restaurar Dockerfile?

Si en el futuro quieres volver a usar Dockerfile:

1. Renombra: `Dockerfile.backup` → `Dockerfile`
2. Actualiza `railway.json`:
   ```json
   {
       "build": {
           "builder": "DOCKERFILE"
       }
   }
   ```
3. Asegúrate de que Railway tenga Root Directory = `fastapi/`

## Estado Actual

✅ Usando Nixpacks (más simple y robusto)
- Configuración: `fastapi/nixpacks.toml`
- Builder: NIXPACKS en `railway.json`


