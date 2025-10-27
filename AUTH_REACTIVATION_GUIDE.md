# Guía de Reactivación de Autenticación

Este documento explica cómo reactivar la autenticación después de haber trabajado en modo de desarrollo sin autenticación.

## ⚠️ Estado Actual del Sistema

**IMPORTANTE:** Por defecto, el sistema tiene la autenticación **DESACTIVADA** tanto en desarrollo como en producción.

- ✅ Backend: Bypass de autenticación activado (`BYPASS_AUTH=true` por defecto)
- ✅ Frontend: Bypass de autenticación activado (`NEXT_PUBLIC_BYPASS_AUTH=true` por defecto)
- ✅ Producción (Railway): Sin autenticación por defecto
- ✅ Desarrollo local: Sin autenticación por defecto

**Para más detalles sobre cómo activar/desactivar la autenticación, ver:**
- `COMO_DESACTIVAR_AUTH_PRODUCCION.md` - Instrucciones completas de configuración

---

## 📋 Resumen de Cambios Realizados

Para permitir el desarrollo del frontend sin autenticación, se implementó un sistema de "bypass" controlado por variables de entorno. Los cambios fueron mínimos y están claramente marcados en el código con comentarios `# BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN`.

### Archivos Modificados

1. **Backend (FastAPI)**:
   - `fastapi/app/middleware/auth_middleware.py` - Agrega lógica de bypass de autenticación

2. **Frontend (Next.js)**:
   - `nextjs/src/middleware.js` - Bypassa el middleware de autenticación
   - `nextjs/src/app/context/AuthContext.jsx` - Omite la verificación de usuario
   - `nextjs/src/app/page.js` - Redirige directamente a /staff sin verificar login
   - `nextjs/src/app/species/page.jsx` - Desactiva redirección a login
   - `nextjs/src/app/staff/page.jsx` - Desactiva redirección a login

### Detalles de Cambios por Archivo

#### 1. `fastapi/app/middleware/auth_middleware.py`

**Agregado:**
- Variable `BYPASS_AUTH = os.getenv("BYPASS_AUTH", "").lower() == "true"`
- En `dispatch()`: Si `BYPASS_AUTH=True`, retorna usuario mock inmediatamente
- En `get_current_user()`: Si `BYPASS_AUTH=True`, retorna usuario mock sin validar

**Efecto:** El backend acepta todas las peticiones sin validar tokens JWT.

#### 2. `nextjs/src/middleware.js`

**Agregado:**
- Constante `BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`
- Condición que retorna inmediatamente si `BYPASS_AUTH` es true
- Configuración dinámica del matcher (vacío si bypass está activo)

**Efecto:** El middleware de Next.js no redirige rutas protegidas al login.

#### 3. `nextjs/src/app/context/AuthContext.jsx`

**Agregado:**
- Constante `BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`
- En `useEffect`: Si `BYPASS_AUTH`, establece usuario mock y omite fetch inicial

**Efecto:** El contexto de autenticación asume que siempre hay un usuario logueado.

#### 4. `nextjs/src/app/species/page.jsx`

**Agregado:**
- Constante `BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`
- En `useEffect` de verificación: Omite redirección si `BYPASS_AUTH`
- En manejo de errores 401: Solo redirige si NO está en bypass

**Efecto:** La página no redirige al login, permitiendo navegación libre.

#### 5. `nextjs/src/app/staff/page.jsx`

**Agregado:**
- Constante `BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false"`
- En `useEffect`: Omite redirección si `BYPASS_AUTH`

**Efecto:** El dashboard de staff es accesible sin autenticación.

#### 6. `nextjs/src/app/page.js`

**Agregado:**
- Constante `BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false"`
- En `useEffect`: Si `BYPASS_AUTH`, redirige directamente a `/staff` sin verificar usuario

**Efecto:** La página raíz redirige directamente al dashboard sin pasar por login.

## 🔄 Cómo Reactivar la Autenticación

### Paso 1: Configurar Variables de Entorno

**IMPORTANTE:** Por defecto, el bypass está **ACTIVADO**. No requiere archivos .env para funcionar en desarrollo local.

#### Backend - Crear o editar `fastapi/.env`:

```bash
# Desactivar bypass de autenticación
BYPASS_AUTH=false

# Asegurarse de que las siguientes variables estén configuradas:
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
```

#### Frontend - Crear o editar `nextjs/.env.local`:

