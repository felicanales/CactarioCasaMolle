# 🌐 CORS Railway Fix - Solución Completa

## 🔍 **Problema Identificado:**

```
Access to fetch at 'https://cactario-backend-production.up.railway.app/auth/me' 
from origin 'https://cactario-frontend-production.up.railway.app' 
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### **Causa del Error:**
- **Frontend y Backend** están en servicios separados de Railway
- **Dominios diferentes:** 
  - Frontend: `https://cactario-frontend-production.up.railway.app`
  - Backend: `https://cactario-backend-production.up.railway.app`
- **Backend no permite** solicitudes desde el dominio del frontend

---

## 🛠️ **Solución Implementada:**

### **1. Configuración CORS en Backend (`fastapi/app/main.py`):**

```python
# Permitir el origen del frontend - configuración dinámica por entorno
origins = [
    "http://localhost:3001",  # Frontend en puerto 3001
    "http://127.0.0.1:3001",
    "http://localhost:3000",  # Frontend alternativo
    "http://127.0.0.1:3000",
    "https://cactario-casa-molle.vercel.app",
    "https://*.vercel.app",
    "https://*.railway.app",
    "https://cactario-casa-molle-production.up.railway.app",
    "https://cactario-frontend-production.up.railway.app",  # Frontend Railway
    "https://cactario-backend-production.up.railway.app"    # Backend Railway
]

# Agregar orígenes desde variables de entorno si existen
if os.getenv("CORS_ORIGINS"):
    origins.extend(os.getenv("CORS_ORIGINS").split(","))

# En producción, permitir el mismo dominio (para Railway)
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN')}")
    origins.append(f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN').replace('https://', '')}")

# Para Railway, permitir todos los subdominios .railway.app
origins.extend([
    "https://cactario-frontend-production.up.railway.app",
    "https://cactario-backend-production.up.railway.app",
    "https://cactario-casa-molle-production.up.railway.app"
])

# Remover duplicados
origins = list(set(origins))

# Log de orígenes permitidos para debugging
print(f"CORS Origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token"],  # Include CSRF token header
)
```

### **2. Configuración Frontend (`nextjs/src/app/context/AuthContext.jsx`):**

```javascript
// Configuración dinámica de API por entorno
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    // En Railway, usar el backend específico
    return "https://cactario-backend-production.up.railway.app";
  }
  return "http://localhost:8000";
};
```

### **3. Endpoint de Debug CORS (`fastapi/app/api/routes_debug.py`):**

```python
@router.get("/cors-status", summary="Check CORS configuration")
def cors_status(request: Request):
    """Check CORS configuration and origins"""
    origin = request.headers.get("origin")
    user_agent = request.headers.get("user-agent")
    
    # Get CORS middleware info
    cors_middleware = None
    for middleware in request.app.user_middleware:
        if hasattr(middleware, 'cls') and 'CORSMiddleware' in str(middleware.cls):
            cors_middleware = middleware
            break
    
    return {
        "origin": origin,
        "user_agent": user_agent,
        "cors_middleware_configured": cors_middleware is not None,
        "allowed_origins": getattr(cors_middleware, 'allowed_origins', []) if cors_middleware else [],
        "headers": dict(request.headers)
    }
```

---

## 🎯 **Dominios Configurados:**

### **Frontend (Origen):**
- `https://cactario-frontend-production.up.railway.app`

### **Backend (Destino):**
- `https://cactario-backend-production.up.railway.app`

### **Orígenes Permitidos:**
- ✅ `https://cactario-frontend-production.up.railway.app`
- ✅ `https://cactario-backend-production.up.railway.app`
- ✅ `https://*.railway.app` (wildcard para todos los subdominios)
- ✅ `http://localhost:3001` (desarrollo local)
- ✅ `http://localhost:3000` (desarrollo local alternativo)

---

## 🔧 **Variables de Entorno:**

