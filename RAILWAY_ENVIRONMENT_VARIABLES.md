# 🔧 Railway Environment Variables - Configuración Completa

## 📋 **Variables de Entorno Requeridas en Railway**

### **🚂 Variables Automáticas de Railway (NO configurar manualmente):**
```bash
PORT=3000                           # Puerto asignado automáticamente
RAILWAY_PUBLIC_DOMAIN=tu-proyecto.railway.app    # Dominio público automático
NODE_ENV=production                 # Entorno automático
```

### **⚙️ Variables de Configuración (Configurar manualmente):**
```bash
# Railway Healthcheck Configuration
RAILWAY_HEALTHCHECK_TIMEOUT_SEC=600

# Supabase Configuration (CRÍTICAS)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Configuration (Railway completará automáticamente)
NEXT_PUBLIC_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

---

## 🚀 **Cómo Configurar en Railway Dashboard:**

### **Paso 1: Ir a Railway Dashboard**
1. **Selecciona tu proyecto**
2. **Ve a la pestaña "Variables"**
3. **Haz clic en "Add Variable"**

### **Paso 2: Agregar Variables una por una**

#### **1. RAILWAY_HEALTHCHECK_TIMEOUT_SEC:**
```
Variable: RAILWAY_HEALTHCHECK_TIMEOUT_SEC
Value: 600
```

#### **2. SUPABASE_URL:**
```
Variable: SUPABASE_URL
Value: https://tu-proyecto.supabase.co
```

#### **3. SUPABASE_ANON_KEY:**
```
Variable: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (tu clave anon)
```

#### **4. SUPABASE_SERVICE_ROLE_KEY:**
```
Variable: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (tu clave service_role)
```

#### **5. NEXT_PUBLIC_API_URL:**
```
Variable: NEXT_PUBLIC_API_URL
Value: https://${{RAILWAY_PUBLIC_DOMAIN}}
```

#### **6. API_URL:**
```
Variable: API_URL
Value: https://${{RAILWAY_PUBLIC_DOMAIN}}
```

#### **7. CORS_ORIGINS:**
```
Variable: CORS_ORIGINS
Value: https://${{RAILWAY_PUBLIC_DOMAIN}}
```

---

## 🔍 **Cómo Obtener las Claves de Supabase:**

### **1. Ir a Supabase Dashboard:**
- Ve a [supabase.com](https://supabase.com)
- Selecciona tu proyecto

### **2. Ir a Settings → API:**
- **Project URL** → `SUPABASE_URL`
- **anon public** → `SUPABASE_ANON_KEY`
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ **Importante sobre Seguridad:**

### **🔐 SUPABASE_SERVICE_ROLE_KEY:**
- **NUNCA** la expongas en el frontend
- **Solo** en Railway Variables (server-side)
- **Acceso total** a Supabase (usa con cuidado)

### **✅ SUPABASE_ANON_KEY:**
- **Puede** estar en el frontend
- **Limitada** por RLS policies
- **Solo** operaciones permitidas

---

## 🎯 **Verificación:**

### **Una vez configuradas, verifica que estén:**
```bash
# En Railway Dashboard → Variables
✅ RAILWAY_HEALTHCHECK_TIMEOUT_SEC=600
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ NEXT_PUBLIC_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
✅ API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
✅ CORS_ORIGINS=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

---

## 🚨 **Troubleshooting:**

### **Si el healthcheck sigue fallando:**

1. **Verificar que RAILWAY_HEALTHCHECK_TIMEOUT_SEC esté configurado:**
   ```bash
   RAILWAY_HEALTHCHECK_TIMEOUT_SEC=600
   ```

2. **Verificar que PORT esté siendo usado:**
   ```bash
   # En los logs buscar:
   PORT: 3000
   ```

3. **Verificar que FastAPI esté corriendo:**
   ```bash
   # En los logs buscar:
   🚀 Starting FastAPI on port 3000...
   ```

4. **Probar endpoint manualmente:**
   ```bash
   curl https://tu-proyecto.railway.app/health
   ```

---

## 📋 **Resumen de Variables:**

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` | ✅ | Timeout para healthcheck (600 segundos) |
| `SUPABASE_URL` | ✅ | URL de tu proyecto Supabase |
| `SUPABASE_ANON_KEY` | ✅ | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clave de servicio de Supabase |
| `NEXT_PUBLIC_API_URL` | ✅ | URL de la API para el frontend |
| `API_URL` | ✅ | URL de la API para el backend |
| `CORS_ORIGINS` | ⚠️ | Orígenes permitidos para CORS |
| `PORT` | 🚂 | Puerto asignado por Railway (automático) |
| `RAILWAY_PUBLIC_DOMAIN` | 🚂 | Dominio público (automático) |

**¡Con estas variables configuradas, tu aplicación debería funcionar correctamente en Railway!** 🚂✨