```bash
# Desactivar bypass de autenticación
NEXT_PUBLIC_BYPASS_AUTH=false

# Si es necesario, configurar la URL del API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**NOTA:** Si NO existe el archivo `.env` o `.env.local`, el bypass estará activado por defecto.

### Paso 2: Reiniciar los Servidores

**Backend (FastAPI)**:
```bash
cd fastapi
# Reiniciar el servidor FastAPI
```

**Frontend (Next.js)**:
```bash
cd nextjs
npm run dev
```

### Paso 3: Verificar que la Autenticación Funciona

1. Intentar acceder a una ruta protegida (ej: `/species`)
2. Debería redirigir automáticamente a `/login`
3. Al iniciar sesión con OTP, debería permitir el acceso
4. Las cookies de sesión deberían configurarse correctamente

## 🔍 Verificación del Sistema

### Endpoints de Prueba

**Backend**:
- `GET /auth/me` - Debe retornar usuario autenticado o `{"authenticated": false}`
- `GET /species/staff` - Debe requerir autenticación
- `GET /docs` - Interfaz Swagger para probar endpoints

**Frontend**:
- Intentar acceder a `/login` - Debe funcionar sin autenticación
- Intentar acceder a `/species` - Debe requerir autenticación
- Después de login - Debe permitir acceso a rutas protegidas

## 📝 Notas Importantes

### Para Desarrollo Local

Si en el futuro quieres trabajar nuevamente sin autenticación, simplemente:

1. Cambiar `BYPASS_AUTH=true` en `fastapi/.env`
2. Cambiar `NEXT_PUBLIC_BYPASS_AUTH=true` en `nextjs/.env.local`
3. Reiniciar ambos servidores

### Para Producción

**NUNCA** configures `BYPASS_AUTH=true` o `NEXT_PUBLIC_BYPASS_AUTH=true` en producción. En entornos de producción (Railway, Vercel, etc.):

1. No configurar estas variables de entorno (serán `false` por defecto)
2. O explícitamente configurarlas como `false`
3. Asegurarse de que todas las variables de Supabase estén correctamente configuradas

### Limpieza del Código (Opcional)

Si deseas remover completamente el código de bypass después de la reactivación:

1. **Buscar y remover** todos los bloques marcados con:
   - `# BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN`
   - `# BYPASS: `
   - `const BYPASS_AUTH = ...`

2. **Archivos a limpiar**:
   - `fastapi/app/middleware/auth_middleware.py` - Líneas con `BYPASS_AUTH`
   - `nextjs/src/middleware.js` - Líneas con `BYPASS_AUTH`
   - `nextjs/src/app/context/AuthContext.jsx` - Líneas con `BYPASS_AUTH`
   - `nextjs/src/app/page.js` - Verificaciones de `BYPASS_AUTH`
   - `nextjs/src/app/species/page.jsx` - Verificaciones de `BYPASS_AUTH`
   - `nextjs/src/app/staff/page.jsx` - Verificaciones de `BYPASS_AUTH`

## ⚠️ Troubleshooting

### Error: "Token de autenticación no encontrado"

- Verificar que `BYPASS_AUTH=false` en el backend
- Verificar que las cookies se están enviando correctamente
- Revisar la consola del navegador para errores de CORS

### Error: "Usuario no autenticado"

- Verificar que el frontend está enviando el token en el header Authorization
- Verificar que las cookies de sesión están configuradas correctamente
- Revisar que el usuario existe en la base de datos de Supabase

### Error: CORS en desarrollo local

- Verificar que el backend permite el origen del frontend (localhost:3000 o 3001)
- Verificar que `allow_credentials=True` en el CORS middleware
- Revisar que las cookies tienen el flag `SameSite=lax`

## ✅ Checklist de Reactivación

- [ ] **Crear** archivo `fastapi/.env` con `BYPASS_AUTH=false`
- [ ] **Crear** archivo `nextjs/.env.local` con `NEXT_PUBLIC_BYPASS_AUTH=false`
- [ ] Configurar todas las variables de Supabase en `fastapi/.env`
- [ ] Configurar `NEXT_PUBLIC_API_URL` en `nextjs/.env.local` si es necesario
- [ ] Reiniciar servidor FastAPI
- [ ] Reiniciar servidor Next.js
- [ ] Probar login con OTP
- [ ] Verificar que las rutas protegidas redirigen correctamente
- [ ] Verificar que las operaciones CRUD funcionan con autenticación
- [ ] Probar logout y re-login
- [ ] Verificar que las cookies se configuran correctamente

---

## 📞 Contacto

Para cualquier duda sobre la reactivación de autenticación, consultar este documento o revisar los comentarios en el código marcados con `BYPASS AUTH`.

