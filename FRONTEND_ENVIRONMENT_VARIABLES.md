# 🔧 Frontend Environment Variables - Railway

## 📋 **Variables de Entorno del Frontend**

El frontend de Next.js requiere la siguiente variable de entorno para comunicarse con el backend:

---

## 🌐 **NEXT_PUBLIC_API_URL**

**Descripción:** URL completa del backend API

**Requerida:** ✅ Sí (para producción)

**Valores por entorno:**

### **Desarrollo Local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### **Producción (Railway):**
```bash
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
```

---

## 🚀 **Cómo Configurar en Railway**

### **Paso 1: Acceder al Dashboard de Railway**
1. Ve a [railway.app](https://railway.app)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto "CactarioCasaMolle"

### **Paso 2: Seleccionar el Servicio del Frontend**
1. Haz clic en el servicio del frontend
2. Ve a la pestaña **"Variables"**

### **Paso 3: Agregar la Variable**
1. Haz clic en **"+ New Variable"**
2. En el campo **"Variable Name"**, escribe:
   ```
   NEXT_PUBLIC_API_URL
   ```
3. En el campo **"Value"**, escribe:
   ```
   https://cactario-backend-production.up.railway.app
   ```
4. Haz clic en **"Add"**

### **Paso 4: Redeploy (Automático)**
- Railway automáticamente hará redeploy del frontend
- Espera a que el despliegue se complete (~2-3 minutos)

---

## 🔍 **Verificación**

Después de configurar la variable y que el redeploy se complete:

### **1. Verificar en la consola del navegador:**
```javascript
// Abre DevTools > Console en tu sitio de Railway
console.log(process.env.NEXT_PUBLIC_API_URL)
// Debería mostrar: https://cactario-backend-production.up.railway.app
```

### **2. Verificar que el frontend se comunica con el backend:**
```bash
# Abre DevTools > Network
# Intenta hacer login
# Deberías ver requests a: https://cactario-backend-production.up.railway.app/auth/request-otp
```

---

## 📝 **Notas Importantes**

### **Variables Públicas:**
- Las variables que empiezan con `NEXT_PUBLIC_` son **públicas**
- Se exponen en el navegador del cliente
- Se incrustan en el código JavaScript durante el build
- **NO coloques secretos** en variables `NEXT_PUBLIC_*`

### **Prioridad de Configuración:**
El código del frontend usa el siguiente orden de prioridad:

1. **Variable de entorno** `NEXT_PUBLIC_API_URL` (si está definida)
2. **Detección automática** de Railway (si `window.location.hostname.includes('railway.app')`)
3. **Desarrollo local** `http://localhost:8000` (por defecto)

### **¿Cuándo Redeploy?**
Railway automáticamente hace redeploy cuando:
- ✅ Cambias variables de entorno
- ✅ Haces push a GitHub
- ❌ NO hace redeploy cuando cambias código sin hacer push

---

## 🎯 **Resumen de Variables**

| Variable | Valor | Requerida | Público |
|----------|-------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://cactario-backend-production.up.railway.app` | ✅ Sí | ✅ Sí |

---

## 🔄 **Alternativa: Sin Variable de Entorno**

Si prefieres **NO usar variables de entorno**, el código ya está configurado para detectar automáticamente Railway:

```javascript
// En AuthContext.jsx
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return "https://cactario-backend-production.up.railway.app";
  }
  return "http://localhost:8000";
};
```

**Ventajas:**
- ✅ No requiere configuración manual
- ✅ Funciona automáticamente en Railway

**Desventajas:**
- ❌ Menos flexible si cambias el dominio del backend
- ❌ No puedes cambiar la URL sin modificar código

---

## 🛠️ **Troubleshooting**

### **El frontend no se conecta al backend:**

1. **Verificar variable de entorno:**
   ```bash
   # En Railway > Frontend Service > Variables
   NEXT_PUBLIC_API_URL debe estar configurada
   ```

2. **Verificar que el backend esté activo:**
   ```bash
   curl https://cactario-backend-production.up.railway.app/health
   # Debería retornar: {"status": "ok", ...}
   ```

3. **Verificar CORS:**
   - El backend debe permitir el dominio del frontend en `CORS_ORIGINS`

4. **Verificar logs de Railway:**
   - Ve a Railway > Frontend Service > Deployments > Logs
   - Busca errores de CORS o de red

---

## 📚 **Documentación Relacionada**

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [DOCKERFILE_DEPLOYMENT_GUIDE.md](./DOCKERFILE_DEPLOYMENT_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**¡Con esta configuración, el frontend se comunicará correctamente con el backend!** 🚀

