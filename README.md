# 🌵 Cactario Casa Molle

Sistema de gestión de cactáceas para Casa Molle - Frontend Next.js + Backend FastAPI

## 🚀 Despliegue en Railway

Este proyecto está configurado para desplegarse automáticamente en Railway.

### 📋 Prerrequisitos

- Cuenta en [Railway](https://railway.app)
- Variables de entorno configuradas

### 🔧 Configuración

#### Variables de Entorno Requeridas

```bash
# Supabase
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Database
DATABASE_URL=tu_database_url

# Security
SECRET_KEY=tu_secret_key_muy_seguro
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 🚂 Deploy en Railway

1. **Conectar GitHub**:
   - Ir a [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Seleccionar este repositorio

2. **Configurar Variables**:
   - Settings → Variables
   - Agregar todas las variables de entorno

3. **Deploy Automático**:
   - Railway detectará automáticamente Node.js y Python
   - Deploy automático en cada push

### 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm run install:nextjs
npm run install:fastapi

# Desarrollo (solo frontend)
npm run dev

# Desarrollo completo (frontend + backend)
npm run start:all

# Build para producción
npm run build
```

### 📁 Estructura del Proyecto

```
/
├── nextjs/              # Frontend Next.js
│   ├── src/
│   │   └── app/
│   │       ├── login/   # Página de login
│   │       ├── staff/   # Panel de staff
│   │       └── context/ # Contexto de autenticación
│   └── package.json
├── fastapi/             # Backend FastAPI
│   ├── app/
│   │   ├── api/         # Rutas de la API
│   │   ├── core/        # Configuración core
│   │   └── models/      # Modelos de datos
│   └── requirements.txt
├── railway.json         # Configuración de Railway
├── nixpacks.toml        # Configuración de build
└── package.json         # Scripts principales
```

### 🔐 Autenticación

- **Frontend**: Next.js con contexto de autenticación
- **Backend**: FastAPI con JWT y cookies HTTP-Only
- **Base de datos**: Supabase
- **CORS**: Configurado para Railway

### 🌐 URLs

- **Desarrollo**: `http://localhost:3000` (frontend) + `http://localhost:8000` (backend)
- **Producción**: `https://tu-proyecto.railway.app` (ambos servicios)

### 📱 Características

- ✅ Login con código de verificación por email
- ✅ Formulario de código con inputs separados
- ✅ Panel de staff
- ✅ Gestión de especies y sectores
- ✅ Autenticación segura con cookies HTTP-Only
- ✅ CORS configurado correctamente
- ✅ Deploy automático en Railway

## 🎯 Scripts Disponibles

```bash
npm run dev              # Desarrollo frontend
npm run start:all        # Frontend + Backend
npm run build           # Build ambos servicios
npm run start:nextjs    # Solo frontend
npm run start:fastapi   # Solo backend
```

## 📞 Soporte

Para problemas o preguntas, revisar los logs en Railway Dashboard.