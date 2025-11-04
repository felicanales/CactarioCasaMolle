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
   - `fastapi/app/api/routes_photos.py` - Rutas de fotos sin autenticación (desactivada temporalmente)

2. **Frontend (Next.js)**:
   - `nextjs/src/middleware.js` - Bypassa el middleware de autenticación
   - `nextjs/src/app/context/AuthContext.jsx` - Omite la verificación de usuario
   - `nextjs/src/app/page.js` - Redirige directamente a /staff sin verificar login
   - `nextjs/src/app/species/page.jsx` - Desactiva redirección a login
   - `nextjs/src/app/staff/page.jsx` - Desactiva redirección a login
   - `nextjs/src/components/PhotoUploader.jsx` - Subida de fotos sin token
   - `nextjs/src/components/PhotoGallery.jsx` - Gestión de fotos sin token

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

#### 7. `fastapi/app/api/routes_photos.py`

**Modificado:**
- Removido `dependencies=[Depends(get_current_user)]` de los endpoints:
  - `POST /photos/{entity_type}/{entity_id}` - Subir fotos
  - `PUT /photos/{photo_id}` - Actualizar foto (marcar portada)
  - `DELETE /photos/{photo_id}` - Eliminar foto
- Actualizados comentarios para indicar "Acceso público (sin autenticación)"

**Efecto:** Los endpoints de fotos no requieren autenticación para operaciones de escritura.

#### 8. `fastapi/app/middleware/auth_middleware.py` (actualización)

**Agregado:**
- `/photos` agregado a la lista `skip_auth_paths`

**Efecto:** El middleware permite acceso a todas las rutas `/photos/*` sin validar token.

#### 9. `nextjs/src/components/PhotoUploader.jsx`

**Modificado:**
- Removido header `Authorization: Bearer ${token}` del request POST
- Removida validación de token antes de subir

**Efecto:** El componente sube fotos sin enviar token de autenticación.

#### 10. `nextjs/src/components/PhotoGallery.jsx`

**Modificado:**
- Removido header `Authorization: Bearer ${token}` de:
  - `handleSetCover()` (marcar como portada)
  - `handleDelete()` (eliminar foto)

**Efecto:** El componente gestiona fotos sin enviar token de autenticación.

## 🔄 Cómo Reactivar la Autenticación

### Sección Especial: Reactivar Autenticación en Rutas de Fotos

Las rutas de fotos fueron desactivadas temporalmente para permitir el desarrollo sin autenticación. Para reactivarlas:

#### Paso 1: Reactivar Autenticación en Backend

**Archivo:** `fastapi/app/api/routes_photos.py`

1. **Agregar dependencia de autenticación a los endpoints:**

```python
# Agregar import
from app.middleware.auth_middleware import get_current_user
from fastapi import Depends

# Modificar endpoints para requerir autenticación:

@router.post("/{entity_type}/{entity_id}", dependencies=[Depends(get_current_user)])
async def upload_photos(...):
    """
    Sube fotos para cualquier entidad.
    Requiere autenticación.
    """
    # ... código existente ...

@router.put("/{photo_id}", dependencies=[Depends(get_current_user)])
def update_photo(...):
    """
    Actualiza una foto (marcar como portada, cambiar orden, agregar descripción).
    Requiere autenticación.
    """
    # ... código existente ...

@router.delete("/{photo_id}", status_code=204, dependencies=[Depends(get_current_user)])
def delete_photo(...):
    """
    Elimina una foto (del storage y de la base de datos).
    Requiere autenticación.
    """
    # ... código existente ...
```

2. **Remover `/photos` de la lista de rutas sin autenticación:**

**Archivo:** `fastapi/app/middleware/auth_middleware.py`

```python
# Remover "/photos" de skip_auth_paths:
skip_auth_paths = [
    "/auth/request-otp",
    "/auth/verify-otp", 
    "/auth/refresh",
    "/auth/logout",
    "/auth/me",
    "/docs",
    "/openapi.json",
    "/health",
    "/debug"
    # "/photos"  <- REMOVER ESTA LÍNEA
]
```

**NOTA:** El endpoint `GET /photos/{entity_type}/{entity_id}` (listar fotos) puede permanecer público, ya que no requiere autenticación.

