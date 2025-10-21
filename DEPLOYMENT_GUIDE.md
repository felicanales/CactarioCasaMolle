# 🚂 Guía Completa de Despliegue en Railway

## 🎯 Solución: Un Solo Servidor para Todo

Railway permite desplegar frontend y backend en el mismo servidor, simplificando la arquitectura y reduciendo costos.

### ✅ **Ventajas de Railway:**
- **Un solo servidor**: Frontend y backend juntos
- **Más económico**: $5/mes vs $20/mes de otros servicios
- **Configuración simple**: Un solo deploy, un solo dashboard
- **Sin problemas de CORS**: Mismo dominio para todo
- **Deploy automático**: Push a GitHub = deploy automático

### 🚀 **Desplegar en Railway**

#### **Paso 1: Crear Cuenta y Proyecto**
1. Ir a [railway.app](https://railway.app)
2. **Sign up** con GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Seleccionar repositorio**: `CactarioCasaMolle`
5. **Deploy automático** (Railway detectará Node.js y Python)

#### **Paso 2: Configurar Variables de Entorno**
En Railway Dashboard → **Variables**:

```
# Supabase Configuration
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Database
DATABASE_URL=tu_database_url

# Security
SECRET_KEY=tu_secret_key_muy_seguro
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (opcional)
CORS_ORIGINS=https://tu-dominio.railway.app
```

#### **Paso 3: Configurar Dominio**
1. **Settings** → **Domains**
2. **Generate Domain** (gratis)
3. **O agregar dominio personalizado**

### 🌐 **URL Resultante**

- **Aplicación completa**: `https://tu-proyecto.railway.app`
- **Frontend**: `https://tu-proyecto.railway.app` (puerto 3000)
- **Backend**: `https://tu-proyecto.railway.app` (puerto 8000)

## 🔧 Configuración por Entornos

### Desarrollo Local
```bash
# Instalar dependencias
npm run install:nextjs
npm run install:fastapi

# Desarrollo completo (frontend + backend)
npm run start:all

# Solo frontend
npm run dev

# Solo backend
npm run start:fastapi
```

### Producción
- **Railway**: Todo en un solo servidor
- **Deploy automático**: Push a GitHub = deploy automático

## 🛠️ Archivos de Configuración

### Configuración Railway
- ✅ `package.json` - Scripts para manejar frontend
- ✅ `fastapi/railway.json` - Configuración Railway backend
- ✅ `fastapi/Dockerfile` - Build con Docker

### Backend (`fastapi/`)
- ✅ `Dockerfile` - Imagen Docker personalizada
- ✅ `railway.json` - Configuración de despliegue
- ✅ `app/main.py` - CORS configurado para Railway

### Frontend (`nextjs/`)
- ✅ `src/app/context/AuthContext.jsx` - API dinámico para Railway
- ✅ Configurado para detectar dominio automáticamente

## 🚀 Pasos para Implementar

1. **El código ya está listo** ✅
2. **Crear cuenta en Railway**:
   - Ir a [railway.app](https://railway.app)
   - Sign up con GitHub
3. **Desplegar proyecto**:
   - New Project → Deploy from GitHub repo
   - Seleccionar `CactarioCasaMolle`
   - Deploy automático
4. **Configurar variables de entorno**:
   - Settings → Variables
   - Agregar todas las variables de Supabase
5. **¡Listo!** Tu aplicación funcionará automáticamente

## 🔍 Verificación

1. **Aplicación**: `https://tu-proyecto.railway.app`
2. **API**: `https://tu-proyecto.railway.app/auth/me`
3. **Login**: Probar autenticación completa
4. **Console**: Verificar que no hay errores de CORS

## 🏗️ Arquitectura Final

```
┌─────────────────────────────────────────────────┐
│              Railway Server                     │
│  https://cactario-casa-molle.railway.app       │
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │   Frontend      │    │   Backend       │    │
│  │   Next.js       │◄──►│   FastAPI       │    │
│  │   Puerto 3000   │    │   Puerto 8000   │    │
│  └─────────────────┘    └─────────────────┘    │
│                                                 │
│  Mismo dominio, comunicación interna rápida     │
└─────────────────────────────────────────────────┘
```

## 💰 Comparación de Costos

| Servicio | Frontend | Backend | Total/Mes |
|----------|----------|---------|-----------|
| **Vercel** | Gratis | $20 | **$20** |
| **Railway** | Incluido | Incluido | **$5** |
| **Ahorro** | - | - | **75%** |

## 📱 Dominio Personalizado (Opcional)

Una vez que todo funcione:
1. **Settings** → **Domains** en Railway
2. **Add Custom Domain**
3. **Configurar DNS** según las instrucciones

## 🎯 Resultado Final

- ✅ **Un solo servidor** para frontend y backend
- ✅ **Un solo dominio** para todo
- ✅ **75% menos costo** que otras opciones
- ✅ **Sin problemas de CORS**
- ✅ **Deploy automático** desde GitHub
- ✅ **Configuración simple** y mantenible

¡Con Railway tendrás un sistema completo funcionando en producción de manera simple y económica! 🚂✨
