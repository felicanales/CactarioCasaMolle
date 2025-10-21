# 📊 Logging and Debugging Guide

## 🎯 **Sistema de Logging Implementado**

El backend ahora incluye un sistema completo de logging y debugging para facilitar el diagnóstico de problemas en Railway.

---

## 📝 **Logs de Inicio del Servidor**

Cuando el servidor se inicia, verás logs estructurados con toda la información relevante:

### **Ejemplo de Logs de Inicio:**

```
============================================================
🚀 Iniciando Cactario Casa Molle Backend
============================================================
📋 Variables de Entorno:
   PORT: 8000
   RAILWAY_ENVIRONMENT_NAME: production
   RAILWAY_REGION: us-west-1
   RAILWAY_PUBLIC_DOMAIN: cactario-backend-production.up.railway.app
   SUPABASE_URL: https://gefozbrdrtopdfuezppm...
   Python Version: 3.11.9
   Working Directory: /app
✅ Todas las variables críticas están configuradas
============================================================
🌐 Configuración CORS:
   Orígenes permitidos: 5 dominios
      - http://localhost:3001
      - http://127.0.0.1:3001
      - https://cactario-frontend-production.up.railway.app
      - https://cactario-backend-production.up.railway.app
      - https://cactario-casa-molle.vercel.app
🔧 Configurando middlewares...
   ✅ CORSMiddleware configurado
   ✅ AuthMiddleware configurado
📡 Registrando rutas de API...
   ✅ /auth/* - Rutas de autenticación
   ✅ /species/* - Rutas de especies
   ✅ /sectors/* - Rutas de sectores
   ✅ /debug/* - Rutas de debug
============================================================
✅ Servidor FastAPI inicializado correctamente
📚 Documentación disponible en: /docs
🏥 Health endpoint disponible en: /health
🔍 Debug endpoint disponible en: /debug/environment
============================================================
```

---

## 🔍 **Endpoint de Debug: `/debug/environment`**

### **Acceso:**
```bash
# En Railway
curl https://cactario-backend-production.up.railway.app/debug/environment

# En local
curl http://localhost:8000/debug/environment
```

### **Información Incluida:**

#### **1. Variables de Railway:**
```json
{
  "railway": {
    "PORT": "8000",
    "RAILWAY_ENVIRONMENT_NAME": "production",
    "RAILWAY_ENVIRONMENT": "production",
    "RAILWAY_PROJECT_NAME": "CactarioCasaMolle",
    "RAILWAY_PROJECT_ID": "...",
    "RAILWAY_SERVICE_NAME": "cactario-backend",
    "RAILWAY_SERVICE_ID": "...",
    "RAILWAY_DEPLOYMENT_ID": "...",
    "RAILWAY_REGION": "us-west-1",
    "RAILWAY_PUBLIC_DOMAIN": "cactario-backend-production.up.railway.app",
    "RAILWAY_PRIVATE_DOMAIN": "..."
  }
}
```

#### **2. Variables de Supabase (sin exponer secretos):**
```json
{
  "supabase": {
    "SUPABASE_URL": "https://gefozbrdrtopdfuezppm.supabase.co",
    "SUPABASE_ANON_KEY_SET": "Sí",
    "SUPABASE_SERVICE_ROLE_KEY_SET": "Sí"
  }
}
```

#### **3. Información del Sistema:**
```json
{
  "system": {
    "python_version": "3.11.9 (main, ...) \n[GCC 12.2.0]",
    "python_executable": "/usr/local/bin/python",
    "platform": "Linux-5.15.0-1041-aws-x86_64-with-glibc2.35",
    "architecture": "x86_64",
    "processor": "x86_64",
    "hostname": "...",
    "working_directory": "/app",
    "pid": 1
  }
}
```

#### **4. Dependencias:**
```json
{
  "dependencies": {
    "fastapi": "0.119.0",
    "uvicorn": "0.37.0",
    "supabase": "2.22.0"
  }
}
```

#### **5. Estado de Configuración:**
```json
{
  "config_status": {
    "port_configured": true,
    "supabase_url_configured": true,
    "supabase_anon_key_configured": true,
    "supabase_service_role_key_configured": true,
    "all_critical_vars_set": true
  }
}
```

#### **6. Timestamp:**
```json
{
  "timestamp": {
    "server_time": "2024-01-15T10:30:45.123456",
    "timezone": "UTC"
  }
}
```

---

## 🚨 **Diagnóstico de Problemas Comunes**

### **Problema 1: Variables de Entorno Faltantes**

**Logs de error:**
```
⚠️  Variables de entorno faltantes: SUPABASE_URL, SUPABASE_ANON_KEY
```

**Solución:**
1. Ve a Railway Dashboard > Service > Variables
2. Agrega las variables faltantes
3. Redeploy del servicio

---

### **Problema 2: Puerto No Configurado**

**Logs de error:**
```
📋 Variables de Entorno:
   PORT: No definido
```

**Solución:**
- Railway debe configurar `PORT` automáticamente
- Verifica que el servicio esté usando el Dockerfile correcto
- Revisa que `railway.json` esté configurado correctamente

