# 🚂 Backend Environment Variables - Railway Deployment

## ⚙️ **Variables de Configuración para el Backend**

Estas variables deben ser configuradas en el servicio backend de Railway.

### **Variables Requeridas:**

```bash
# Puerto (automático de Railway)
PORT=8000

# Supabase Configuration
SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTc1MDgsImV4cCI6MjA3NTU5MzUwOH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxNzUwOCwiZXhwIjoyMDc1NTkzNTA4fQ.2kP9Gn5U8yDSf74Mg3fGAQtRVGe_nx2sy6ymBbrMD8E

# Environment
ENV=production

# CORS Configuration
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app

# Railway Configuration
RAILWAY_PUBLIC_DOMAIN=cactario-backend-production.up.railway.app
```

### **Variables Automáticas de Railway:**

```bash
# Estas son inyectadas automáticamente por Railway
PORT=8000
RAILWAY_PUBLIC_DOMAIN=cactario-backend-production.up.railway.app
NODE_ENV=production
```

---

## 🚀 **Pasos para Configurar el Backend en Railway:**

### **1. Crear Nuevo Servicio Backend:**

1. **Ve a Railway Dashboard**
2. **Selecciona tu proyecto**
3. **Haz clic en "New Service"**
4. **Selecciona "GitHub Repo"**
5. **Selecciona tu repositorio**

### **2. Configurar el Servicio:**

1. **Nombre del servicio:** `cactario-backend`
2. **Working Directory:** `fastapi`
3. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### **3. Configurar Variables de Entorno:**

En la pestaña "Variables" del servicio backend:

```bash
SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTc1MDgsImV4cCI6MjA3NTU5MzUwOH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxNzUwOCwiZXhwIjoyMDc1NTkzNTA4fQ.2kP9Gn5U8yDSf74Mg3fGAQtRVGe_nx2sy6ymBbrMD8E
ENV=production
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
```

### **4. Configurar Dominio Público:**

1. **Ve a la pestaña "Settings"**
2. **En "Domains"**
3. **Haz clic en "Generate Domain"**
4. **El dominio será:** `https://cactario-backend-production.up.railway.app`

### **5. Actualizar Frontend:**

Una vez que el backend esté desplegado, actualizar la variable de entorno del frontend:

```bash
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
```

---

## 🔧 **Configuración de Archivos:**

### **Archivos Creados para el Backend:**

1. **`fastapi/railway.json`** - Configuración de Railway
2. **`fastapi/nixpacks.toml`** - Configuración de Nixpacks
3. **`fastapi/Procfile`** - Comando de inicio
4. **`fastapi/runtime.txt`** - Versión de Python
5. **`fastapi/.railwayignore`** - Archivos a ignorar
6. **`fastapi/start-backend.sh`** - Script de inicio optimizado

---

## 🎯 **Verificación del Despliegue:**

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

### **3. Verificar Endpoint de Debug:**

```bash
curl https://cactario-backend-production.up.railway.app/debug/cors-status
```

---

## 🚨 **Troubleshooting:**

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

## 🎉 **Resultado Final:**

Después de configurar correctamente:

- ✅ **Backend desplegado** en `https://cactario-backend-production.up.railway.app`
- ✅ **Health endpoint** funcionando
- ✅ **CORS configurado** correctamente
- ✅ **Frontend puede comunicarse** con backend
- ✅ **Autenticación** funcionando end-to-end

**¡El sistema completo funcionará con servicios separados en Railway!** 🚂✨
