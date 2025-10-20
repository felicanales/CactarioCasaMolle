# 🚂 Guía de Despliegue en Railway - Solución de Problemas

## 🔍 **Diagnóstico del Problema: Error 404 en /auth/me**

### **Problema Identificado:**
- El frontend falla al hacer `GET /auth/me` y `POST /auth/request-otp` con error 404
- Parece que solo se ha desplegado el frontend, sin el backend FastAPI

### **Causas Posibles:**
1. **Backend no está corriendo** en Railway
2. **Variables de entorno** no configuradas correctamente
3. **Configuración de Railway** incorrecta
4. **Frontend no puede conectarse** al backend

---

## 🛠️ **Soluciones Implementadas**

### **1. Configuración de Railway Mejorada**

#### **Archivo `railway.json` actualizado:**
```json
{
  "deploy": {
    "startCommand": "npm run start:all",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath": "/debug",
    "healthcheckTimeout": 300
  },
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  }
}
```

#### **Archivo `railway.toml` creado:**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:all"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
healthcheckPath = "/debug"
healthcheckTimeout = 300

[env]
NODE_ENV = "production"
NEXT_PUBLIC_API_URL = "https://${{RAILWAY_PUBLIC_DOMAIN}}"
```

### **2. Configuración de Next.js Mejorada**

#### **Archivo `next.config.mjs` actualizado:**
```javascript
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizeCss: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};
```

### **3. Script de Diagnóstico**

#### **Archivo `diagnose_deployment.py` creado:**
- Verifica el estado del backend
- Prueba todos los endpoints
- Identifica problemas de conectividad

---

## 🚀 **Pasos para Solucionar el Problema**

### **Paso 1: Verificar Variables de Entorno en Railway**

En Railway Dashboard → **Variables**, asegúrate de tener:

```bash
# 🔐 SUPABASE (CRÍTICAS)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🌐 API CONFIGURATION
NEXT_PUBLIC_API_URL=https://tu-proyecto.railway.app
API_URL=https://tu-proyecto.railway.app

# 🚂 RAILWAY (automático)
RAILWAY_PUBLIC_DOMAIN=tu-proyecto.railway.app
```

### **Paso 2: Verificar Logs de Railway**

1. **Ir a Railway Dashboard**
2. **Deployments** → **Ver logs más recientes**
3. **Buscar**:
   - `npm run start:all`
   - `FastAPI running on port 8000`
   - `Next.js running on port 3001`

### **Paso 3: Verificar que el Backend esté Corriendo**

#### **Usar el script de diagnóstico:**
```bash
python diagnose_deployment.py
```

#### **O verificar manualmente:**
```bash
# Probar endpoint raíz
curl https://tu-proyecto.railway.app/

# Probar endpoint de debug
curl https://tu-proyecto.railway.app/debug

# Probar endpoint de auth
curl https://tu-proyecto.railway.app/auth/me
```

### **Paso 4: Re-deploy si es Necesario**

1. **Hacer push** de los cambios a GitHub
2. **Railway detectará** los cambios automáticamente
3. **Verificar** que el deploy sea exitoso

---

## 🔍 **Verificación del Estado**

### **✅ Backend Funcionando Correctamente:**
```
GET https://tu-proyecto.railway.app/ → 200 OK
GET https://tu-proyecto.railway.app/debug → 200 OK
GET https://tu-proyecto.railway.app/auth/me → 401 Unauthorized (correcto)
```

### **❌ Backend No Funcionando:**
```
GET https://tu-proyecto.railway.app/ → 404 Not Found
GET https://tu-proyecto.railway.app/debug → 404 Not Found
GET https://tu-proyecto.railway.app/auth/me → 404 Not Found
```

---

## 🎯 **Resultado Esperado**

### **Después de aplicar las soluciones:**
- ✅ **Backend FastAPI** corriendo en puerto 8000
- ✅ **Frontend Next.js** corriendo en puerto 3001
- ✅ **Endpoints de autenticación** funcionando
- ✅ **Variables de entorno** configuradas correctamente
- ✅ **Comunicación** entre frontend y backend establecida

### **URLs que deberían funcionar:**
- `https://tu-proyecto.railway.app/` → Frontend
- `https://tu-proyecto.railway.app/auth/me` → Backend API
- `https://tu-proyecto.railway.app/debug` → Debug endpoint

---

## 🚨 **Troubleshooting Adicional**

### **Si el problema persiste:**

1. **Verificar que Railway esté ejecutando el comando correcto:**
   ```bash
   npm run start:all
   ```

2. **Verificar que no haya conflictos de puertos:**
   - Frontend: Puerto 3001
   - Backend: Puerto 8000

3. **Verificar que las dependencias estén instaladas:**
   ```bash
   npm install
   cd fastapi && pip install -r requirements.txt
   ```

4. **Verificar logs de Railway** para errores específicos

---

## 🎉 **Conclusión**

Con estas configuraciones, Railway debería desplegar correctamente tanto el frontend como el backend, resolviendo el error 404 en los endpoints de autenticación.

**¡El sistema completo debería funcionar en un solo servidor Railway!** 🚂✨