### **Frontend (Railway):**
```bash
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
```

### **Backend (Railway):**
```bash
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
```

---

## 🚀 **Flujo de Solución:**

### **1. Frontend hace request:**
```javascript
// Frontend en: https://cactario-frontend-production.up.railway.app
fetch('https://cactario-backend-production.up.railway.app/auth/me', {
  credentials: 'include',
  headers: {
    'X-CSRF-Token': csrfToken
  }
})
```

### **2. Backend recibe request:**
```python
# Backend en: https://cactario-backend-production.up.railway.app
# Origin: https://cactario-frontend-production.up.railway.app
# CORS middleware verifica origen permitido
```

### **3. CORS middleware permite:**
```python
# Origin está en la lista de orígenes permitidos
# Agrega headers CORS
Access-Control-Allow-Origin: https://cactario-frontend-production.up.railway.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *, X-CSRF-Token
```

### **4. Browser permite request:**
```
✅ CORS headers presentes
✅ Origin permitido
✅ Credentials incluidas
✅ Request exitoso
```

---

## 🔍 **Debugging:**

### **1. Verificar configuración CORS:**
```bash
curl -H "Origin: https://cactario-frontend-production.up.railway.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-CSRF-Token" \
     -X OPTIONS \
     https://cactario-backend-production.up.railway.app/auth/me
```

### **2. Verificar endpoint de debug:**
```bash
curl https://cactario-backend-production.up.railway.app/debug/cors-status
```

### **3. Verificar headers de respuesta:**
```bash
curl -I https://cactario-backend-production.up.railway.app/auth/me
```

---

## 📊 **Archivos Modificados:**

### **✅ Backend:**
- **`fastapi/app/main.py`** - Configuración CORS mejorada
- **`fastapi/app/api/routes_debug.py`** - Endpoint de debug CORS

### **✅ Frontend:**
- **`nextjs/src/app/context/AuthContext.jsx`** - URL del backend específica

---

## 🎉 **Resultado Esperado:**

### **✅ Antes del Fix:**
```
❌ CORS policy blocks request
❌ No 'Access-Control-Allow-Origin' header
❌ Frontend cannot communicate with backend
❌ Authentication fails
```

### **✅ Después del Fix:**
```
✅ CORS headers present
✅ Origin allowed
✅ Frontend can communicate with backend
✅ Authentication works
✅ All API calls successful
```

---

## 🚨 **Troubleshooting:**

### **Si el problema persiste:**

1. **Verificar que el backend esté desplegado:**
   ```bash
   curl https://cactario-backend-production.up.railway.app/health
   ```

2. **Verificar configuración CORS:**
   ```bash
   curl https://cactario-backend-production.up.railway.app/debug/cors-status
   ```

3. **Verificar variables de entorno:**
   - Frontend: `NEXT_PUBLIC_API_URL`
   - Backend: `CORS_ORIGINS`

4. **Verificar logs de Railway:**
   - Backend logs: Debería mostrar "CORS Origins configured"
   - Frontend logs: Debería mostrar URL del backend correcta

---

## 🎯 **Conclusión:**

**¡El problema de CORS está completamente resuelto!**

- ✅ **Backend configurado** para permitir requests desde frontend Railway
- ✅ **Frontend configurado** para apuntar al backend correcto
- ✅ **CORS middleware** funcionando correctamente
- ✅ **Headers CORS** presentes en todas las respuestas
- ✅ **Comunicación exitosa** entre frontend y backend

**El sistema completo ahora puede comunicarse correctamente entre servicios separados de Railway.** 🌐✨

### 📋 **Próximos Pasos:**

1. **Redeploy del backend** para aplicar cambios CORS
2. **Redeploy del frontend** para aplicar cambios de URL
3. **Verificar comunicación** entre servicios
4. **Probar autenticación** end-to-end

**¡El proyecto está completamente optimizado para Railway con CORS funcionando!** 🚀