---

### **Problema 3: Healthcheck Falla**

**Cómo verificar:**
```bash
# Verificar que el endpoint /health responde
curl https://cactario-backend-production.up.railway.app/health

# Debería retornar:
{
  "status": "ok",
  "message": "Service is healthy",
  "timestamp": 1234567890.0,
  "service": "Cactario Casa Molle API",
  "version": "1.0.0"
}
```

**Logs esperados:**
```
Healthcheck ejecutado
```

---

### **Problema 4: Errores de CORS**

**Cómo verificar:**
```bash
# Ver configuración de CORS
curl https://cactario-backend-production.up.railway.app/debug/cors-status
```

**Logs esperados:**
```
🌐 Configuración CORS:
   Orígenes permitidos: 5 dominios
      - https://cactario-frontend-production.up.railway.app
```

---

## 📊 **Niveles de Log**

El sistema usa estos niveles de log:

| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| `INFO` | Información general del servidor | Inicio del servidor, configuración |
| `DEBUG` | Información detallada de debugging | Cada request a /health, /debug |
| `WARNING` | Advertencias que no impiden el funcionamiento | Variables faltantes (no críticas) |
| `ERROR` | Errores que impiden el funcionamiento | Fallos de conexión, imports fallidos |

---

## 🔧 **Cómo Ver los Logs en Railway**

### **Método 1: Railway Dashboard**
1. Ve a Railway Dashboard
2. Selecciona tu servicio backend
3. Ve a la pestaña **"Deployments"**
4. Haz clic en el deployment activo
5. Ve a **"Logs"**
6. Busca los mensajes con emojis para navegación rápida:
   - 🚀 Inicio del servidor
   - 📋 Variables de entorno
   - 🌐 Configuración CORS
   - 🔧 Middlewares
   - 📡 Rutas registradas
   - ✅ Servidor inicializado

### **Método 2: Railway CLI**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Ver logs en tiempo real
railway logs
```

---

## 🎯 **Endpoints de Debug Disponibles**

| Endpoint | Descripción | Autenticación |
|----------|-------------|---------------|
| `/debug` | Ping básico | No requerida |
| `/debug/routes` | Lista todas las rutas | No requerida |
| `/debug/auth-status` | Estado de autenticación | No requerida |
| `/debug/supabase-status` | Estado de Supabase | No requerida |
| `/debug/cors-status` | Configuración CORS | No requerida |
| `/debug/environment` | **Información completa del entorno** | No requerida |

**Nota:** Los endpoints de debug no requieren autenticación para facilitar el diagnóstico.

---

## 🛠️ **Troubleshooting Rápido**

### **1. Servidor no inicia:**
```bash
# Ver logs de inicio
railway logs | grep "🚀"

# Verificar variables de entorno
curl https://tu-backend.railway.app/debug/environment
```

### **2. Healthcheck falla:**
```bash
# Verificar endpoint directamente
curl https://tu-backend.railway.app/health

# Ver logs de healthcheck
railway logs | grep "Healthcheck"
```

### **3. CORS bloqueado:**
```bash
# Verificar configuración CORS
curl https://tu-backend.railway.app/debug/cors-status

# Ver logs de CORS
railway logs | grep "🌐"
```

### **4. Rutas no registradas:**
```bash
# Listar todas las rutas
curl https://tu-backend.railway.app/debug/routes

# Ver logs de rutas
railway logs | grep "📡"
```

---

## 📚 **Ejemplos de Uso**

### **Ejemplo 1: Verificar que todo está configurado**
```bash
curl https://cactario-backend-production.up.railway.app/debug/environment | jq '.config_status'

# Respuesta esperada:
{
  "port_configured": true,
  "supabase_url_configured": true,
  "supabase_anon_key_configured": true,
  "supabase_service_role_key_configured": true,
  "all_critical_vars_set": true
}
```

### **Ejemplo 2: Ver versión de Python en producción**
```bash
curl https://cactario-backend-production.up.railway.app/debug/environment | jq '.system.python_version'

# Respuesta:
"3.11.9 (main, ...) \n[GCC 12.2.0]"
```

### **Ejemplo 3: Ver región de Railway**
```bash
curl https://cactario-backend-production.up.railway.app/debug/environment | jq '.railway.RAILWAY_REGION'

# Respuesta:
"us-west-1"
```

---

## ✅ **Checklist de Diagnóstico**

Cuando un deployment falla, revisa en orden:

- [ ] Ver logs de inicio en Railway Dashboard
- [ ] Verificar que aparece "🚀 Iniciando Cactario Casa Molle Backend"
- [ ] Verificar que todas las variables críticas están configuradas
- [ ] Verificar que aparece "✅ Servidor FastAPI inicializado correctamente"
- [ ] Acceder a `/debug/environment` y verificar `all_critical_vars_set: true`
- [ ] Verificar que `/health` responde con `{"status": "ok"}`
- [ ] Verificar CORS con `/debug/cors-status`
- [ ] Verificar rutas con `/debug/routes`

---

**¡Con este sistema de logging, podrás diagnosticar cualquier problema rápidamente!** 🎉

