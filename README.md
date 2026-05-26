# Cactario Casa Molle

Sistema de gestión de cactáceas para el hotel Casa Molle. Permite al staff administrar el inventario del cactario (especies, sectores, ejemplares, fotos, compras) y a los huéspedes explorar las plantas escaneando códigos QR con su celular.

El sistema consta de tres servicios independientes conectados a una sola base de datos Supabase, desplegados en Railway.

---

## Stack tecnológico

| Servicio | Tecnología | Puerto dev |
|----------|-----------|-----------|
| WMS Staff (`nextjs/`) | Next.js 15 · React 19 · Bootstrap 5 | 3000 |
| App Pública (`mobile/`) | Next.js 15 · React 19 · html5-qrcode | 3002 |
| Backend API (`fastapi/`) | FastAPI 0.119 · Python 3.9+ | 8000 |
| Base de datos | Supabase (PostgreSQL + Auth) | — |
| Storage de imágenes | Cloudflare R2 (+ Supabase Storage fallback) | — |
| Infraestructura | Railway (CI/CD automático desde GitHub) | — |

---

## Estructura del proyecto

```
CactarioCasaMolle/
├── fastapi/              # Backend API (FastAPI)
│   └── app/
│       ├── api/          # Rutas (routes_*.py) — /public y /staff
│       ├── services/     # Lógica de negocio (*_service.py)
│       ├── core/         # Supabase clients, JWT, storage router
│       └── middleware/   # Auth middleware, rate limiter
├── nextjs/               # WMS Staff (panel de administración)
│   └── src/
│       ├── app/          # Páginas (login, species, sectors, inventory, audit)
│       ├── components/   # PhotoUploader, PhotoGallery, AuthenticatedImage
│       ├── hooks/        # useSpecies, useSectors, useEjemplares
│       └── utils/        # api-config, auth-helpers, images
├── mobile/               # App pública (huéspedes)
│   └── src/
│       ├── app/          # Páginas (home, qr, sectores/[qrCode], especies/[slug])
│       └── components/   # Header, BottomNavigation, ImageCarousel
├── docs/                 # Documentación técnica del proyecto
│   ├── architecture.md   # Diagramas C4 completos (Mermaid)
│   ├── database.md       # Modelo ER de Supabase
│   ├── api-reference.md  # Todos los endpoints de la API
│   ├── deployment.md     # Variables de entorno y setup Railway
│   └── security.md       # Flujo de auth, RLS, cookies, CORS
└── agregar_usuario.sql   # Script para registrar nuevos usuarios del staff
```

---

## Inicio rápido (desarrollo local)

```bash
# 1. Instalar dependencias
cd nextjs && npm install
cd ../mobile && npm install
cd ../fastapi && pip install -r requirements.txt

# 2. Configurar variables de entorno
# Crear fastapi/.env, nextjs/.env.local y mobile/.env.local
# Ver docs/deployment.md para la lista completa de variables

# 3. Levantar todos los servicios
cd ..  # volver a CactarioCasaMolle/
npm run start:all

# O individualmente:
npm run dev:nextjs     # http://localhost:3000
npm run dev:mobile     # http://localhost:3002
npm run start:fastapi  # http://localhost:8000
```

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/architecture.md](docs/architecture.md) | Diagramas C4 L1/L2/L3 con Mermaid, flujos de datos principales |
| [docs/database.md](docs/database.md) | Modelo ER completo, descripción de tablas, ENUMs |
| [docs/api-reference.md](docs/api-reference.md) | Todos los endpoints: método, auth, parámetros, respuestas |
| [docs/deployment.md](docs/deployment.md) | Variables de entorno, setup Railway, gestión de usuarios |
| [docs/security.md](docs/security.md) | Flujo de auth OTP, JWT, cookies, RLS, CORS |

---

## Agregar un usuario del staff

El sistema usa una whitelist: solo los emails en la tabla `usuarios` con `active = true` pueden hacer login. Para agregar uno:

```bash
# Abrir SQL Editor en Supabase Dashboard y ejecutar:
SELECT * FROM public.insert_usuario_admin(
    'email@casamolle.cl',   -- email del usuario
    'username_unico',        -- username único
    'Nombre Apellido'        -- nombre completo (opcional)
);
```

Ver instrucciones completas en [docs/deployment.md](docs/deployment.md).
