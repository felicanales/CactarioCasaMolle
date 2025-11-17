# 🌵 Cactario Casa Molle

Sistema de gestión de cactáceas para Casa Molle con múltiples interfaces: panel de administración (staff) y aplicación móvil para visitantes.

## 📦 Componentes del Sistema

### 1. **Frontend Staff** (`nextjs/`)
Panel de administración para el personal del cactuario. Permite gestionar especies, sectores, inventario y reportes.

- **Tecnología**: Next.js 15.5.5
- **Puerto desarrollo**: 3000
- **Características**:
  - Gestión de especies
  - Gestión de sectores
  - Control de inventario
  - Reportes y estadísticas
  - Subida y gestión de fotos

### 2. **Frontend Mobile** (`mobile/`)
Aplicación web móvil para visitantes del cactuario. Permite explorar sectores, especies y escanear códigos QR.

- **Tecnología**: Next.js 15.5.5
- **Puerto desarrollo**: 3002
- **Características**:
  - Home con carrusel de fotos
  - Escáner de códigos QR
  - Navegación por sectores
  - Visualización de especies
  - Detalle de especies con fotos

### 3. **Backend API** (`fastapi/`)
API REST para gestionar datos del cactuario. Proporciona endpoints públicos y privados.

- **Tecnología**: FastAPI (Python)
- **Puerto desarrollo**: 8000
- **Características**:
  - API REST completa
  - Endpoints públicos para visitantes
  - Endpoints privados para staff
  - Gestión de fotos y almacenamiento
  - Integración con Supabase

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

# Environment
ENVIRONMENT=production
NODE_ENV=production
```

### 🚂 Deploy en Railway

1. **Conectar GitHub**:
   - Ir a [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Seleccionar este repositorio

2. **Configurar Servicios**:
   - Crear 3 servicios separados:
     - **Backend**: Carpeta `fastapi/`
     - **Frontend Staff**: Carpeta `nextjs/`
     - **Frontend Mobile**: Carpeta `mobile/`

3. **Configurar Variables**:
   - Settings → Variables en cada servicio
   - Agregar todas las variables de entorno necesarias

4. **Deploy Automático**:
   - Railway detectará automáticamente Node.js y Python
   - Deploy automático en cada push

### 👥 Administración de Usuarios

El sistema utiliza una **whitelist** basada en la tabla `usuarios` de Supabase. Para que un correo pueda iniciar sesión, debe estar registrado en esta tabla con `active=true`.

#### Agregar Nuevo Usuario

1. **Abrir Supabase SQL Editor**:
   - Ve a tu proyecto en Supabase
   - Navega a SQL Editor

2. **Ejecutar el script de agregar usuario**:
   - Abre el archivo `agregar_usuario.sql` en la raíz del proyecto
   - Reemplaza los valores marcados con ⚠️:
     - `'nuevo_correo@ejemplo.com'` → El correo del nuevo usuario
     - `'nombre_usuario'` → Un nombre de usuario único
     - `'Nombre Completo'` → Nombre completo (opcional)
   - Ejecuta el script

3. **Verificar**:
   - El script incluye una consulta de verificación al final
   - Asegúrate de que `active = true` en el resultado

#### ⚠️ Importante

- El correo debe estar en **minúsculas** y coincidir exactamente con el que agregaste en Supabase Auth
- El campo `supabase_uid` se sincronizará automáticamente cuando el usuario inicie sesión por primera vez
- Si el correo ya existe pero está inactivo, el script lo activará automáticamente
- El `username` debe ser único en la tabla

#### Problema Común: "Correo no autorizado"

Si recibes el error *"Este correo no está autorizado para acceder al sistema"*, significa que:
- El correo no está en la tabla `usuarios`, o
- El correo existe pero tiene `active=false`

**Solución**: Ejecuta el script `agregar_usuario.sql` con el correo correcto.

### 🛠️ Desarrollo Local

```bash
# Instalar dependencias de todos los servicios
cd nextjs && npm install
cd ../mobile && npm install
cd ../fastapi && pip install -r requirements.txt

# Desarrollo Frontend Staff
cd nextjs
npm run dev
# Disponible en http://localhost:3000

# Desarrollo Frontend Mobile
cd mobile
npm run dev
# Disponible en http://localhost:3002

# Desarrollo Backend
cd fastapi
uvicorn app.main:app --reload
# Disponible en http://localhost:8000
```

### 📁 Estructura del Proyecto

```
/
├── nextjs/              # Frontend Staff (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── staff/   # Panel de staff
│   │   │   ├── species/ # Gestión de especies
│   │   │   ├── sectors/ # Gestión de sectores
│   │   │   ├── inventory/ # Inventario
│   │   │   └── reports/ # Reportes
│   │   ├── components/  # Componentes React
│   │   └── utils/      # Utilidades
│   ├── railway.json     # Configuración Railway frontend staff
│   └── package.json
├── mobile/              # Frontend Mobile (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js  # Home
│   │   │   ├── qr/      # Escáner QR
│   │   │   ├── sectores/ # Navegación sectores
│   │   │   └── especies/ # Detalle especies
│   │   ├── components/  # Componentes React
│   │   └── utils/       # Utilidades
│   └── package.json
├── fastapi/             # Backend FastAPI
│   ├── app/
│   │   ├── api/         # Rutas de la API
│   │   ├── core/        # Configuración core
│   │   ├── models/      # Modelos de datos
│   │   └── services/    # Lógica de negocio
│   ├── Dockerfile       # Configuración Docker
│   ├── railway.json     # Configuración Railway backend
│   └── requirements.txt
└── package.json         # Scripts principales
```

### 🌐 URLs

#### Desarrollo
- **Frontend Staff**: `http://localhost:3000`
- **Frontend Mobile**: `http://localhost:3002`
- **Backend API**: `http://localhost:8000`

#### Producción
- **Frontend Staff**: `https://tu-frontend-staff.railway.app`
- **Frontend Mobile**: `https://tu-frontend-mobile.railway.app`
- **Backend API**: `https://tu-backend.railway.app`

### 📱 Características

#### Frontend Staff
- ✅ Panel de administración completo
- ✅ Gestión de especies y sectores
- ✅ Control de inventario
- ✅ Reportes y estadísticas
- ✅ Subida y gestión de fotos

#### Frontend Mobile
- ✅ Interfaz móvil optimizada
- ✅ Escáner de códigos QR
- ✅ Navegación por sectores
- ✅ Visualización de especies
- ✅ Carrusel de fotos

#### Backend
- ✅ API REST completa
- ✅ Endpoints públicos y privados
- ✅ Gestión de fotos
- ✅ Integración con Supabase
- ✅ CORS configurado

## 🎯 Scripts Disponibles

### Frontend Staff
```bash
cd nextjs
npm run dev          # Desarrollo
npm run build        # Build producción
npm start            # Producción
```

### Frontend Mobile
```bash
cd mobile
npm run dev          # Desarrollo
npm run build        # Build producción
npm start            # Producción
```

### Backend
```bash
cd fastapi
uvicorn app.main:app --reload  # Desarrollo
```

## 📚 Documentación Adicional

- `mobile/README.md` - Documentación detallada del frontend mobile
- `DEPLOYMENT_GUIDE.md` - Guía de despliegue
- `INSTRUCCIONES_DEPLOY_RAILWAY.md` - Instrucciones específicas para Railway

## 📞 Soporte

Para problemas o preguntas, revisar los logs en Railway Dashboard o consultar la documentación de cada componente.