#### Paso 2: Reactivar Envío de Token en Frontend

**Archivo:** `nextjs/src/components/PhotoUploader.jsx`

1. **Restaurar función para obtener token** (si no existe):
```javascript
const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match) return match[2];
    return localStorage.getItem('access_token');
};
```

2. **Agregar header Authorization en handleUpload:**
```javascript
const handleUpload = async () => {
    // ... código existente ...
    
    const token = getAccessToken();
    if (!token) {
        setError("No estás autenticado. Por favor, inicia sesión.");
        return;
    }

    const response = await fetch(`${API}/photos/${entityType}/${entityId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
    });
    // ... resto del código ...
};
```

**Archivo:** `nextjs/src/components/PhotoGallery.jsx`

1. **Agregar header Authorization en handleSetCover:**
```javascript
const handleSetCover = async (photoId) => {
    try {
        const token = getAccessToken();
        if (!token) {
            console.error('No hay token de autenticación');
            return;
        }

        const API = getApiUrl();
        const response = await fetch(`${API}/photos/${photoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                is_cover: 'true'
            }),
            credentials: 'include'
        });
        // ... resto del código ...
    }
};
```

2. **Agregar header Authorization en handleDelete:**
```javascript
const handleDelete = async (photoId) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return;

    try {
        const token = getAccessToken();
        if (!token) {
            console.error('No hay token de autenticación');
            return;
        }

        const API = getApiUrl();
        const response = await fetch(`${API}/photos/${photoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        // ... resto del código ...
    }
};
```

#### Paso 3: Verificar que la Autenticación Funciona en Fotos

1. **Intentar subir una foto sin autenticación:**
   - Debe retornar error 401 (Unauthorized)
   - Debe mostrar mensaje de error

2. **Iniciar sesión y luego subir foto:**
   - Debe permitir la subida exitosa
   - Debe mostrar mensaje de éxito

3. **Probar marcar foto como portada:**
   - Sin autenticación: debe fallar
   - Con autenticación: debe funcionar

4. **Probar eliminar foto:**
   - Sin autenticación: debe fallar
   - Con autenticación: debe funcionar

## 🔄 Cómo Reactivar la Autenticación (General)

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
   - `fastapi/app/api/routes_photos.py` - Restaurar dependencias de autenticación
   - `nextjs/src/middleware.js` - Líneas con `BYPASS_AUTH`
   - `nextjs/src/app/context/AuthContext.jsx` - Líneas con `BYPASS_AUTH`
   - `nextjs/src/app/page.js` - Verificaciones de `BYPASS_AUTH`
   - `nextjs/src/app/species/page.jsx` - Verificaciones de `BYPASS_AUTH`
   - `nextjs/src/app/staff/page.jsx` - Verificaciones de `BYPASS_AUTH`
   - `nextjs/src/components/PhotoUploader.jsx` - Restaurar envío de token
   - `nextjs/src/components/PhotoGallery.jsx` - Restaurar envío de token

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

### Checklist General
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

### Checklist Específico para Rutas de Fotos
- [ ] **Restaurar** `dependencies=[Depends(get_current_user)]` en `routes_photos.py`:
  - [ ] `POST /photos/{entity_type}/{entity_id}`
  - [ ] `PUT /photos/{photo_id}`
  - [ ] `DELETE /photos/{photo_id}`
- [ ] **Remover** `/photos` de `skip_auth_paths` en `auth_middleware.py`
- [ ] **Restaurar** envío de token en `PhotoUploader.jsx`:
  - [ ] Agregar validación de token antes de subir
  - [ ] Agregar header `Authorization: Bearer ${token}`
- [ ] **Restaurar** envío de token en `PhotoGallery.jsx`:
  - [ ] Agregar token en `handleSetCover()`
  - [ ] Agregar token en `handleDelete()`
- [ ] **Probar** subida de fotos sin autenticación (debe fallar con 401)
- [ ] **Probar** subida de fotos con autenticación (debe funcionar)
- [ ] **Probar** marcar foto como portada (con autenticación)
- [ ] **Probar** eliminar foto (con autenticación)

---

## 📞 Contacto

Para cualquier duda sobre la reactivación de autenticación, consultar este documento o revisar los comentarios en el código marcados con `BYPASS AUTH`.

