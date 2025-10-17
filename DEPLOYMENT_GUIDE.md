# 🚀 Guía Completa de Despliegue - Frontend + Backend

## 📋 Problema Identificado

Tu frontend desplegado en Vercel está intentando conectarse a `localhost:8000`, lo cual no funciona desde producción.

## ✅ Solución: Desplegar Backend en Vercel

### 1. **Configuración CORS Actualizada** ✅

El backend ya está configurado para aceptar tu dominio de Vercel:
- `https://cactario-casa-molle.vercel.app`
- `https://*.vercel.app` (cualquier subdominio)

### 2. **Desplegar Backend en Vercel**

#### Opción A: Repositorio Separado (Recomendado)

1. **Crear nuevo repositorio** para el backend:
   ```bash
   # En una nueva carpeta
   git init fastapi-backend
   cd fastapi-backend
   
   # Copiar archivos del backend
   cp -r ../CactarioCasaMolle/fastapi/* .
   
   # Subir a GitHub
   git add .
   git commit -m "FastAPI backend for Cactario Casa Molle"
   git push origin main
   ```

2. **Desplegar en Vercel**:
   - Ir a [vercel.com](https://vercel.com)
   - New Project → Importar repositorio del backend
   - Framework: Python
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: `api`

#### Opción B: Monorepo (Actual)

1. **Desplegar backend desde el mismo repositorio**:
   - En Vercel Dashboard
   - New Project → Importar `CactarioCasaMolle`
   - Root Directory: `fastapi`
   - Framework: Python

### 3. **Configurar Variables de Entorno**

#### En Vercel Dashboard (Backend):
```
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
DATABASE_URL=tu_database_url
SECRET_KEY=tu_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### En Vercel Dashboard (Frontend):
```
NEXT_PUBLIC_API_URL=https://tu-backend.vercel.app
```

### 4. **URLs Resultantes**

- **Frontend**: `https://cactario-casa-molle.vercel.app`
- **Backend**: `https://tu-backend.vercel.app`

## 🔧 Configuración por Entornos

### Desarrollo Local
```bash
# Frontend
cd nextjs
npm run dev  # http://localhost:3000

# Backend
cd fastapi
uvicorn app.main:app --reload  # http://localhost:8000
```

### Producción
- Frontend: Vercel
- Backend: Vercel (o Railway, Render, etc.)

## 🛠️ Archivos Creados/Modificados

### Backend (`fastapi/`)
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `api/index.py` - Punto de entrada para Vercel
- ✅ `app/main.py` - CORS actualizado

### Frontend (`nextjs/`)
- ✅ Ya configurado para usar `NEXT_PUBLIC_API_URL`

## 🚀 Pasos para Implementar

1. **Subir cambios**:
   ```bash
   git add .
   git commit -m "Add Vercel configuration for backend"
   git push
   ```

2. **Desplegar backend**:
   - Crear nuevo proyecto en Vercel
   - Seleccionar repositorio
   - Root Directory: `fastapi`
   - Configurar variables de entorno

3. **Actualizar frontend**:
   - En Vercel Dashboard del frontend
   - Settings → Environment Variables
   - `NEXT_PUBLIC_API_URL` = URL del backend desplegado

4. **Redeploy frontend**:
   - Trigger nuevo deploy para que tome las variables

## 🔍 Verificación

1. **Backend**: `https://tu-backend.vercel.app/`
2. **Frontend**: `https://cactario-casa-molle.vercel.app`
3. **Login**: Probar autenticación completa

## 🆘 Alternativas si Vercel no funciona para FastAPI

### Railway (Recomendado para FastAPI)
1. Ir a [railway.app](https://railway.app)
2. Conectar GitHub
3. Seleccionar carpeta `fastapi`
4. Deploy automático

### Render
1. Ir a [render.com](https://render.com)
2. New Web Service
3. Conectar repositorio
4. Root Directory: `fastapi`

## 📱 Dominio Personalizado (Opcional)

Una vez que todo funcione:
1. **Backend**: `api.tudominio.com`
2. **Frontend**: `app.tudominio.com` o `tudominio.com`

¡Con esta configuración tendrás un sistema completo funcionando en producción! 🎉
