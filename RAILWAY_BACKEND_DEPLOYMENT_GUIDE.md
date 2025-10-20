# 🚂 Railway Backend Deployment Guide - Paso a Paso

## 🔍 **Problema Identificado:**

```
❌ https://cactario-backend-production.up.railway.app
   responde con "Application not found" desde Railway Edge
```

### **Causa del Error:**
- **Backend no está desplegado** como servicio independiente en Railway
- **Solo el frontend** está desplegado como servicio
- **Dominio del backend** no tiene ningún servicio asociado

---

## 🛠️ **Solución: Desplegar Backend como Servicio Separado**

### **Paso 1: Crear Nuevo Servicio Backend en Railway**

1. **Ve a Railway Dashboard:**
   - Abre [railway.app](https://railway.app)
   - Inicia sesión en tu cuenta

2. **Selecciona tu proyecto:**
   - Busca el proyecto "CactarioCasaMolle"
   - Haz clic en él

3. **Crear nuevo servicio:**
   - Haz clic en **"New Service"**
   - Selecciona **"GitHub Repo"**
   - Selecciona tu repositorio `felicanales/CactarioCasaMolle`

### **Paso 2: Configurar el Servicio Backend**

1. **Configuración básica:**
   - **Nombre del servicio:** `cactario-backend`
   - **Working Directory:** `fastapi`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Variables de entorno:**
   ```bash
   SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTc1MDgsImV4cCI6MjA3NTU5MzUwOH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8E
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxNzUwOCwiZXhwIjoyMDc1NTkzNTA4fQ.2kP9Gn5U8yDSf74Mg3fGAQtRVGe_nx2sy6ymBbrMD8E
   ENV=production
   CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
   ```

### **Paso 3: Configurar Dominio Público**

1. **Generar dominio:**
   - Ve a la pestaña **"Settings"** del servicio backend
   - En la sección **"Domains"**
   - Haz clic en **"Generate Domain"**
   - El dominio será: `https://cactario-backend-production.up.railway.app`

2. **Verificar dominio:**
   - Copia el dominio generado
   - Guárdalo para configurar el frontend

### **Paso 4: Actualizar Frontend**

1. **Configurar variable de entorno del frontend:**
   ```bash
   NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
   ```

2. **Redeploy del frontend:**
   - Ve al servicio del frontend
   - Haz clic en **"Redeploy"**

---

## 🔧 **Archivos de Configuración Disponibles**

### **✅ Backend ya configurado:**
- **`fastapi/railway.json`** - Configuración de Railway
- **`fastapi/nixpacks.toml`** - Configuración de Nixpacks (corregida)
- **`fastapi/Procfile`** - Comando de inicio
- **`fastapi/runtime.txt`** - Versión de Python
- **`fastapi/.railwayignore`** - Archivos a ignorar
- **`fastapi/start-backend.sh`** - Script de inicio optimizado

### **✅ Frontend configurado:**
- **`nextjs/src/app/context/AuthContext.jsx`** - URL del backend
- **CORS configurado** en el backend

---

## 🚀 **Verificación del Despliegue**

### **1. Verificar que el Backend Esté Funcionando:**

```bash
curl https://cactario-backend-production.up.railway.app/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "message": "Service is healthy",
  "timestamp": 1640995200.0,
  "service": "Cactario Casa Molle API",
  "version": "1.0.0"
}
```

### **2. Verificar CORS:**

```bash
curl -H "Origin: https://cactario-frontend-production.up.railway.app" \
     -I https://cactario-backend-production.up.railway.app/auth/me
```

**Headers esperados:**
```
Access-Control-Allow-Origin: https://cactario-frontend-production.up.railway.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: *, X-CSRF-Token, Authorization, Content-Type
```

### **3. Verificar Swagger UI:**

```
https://cactario-backend-production.up.railway.app/docs
```

### **4. Verificar Endpoint de Debug:**

```bash
curl https://cactario-backend-production.up.railway.app/debug/cors-status
```

---

## 🎯 **Estructura Final del Proyecto en Railway**

### **Servicios:**
1. **Frontend Service:**
   - **Nombre:** `cactario-frontend`
   - **Dominio:** `https://cactario-frontend-production.up.railway.app`
   - **Working Directory:** `nextjs`
   - **Puerto:** 3001

2. **Backend Service:**
   - **Nombre:** `cactario-backend`
   - **Dominio:** `https://cactario-backend-production.up.railway.app`
   - **Working Directory:** `fastapi`
   - **Puerto:** 8000 (automático)

### **Variables de Entorno:**

#### **Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
```

#### **Backend:**
```bash
SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENV=production
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
```

---

## 🚨 **Troubleshooting**

### **Si el backend no se despliega:**

1. **Verificar Working Directory:**
   - Debe estar configurado como `fastapi`

2. **Verificar Start Command:**
   - Debe ser: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Verificar Variables de Entorno:**
   - Todas las variables de Supabase deben estar configuradas

4. **Verificar Logs:**
   - Revisar logs de Railway para errores de build o inicio

### **Si CORS sigue fallando:**

1. **Verificar dominio del frontend:**
   - Debe estar en `CORS_ORIGINS`

2. **Verificar configuración CORS:**
   - Revisar logs del backend para "CORS Origins configured"

3. **Verificar preflight requests:**
   - Probar OPTIONS request manualmente

---

## 🎉 **Resultado Final**

Después de seguir estos pasos:

- ✅ **Backend desplegado** en `https://cactario-backend-production.up.railway.app`
- ✅ **Health endpoint** funcionando
- ✅ **CORS configurado** correctamente
- ✅ **Frontend puede comunicarse** con backend
- ✅ **Autenticación** funcionando end-to-end
- ✅ **Swagger UI** disponible en `/docs`

**¡El sistema completo funcionará con servicios separados en Railway!** 🚂✨

---

## 📋 **Checklist de Despliegue**

- [ ] Crear nuevo servicio backend en Railway
- [ ] Configurar working directory como `fastapi`
- [ ] Configurar start command
- [ ] Configurar variables de entorno
- [ ] Generar dominio público
- [ ] Actualizar variable de entorno del frontend
- [ ] Redeploy del frontend
- [ ] Verificar health endpoint
- [ ] Verificar CORS
- [ ] Verificar comunicación frontend-backend
- [ ] Probar autenticación end-to-end

**¡Sigue estos pasos y tu backend estará funcionando en Railway!** 🚀
