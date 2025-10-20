# 🐳 Dockerfile Deployment Guide - Railway Backend

## ✅ **Configuración Seleccionada: Dockerfile**

Has elegido usar el **Dockerfile personalizado**, que es la opción más robusta y recomendada para desplegar el backend en Railway.

---

## 🐳 **Dockerfile Configurado**

### **Archivo: `fastapi/Dockerfile`**
```dockerfile
# Dockerfile for Cactario Casa Molle Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Ensure pip is available and up to date
RUN python -m ensurepip --upgrade && \
    python -m pip install --upgrade pip

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN python -m pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start command - use environment variable PORT with fallback
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

---

## 🚀 **Pasos para Desplegar con Dockerfile**

### **Paso 1: Crear Servicio Backend en Railway**

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
   - **Start Command:** (dejar vacío, se usará el CMD del Dockerfile)

2. **Variables de entorno:**
   ```bash
   SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTc1MDgsImV4cCI6MjA3NTU5MzUwOH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8E
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZm96YnJkcnRvcGRmdWV6cHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxNzUwOCwiZXhwIjoyMDc1NTkzNTA4fQ.2kP9Gn5U8yDSf74Mg3fGA XtRVGe_nx2sy6ymBbrMD8E
   ENV=production
   CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
   ```

### **Paso 3: Configurar Dominio Público**

1. **Generar dominio:**
   - Ve a la pestaña **"Settings"** del servicio backend
   - En la sección **"Domains"**
   - Haz clic en **"Generate Domain"**
   - El dominio será: `https://cactario-backend-production.up.railway.app`

### **Paso 4: Actualizar Frontend**

1. **Configurar variable de entorno del frontend:**
   ```bash
   NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
   ```

2. **Redeploy del frontend:**
   - Ve al servicio del frontend
   - Haz clic en **"Redeploy"**

---

## 🔧 **Ventajas del Dockerfile**

### **✅ Garantías:**
- **pip disponible** en la imagen base Python 3.11
- **Variables de entorno** correctamente interpoladas
- **Healthcheck** configurado
- **Dependencias del sistema** instaladas (gcc, libpq-dev)
- **Caché optimizado** con requirements.txt primero

### **✅ Características:**
- **Imagen base:** `python:3.11-slim`
- **Puerto:** Configurado automáticamente por Railway
- **Healthcheck:** Verifica `/health` endpoint
- **Start command:** Usa `uvicorn` con configuración optimizada

---

## 🎯 **Verificación del Despliegue**

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

### **2. Verificar Swagger UI:**

```
https://cactario-backend-production.up.railway.app/docs
```

### **3. Verificar CORS:**

```bash
curl -H "Origin: https://cactario-frontend-production.up.railway.app" \
     -I https://cactario-backend-production.up.railway.app/auth/me
```

### **4. Verificar Endpoint de Debug:**

```bash
curl https://cactario-backend-production.up.railway.app/debug/cors-status
```

---

## 📊 **Archivos de Configuración**

### **✅ Configuración Docker:**
- **`fastapi/Dockerfile`** - Dockerfile personalizado
- **`fastapi/railway.json`** - Configuración para usar Dockerfile
- **`fastapi/requirements.txt`** - Dependencias de Python

### **✅ Archivos de Soporte:**
- **`fastapi/.railwayignore`** - Archivos a ignorar
- **`fastapi/runtime.txt`** - Versión de Python (referencia)

---

## 🚨 **Troubleshooting**

### **Si el build falla:**

1. **Verificar que Dockerfile existe:**
   ```bash
   ls fastapi/Dockerfile
   ```

2. **Verificar configuración de Railway:**
   ```bash
   grep "DOCKERFILE" fastapi/railway.json
   ```

3. **Verificar logs de Railway:**
   - Revisar logs de build para errores de Docker
   - Buscar mensajes de éxito: "Build completed"

### **Si el healthcheck falla:**

1. **Verificar que el endpoint /health existe:**
   ```bash
   curl https://cactario-backend-production.up.railway.app/health
   ```

2. **Verificar logs de inicio:**
   - Buscar: "Starting FastAPI on port"
   - Buscar: "Uvicorn running"

---

## 🎉 **Resultado Final**

Después de seguir estos pasos:

- ✅ **Backend desplegado** en `https://cactario-backend-production.up.railway.app`
- ✅ **Dockerfile funcionando** correctamente
- ✅ **Health endpoint** respondiendo
- ✅ **CORS configurado** correctamente
- ✅ **Frontend puede comunicarse** con backend
- ✅ **Autenticación** funcionando end-to-end
- ✅ **Swagger UI** disponible en `/docs`

---

## 📋 **Checklist de Despliegue**

- [ ] Crear nuevo servicio backend en Railway
- [ ] Configurar working directory como `fastapi`
- [ ] Configurar variables de entorno
- [ ] Generar dominio público
- [ ] Actualizar variable de entorno del frontend
- [ ] Redeploy del frontend
- [ ] Verificar health endpoint
- [ ] Verificar CORS
- [ ] Verificar comunicación frontend-backend
- [ ] Probar autenticación end-to-end

**¡El backend estará funcionando perfectamente con Dockerfile!** 🐳✨
