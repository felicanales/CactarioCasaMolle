# 🚀 Despliegue del Backend FastAPI en Vercel

## 📋 Pasos para Desplegar el Backend

### 1. **Crear Nuevo Proyecto en Vercel**

1. Ir a [vercel.com](https://vercel.com)
2. **New Project**
3. **Import Git Repository** → Seleccionar tu repositorio `CactarioCasaMolle`
4. **Configure Project**:
   - **Framework Preset**: `Other`
   - **Root Directory**: `fastapi`
   - **Build Command**: `pip install -r requirements.txt`
   - **Output Directory**: `api`
   - **Install Command**: `pip install -r requirements.txt`

### 2. **Configurar Variables de Entorno en Vercel**

En el dashboard de Vercel (proyecto backend):

**Settings → Environment Variables**:

```
SUPABASE_URL=tu_supabase_url_aqui
SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui
DATABASE_URL=tu_database_url_aqui
SECRET_KEY=tu_secret_key_muy_seguro_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. **Desplegar**

- Click **Deploy**
- Esperar a que termine el build
- Anotar la URL generada: `https://tu-backend.vercel.app`

### 4. **Actualizar Frontend**

En el dashboard de Vercel (proyecto frontend):

**Settings → Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://tu-backend.vercel.app
```

### 5. **Redeploy Frontend**

- Trigger un nuevo deploy para que tome la variable de entorno

## 🔧 Configuración Alternativa: Railway (Recomendado para FastAPI)

Si Vercel no funciona bien con FastAPI, usar Railway:

1. Ir a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Seleccionar tu repositorio
4. **Root Directory**: `fastapi`
5. Configurar variables de entorno
6. Deploy automático

## 🎯 URLs Resultantes

- **Frontend**: `https://cactario-casa-molle.vercel.app`
- **Backend**: `https://tu-backend.vercel.app` o `https://tu-backend.railway.app`
