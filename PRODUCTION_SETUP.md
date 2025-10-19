# 🚀 Configuración Completa para Producción

## 🔍 Problema Actual

Tu frontend en producción (`https://cactario-casa-molle.vercel.app`) está intentando conectarse a `localhost:8000`, que no existe desde el navegador del usuario.

## ✅ Solución Paso a Paso

### 1. **Desplegar Backend FastAPI**

#### Opción A: Vercel (Más Simple)

1. **Ir a [vercel.com](https://vercel.com)**
2. **New Project** → Importar tu repositorio `CactarioCasaMolle`
3. **Configurar**:
   - Framework: `Other`
   - Root Directory: `fastapi`
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: `api`

4. **Variables de Entorno** (Settings → Environment Variables):
   ```
   SUPABASE_URL=tu_supabase_url
   SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   DATABASE_URL=tu_database_url
   SECRET_KEY=tu_secret_key_muy_seguro
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

5. **Deploy** y anotar la URL: `https://tu-backend.vercel.app`

#### Opción B: Railway (Recomendado para FastAPI)

1. **Ir a [railway.app](https://railway.app)**
2. **New Project** → **Deploy from GitHub repo**
3. **Seleccionar repositorio** `CactarioCasaMolle`
4. **Root Directory**: `fastapi`
5. **Configurar variables de entorno** (mismas que arriba)
6. **Deploy automático**

### 2. **Actualizar Frontend**

En el dashboard de Vercel de tu frontend:

**Settings → Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://tu-backend.vercel.app
```

**Redeploy** el frontend para que tome la nueva variable.

### 3. **Configuración por Entornos**

#### Desarrollo Local
```bash
# Frontend
cd nextjs
npm run dev  # http://localhost:3000

# Backend  
cd fastapi
uvicorn app.main:app --reload  # http://localhost:8000
```

#### Producción
- **Frontend**: `https://cactario-casa-molle.vercel.app`
- **Backend**: `https://tu-backend.vercel.app`

### 4. **Verificación**

1. **Backend**: Visitar `https://tu-backend.vercel.app/`
2. **Frontend**: Visitar `https://cactario-casa-molle.vercel.app`
3. **Login**: Probar autenticación completa
4. **Console**: Verificar que no hay errores de CORS

## 🔧 Configuración de Cookies HTTP-Only

### Desarrollo
```javascript
// En AuthContext.jsx - ya configurado
const res = await fetch(`${API}/auth/me`, {
  method: "GET",
  credentials: "include",  // ← Para que viaje la cookie cm_session
});
```

### Producción
- Las cookies funcionan automáticamente entre dominios configurados
- CORS está configurado para permitir `credentials: true`
- Las cookies `cm_session` viajarán correctamente

## 🛠️ Archivos Modificados

### Backend (`fastapi/`)
- ✅ `app/main.py` - CORS dinámico por entorno
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `api/index.py` - Punto de entrada para Vercel

### Frontend (`nextjs/`)
- ✅ `src/app/context/AuthContext.jsx` - Ya configurado para usar `NEXT_PUBLIC_API_URL`

## 🚨 Solución de Problemas

### Error: CORS Policy
- Verificar que el backend esté desplegado
- Verificar que `NEXT_PUBLIC_API_URL` esté configurado en Vercel
- Verificar que el backend permita tu dominio en CORS

### Error: 401 Unauthorized
- Verificar que las cookies viajen correctamente
- Verificar configuración de `credentials: "include"`
- Verificar que el backend esté configurado para aceptar cookies

### Error: Failed to load resource
- Verificar que la URL del backend sea correcta
- Verificar que el backend esté funcionando
- Verificar conectividad de red

## 🎯 Resultado Final

```
┌─────────────────────────────────┐
│  Frontend (Vercel)              │
│  https://cactario-casa-         │
│  molle.vercel.app               │
└─────────────┬───────────────────┘
              │ HTTPS
              │ credentials: include
              │ CORS configurado
              ▼
┌─────────────────────────────────┐
│  Backend (Vercel/Railway)       │
│  https://tu-backend.vercel.app  │
│  Cookies HTTP-Only              │
│  Autenticación JWT              │
└─────────────────────────────────┘
```

¡Con esta configuración tendrás un sistema completo funcionando en producción! 🎉
