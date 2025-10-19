# 🚂 Railway - Frontend + Backend en el Mismo Servidor

## 🎯 ¿Por qué Railway?

### ✅ **Ventajas:**
- **Un solo servidor**: Frontend y backend en el mismo proyecto
- **Más económico**: Un solo plan en lugar de dos servicios separados
- **Configuración simple**: Un solo archivo de configuración
- **Deploy automático**: Push a GitHub = deploy automático
- **Dominio personalizado**: Un solo dominio para todo
- **Perfecto para FastAPI**: Optimizado para aplicaciones Python

### 📊 **Comparación de Costos:**
- **Vercel (actual)**: Frontend gratis + Backend $20/mes = $20/mes
- **Railway**: Todo en uno $5/mes = $5/mes
- **Ahorro**: 75% menos costo

## 🚀 Configuración Paso a Paso

### 1. **Estructura del Proyecto**

Tu proyecto ya está perfecto para Railway:
```
/
├── nextjs/           # Frontend Next.js
├── fastapi/          # Backend FastAPI
├── package.json      # Scripts para ambos servicios
├── railway.json      # Configuración de Railway
└── nixpacks.toml     # Configuración de build
```

### 2. **Configuración Creada**

Ya he creado todos los archivos necesarios:
- ✅ `railway.json` - Configuración principal
- ✅ `nixpacks.toml` - Configuración de build
- ✅ `package.json` - Scripts para ambos servicios
- ✅ CORS configurado para Railway
- ✅ API dinámico para mismo dominio

### 3. **Desplegar en Railway**

#### **Paso 1: Crear Cuenta**
1. Ir a [railway.app](https://railway.app)
2. **Sign up** con GitHub
3. **New Project** → **Deploy from GitHub repo**

#### **Paso 2: Configurar Proyecto**
1. **Seleccionar repositorio**: `CactarioCasaMolle`
2. **Railway detectará automáticamente**:
   - Node.js para Next.js
   - Python para FastAPI
3. **Deploy automático**

#### **Paso 3: Configurar Variables de Entorno**
En Railway Dashboard → **Variables**:

```
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

# CORS (opcional)
CORS_ORIGINS=https://tu-dominio.railway.app
```

#### **Paso 4: Configurar Dominio**
1. **Settings** → **Domains**
2. **Generate Domain** (gratis)
3. **O agregar dominio personalizado**

### 4. **Arquitectura Final**

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
│  Mismo dominio, diferentes puertos internos    │
└─────────────────────────────────────────────────┘
```

### 5. **Ventajas de Esta Configuración**

#### **✅ Simplicidad:**
- Un solo deploy
- Un solo dominio
- Un solo dashboard
- Un solo plan de pago

#### **✅ Rendimiento:**
- Frontend y backend en la misma red
- Latencia mínima entre servicios
- Cookies funcionan perfectamente

#### **✅ Desarrollo:**
- Un solo comando: `npm run start:all`
- Mismo entorno para desarrollo y producción
- Debugging más fácil

### 6. **Scripts Disponibles**

```bash
# Desarrollo local
npm run dev              # Solo frontend
npm run start:all        # Frontend + Backend

# Producción
npm run build           # Build ambos servicios
npm run start:all       # Ejecutar ambos servicios

# Individuales
npm run start:nextjs    # Solo frontend
npm run start:fastapi   # Solo backend
```

### 7. **Migración desde Vercel**

#### **Paso 1: Desplegar en Railway**
- Seguir pasos arriba
- Configurar variables de entorno
- Probar que funciona

#### **Paso 2: Actualizar DNS (si usas dominio personalizado)**
- Cambiar DNS de Vercel a Railway
- O usar el dominio de Railway directamente

#### **Paso 3: Verificar Funcionamiento**
- Probar login
- Probar todas las funcionalidades
- Verificar que no hay errores de CORS

### 8. **Costo Final**

- **Railway**: $5/mes (todo incluido)
- **Vercel**: $20/mes (solo backend)
- **Ahorro**: $15/mes (75% menos)

## 🎯 Resultado Final

- ✅ **Un solo servidor** para todo
- ✅ **Un solo dominio** para frontend y backend
- ✅ **75% menos costo** que Vercel
- ✅ **Configuración más simple**
- ✅ **Deploy automático** desde GitHub
- ✅ **Perfecto para FastAPI + Next.js**

¡Con Railway tendrás todo funcionando en un solo lugar! 🚂✨
