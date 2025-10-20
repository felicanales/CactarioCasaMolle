# 🔧 Configuración de Variables de Entorno

## 📋 Variables Requeridas

### **Supabase (Obligatorias)**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **API Configuration**
```bash
# Para desarrollo local
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Para producción (Railway)
API_URL=https://your-domain.railway.app
NEXT_PUBLIC_API_URL=https://your-domain.railway.app
```

### **CORS (Opcional)**
```bash
CORS_ORIGINS=http://localhost:3001,https://your-domain.com
```

## 🚀 Configuración en Railway

### **1. Variables de Entorno en Railway Dashboard:**

1. Ve a tu proyecto en Railway
2. Selecciona el servicio
3. Ve a la pestaña "Variables"
4. Agrega las siguientes variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=https://your-domain.railway.app
CORS_ORIGINS=https://your-domain.railway.app
```

### **2. Verificar Configuración:**

Una vez desplegado, puedes verificar que las variables estén configuradas correctamente visitando:

```
https://your-domain.railway.app/debug/supabase-status
```

## 🔍 Troubleshooting

### **Error 404 en /auth/me:**
- Verifica que las rutas estén correctamente incluidas en `main.py`
- Revisa que el middleware esté funcionando
- Verifica los logs de Railway

### **Error 401 en /auth/me:**
- Verifica que las cookies estén siendo enviadas
- Revisa que el JWT sea válido
- Verifica la configuración de Supabase

### **Error 500 en /auth/me:**
- Verifica las variables de entorno de Supabase
- Revisa la conexión a la base de datos
- Verifica los logs de Railway

## 📝 Notas Importantes

1. **SUPABASE_SERVICE_ROLE_KEY** es requerida para operaciones administrativas
2. **NEXT_PUBLIC_API_URL** debe apuntar al dominio de Railway en producción
3. Las variables de entorno se cargan automáticamente desde Railway
4. No commitees archivos `.env` al repositorio (están en `.gitignore`)
