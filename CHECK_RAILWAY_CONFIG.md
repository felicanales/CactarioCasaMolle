# 🚨 Verificación Urgente: Error 502 Bad Gateway

## ❌ Error Actual:
```
Failed to load resource: the server responded with a status of 502 ()
```

---

## 🔍 Diagnóstico del Problema:

El error **502 Bad Gateway** puede ser causado por:

1. ❌ Backend no está respondiendo
2. ❌ URL del backend incorrecta
3. ❌ CORS bloqueando la comunicación
4. ❌ Backend crasheó o está reiniciándose
5. ❌ Variable de entorno `NEXT_PUBLIC_API_URL` no configurada

---

## ✅ PASOS INMEDIATOS A VERIFICAR:

### 1. **Verifica que el Backend esté Activo**

En Railway, ve al servicio **Backend** y verifica:

- [ ] Estado: **"Healthy"** (verde)
- [ ] Logs: No debe haber errores recientes
- [ ] URL: `https://cactario-backend-production.up.railway.app`

**Prueba manualmente:**
```
https://cactario-backend-production.up.railway.app/health
```

**Debe responder:**
```json
{
  "status": "ok",
  "message": "Service is healthy",
  "service": "Cactario Casa Molle API"
}
```

---

### 2. **Verifica Variables de Entorno del FRONTEND**

En Railway → **Frontend Service** → **Variables**:

#### ✅ Debe tener:
```bash
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app
NODE_ENV=production
```

#### ⚠️ Si NO tiene `NEXT_PUBLIC_API_URL`:

**Agrégala ahora:**
1. Ve a Frontend Service → Settings → Variables
2. Click "+ New Variable"
3. Key: `NEXT_PUBLIC_API_URL`
4. Value: `https://cactario-backend-production.up.railway.app`
5. Click "Add"
6. **IMPORTANTE:** Redeploy el frontend después de agregar la variable

---

### 3. **Verifica Variables de Entorno del BACKEND**

En Railway → **Backend Service** → **Variables**:

#### ✅ Debe tener:
```bash
PORT=(auto-generado por Railway)
SUPABASE_URL=tu-supabase-url
SUPABASE_ANON_KEY=tu-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-supabase-service-role-key
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app,https://cactario-backend-production.up.railway.app
```

#### ⚠️ Verifica especialmente `CORS_ORIGINS`:

Debe incluir la URL exacta del frontend. Si no está configurado, agrega:

```bash
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app
```

Y redeploy el backend.

---

### 4. **Verifica en la Consola del Navegador**

Abre tu frontend en el navegador y presiona **F12** para abrir DevTools:

#### En la pestaña "Console" busca:

```
[AuthContext] Using API URL: https://cactario-backend-production.up.railway.app
```

#### En la pestaña "Network":

1. Recarga la página
2. Busca la request a `/auth/me`
3. Click en ella
4. Verifica:
   - **URL completa**: ¿Es correcta?
   - **Status Code**: ¿502, 500, 404, CORS error?
   - **Response**: ¿Qué mensaje devuelve?

**Copia aquí los detalles de la request fallida:**
- URL completa: _________________
- Status Code: _________________
- Response Headers: _________________
- Response Body: _________________

---

### 5. **Verifica Backend Health desde el Navegador**

Abre directamente:
```
https://cactario-backend-production.up.railway.app/health
```

#### ✅ Si funciona:
Deberías ver JSON con `"status": "ok"`

#### ❌ Si NO funciona:
- Puede ser un problema con el backend
- Revisa logs del backend en Railway
- El backend puede estar crasheando

---

### 6. **Verifica CORS en el Backend**

Abre:
```
https://cactario-backend-production.up.railway.app/debug/environment
```

Busca en la respuesta:
```json
{
  "cors_origins": ["..."]
}
```

Verifica que incluya tu URL del frontend.

---

## 🔧 SOLUCIONES RÁPIDAS:

### Si el backend está caído:
```bash
# En Railway Backend Service
Settings → Redeploy
```

### Si falta NEXT_PUBLIC_API_URL:
```bash
# En Railway Frontend Service → Variables
NEXT_PUBLIC_API_URL=https://cactario-backend-production.up.railway.app

# Luego redeploy frontend
```

### Si hay error de CORS:
```bash
# En Railway Backend Service → Variables
CORS_ORIGINS=https://cactario-frontend-production.up.railway.app

# Luego redeploy backend
```

---

## 📊 Checklist de Verificación:

Marca lo que ya verificaste:

- [ ] Backend está "Healthy" en Railway
- [ ] `/health` endpoint del backend responde
- [ ] Frontend tiene `NEXT_PUBLIC_API_URL` configurada
- [ ] Backend tiene `CORS_ORIGINS` con la URL del frontend
- [ ] Consola del navegador muestra la API URL correcta
- [ ] Network tab muestra qué request exacta está fallando
- [ ] Backend logs no muestran errores

---

## 🆘 INFORMACIÓN QUE NECESITO:

Para ayudarte mejor, comparte:

1. **URL completa** que está fallando con 502 (desde Network tab)
2. **Logs del backend** (últimas 20 líneas)
3. **Variables de entorno** del frontend (sin valores secretos, solo las keys)
4. **¿El endpoint `/health` del backend funciona?** (pruébalo en el navegador)

---

**Prioridad máxima: Verifica que `NEXT_PUBLIC_API_URL` esté configurada en el frontend de Railway.**

Esta variable DEBE estar configurada para que el frontend sepa dónde está el backend.

