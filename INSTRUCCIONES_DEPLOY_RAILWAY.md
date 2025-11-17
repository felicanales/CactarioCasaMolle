# 🚀 Instrucciones para Deploy en Railway

Este documento contiene las instrucciones paso a paso para desplegar el frontend y backend en Railway después de las correcciones implementadas.

## ✅ Correcciones Implementadas

1. ✅ Agregado `output: 'standalone'` en `next.config.mjs`
2. ✅ Creado archivo utilitario centralizado `src/utils/api-config.js`
3. ✅ Removidas todas las URLs hardcodeadas del frontend
4. ✅ Mejorada configuración de CORS en backend
5. ✅ Convertido `copy-assets.sh` a `copy-assets.js` (Node.js)
6. ✅ Reducido healthcheck timeout a 60 segundos
7. ✅ Actualizado `railway.json` del frontend para usar script Node.js

---

## 📋 Prerequisitos

1. Cuenta en [Railway](https://railway.app)
2. Repositorio en GitHub conectado a Railway
3. Variables de entorno configuradas (ver sección siguiente)

---

## 🔧 Configuración de Variables de Entorno

### Backend Service (FastAPI)

En Railway Dashboard → Backend Service → Variables:

```
# Supabase Configuration
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Security
SECRET_KEY=tu_secret_key_muy_seguro
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production

# CORS Configuration
FRONTEND_DOMAIN=cactario-frontend-production.up.railway.app
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app

# Railway automáticamente proporciona:
# - PORT
# - RAILWAY_PUBLIC_DOMAIN
# - RAILWAY_ENVIRONMENT_NAME
# - RAILWAY_REGION
```

### Frontend Service (Next.js)

En Railway Dashboard → Frontend Service → Variables:

```
# API Configuration (CRÍTICO)
NEXT_PUBLIC_API_URL=https://cactariocasamolle-production.up.railway.app

# Auth Configuration
NEXT_PUBLIC_BYPASS_AUTH=false

# Environment
NODE_ENV=production

# Railway automáticamente proporciona:
# - PORT
```

**⚠️ IMPORTANTE:** 
- Reemplaza `cactariocasamolle-production.up.railway.app` con el dominio real de tu backend en Railway
- Reemplaza `cactario-frontend-production.up.railway.app` con el dominio real de tu frontend en Railway

---

## 🚀 Pasos para Deploy

### Opción 1: Deploy Automático desde GitHub (Recomendado)

1. **Conectar Repositorio:**
   - En Railway Dashboard → New Project
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio `CactarioCasaMolle`

2. **Crear Servicios:**
   - Railway detectará automáticamente los servicios
   - O crea dos servicios manualmente:
     - **Backend Service:** Apunta a `fastapi/`
     - **Frontend Service:** Apunta a `nextjs/`

3. **Configurar Root Directory:**
   - **Backend Service:** Root Directory = `fastapi`
   - **Frontend Service:** Root Directory = `nextjs`

4. **Configurar Variables de Entorno:**
   - Agrega todas las variables listadas arriba en cada servicio

5. **Deploy:**
   - Railway hará deploy automáticamente al hacer push a la rama principal
   - O haz click en "Deploy" manualmente

### Opción 2: Deploy Manual con Railway CLI

1. **Instalar Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Inicializar Proyecto:**
   ```bash
   railway init
   ```

4. **Deploy Backend:**
   ```bash
   cd fastapi
   railway up
   ```

5. **Deploy Frontend:**
   ```bash
   cd ../nextjs
   railway up
   ```

---

## 🔍 Verificación Post-Deploy

### Backend

1. **Health Check:**
   ```bash
   curl https://tu-backend.railway.app/health
   ```
   Debe retornar: `{"status": "ok", ...}`

2. **API Docs:**
   - Visita: `https://tu-backend.railway.app/docs`
   - Debe mostrar la documentación de FastAPI

3. **Logs:**
   - En Railway Dashboard → Backend Service → Logs
   - Verifica que no hay errores
   - Debe mostrar: "✅ Servidor FastAPI inicializado correctamente"

### Frontend

1. **Página Principal:**
   - Visita: `https://tu-frontend.railway.app`
   - Debe cargar sin errores

2. **Console del Navegador:**
   - Abre DevTools (F12)
   - Verifica que no hay errores de CORS
   - Verifica que las llamadas al API funcionan

3. **Logs:**
   - En Railway Dashboard → Frontend Service → Logs
   - Verifica que el build se completó exitosamente
   - Debe mostrar: "✅ Asset copying complete"

### Integración

1. **Login:**
   - Intenta hacer login en el frontend
   - Verifica que se comunica con el backend

2. **API Calls:**
   - Abre DevTools → Network
   - Verifica que las peticiones van al backend correcto
   - Verifica que no hay errores 404 o CORS

---

## 🐛 Troubleshooting

### Backend no inicia

**Problema:** El backend no inicia o falla el healthcheck

**Solución:**
1. Verifica que todas las variables de entorno están configuradas
2. Revisa los logs en Railway Dashboard
3. Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son correctos
4. Verifica que el puerto se configura dinámicamente (debe usar `PORT` de Railway)

### Frontend no encuentra el servidor

**Problema:** Error "Could not find server.js in any expected location"

**Solución:**
1. Verifica que `output: 'standalone'` está en `next.config.mjs`
2. Verifica que el build se completó exitosamente
3. Revisa los logs del build en Railway
4. Verifica que `copy-assets.js` se ejecutó correctamente

### Errores de CORS

**Problema:** Errores de CORS en la consola del navegador

**Solución:**
1. Verifica que `FRONTEND_DOMAIN` está configurado en el backend
2. Verifica que `NEXT_PUBLIC_API_URL` apunta al backend correcto
3. Revisa los logs del backend para ver qué orígenes están permitidos
4. Agrega el dominio del frontend a `CORS_ORIGINS` si es necesario

### Build del Frontend Falla

**Problema:** El build de Next.js falla

**Solución:**
1. Verifica que todas las dependencias están en `package.json`
2. Revisa los logs del build para ver el error específico
3. Verifica que `copy-assets.js` tiene permisos de ejecución (no necesario en Railway, pero verifica)
4. Verifica que el build local funciona: `cd nextjs && npm run build`

---

## 📝 Checklist Final

Antes de considerar el deploy completo:

- [ ] Backend responde en `/health`
- [ ] Backend muestra documentación en `/docs`
- [ ] Frontend carga sin errores
- [ ] No hay errores de CORS en la consola
- [ ] Login funciona correctamente
- [ ] Las peticiones al API funcionan
- [ ] Variables de entorno configuradas correctamente
- [ ] Logs no muestran errores críticos

---

## 🔄 Actualizar Deploy Existente

Si ya tienes un deploy en Railway y quieres actualizar:

1. **Hacer push a GitHub:**
   ```bash
   git add .
   git commit -m "Fix: Correcciones para deploy en Railway"
   git push origin main
   ```

2. **Railway detectará automáticamente los cambios y hará redeploy**

3. **O forzar redeploy manualmente:**
   - En Railway Dashboard → Service → Deployments
   - Click en "Redeploy"

---

## 📚 Referencias

- [Railway Documentation](https://docs.railway.app)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## ✨ Notas Finales

- Los deploys en Railway son automáticos cuando haces push a GitHub
- Las variables de entorno se pueden actualizar sin redeploy completo
- Railway proporciona dominios gratuitos, pero puedes usar dominios personalizados
- Los logs están disponibles en tiempo real en Railway Dashboard

¡Buena suerte con el deploy! 🚀

