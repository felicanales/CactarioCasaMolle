# 🌵 Cactuario CasaMolle - App Móvil

Aplicación web móvil para visitantes del Cactuario CasaMolle. Permite explorar sectores, especies y escanear códigos QR.

## 🚀 Características

- **Home**: Página de bienvenida con carrusel de fotos e información
- **QR Scanner**: Escáner de códigos QR para acceder directamente a sectores
- **Sectores**: Lista de todos los sectores del cactuario
- **Especies por Sector**: Visualización de especies presentes en un sector
- **Detalle de Especie**: Información detallada con fotos y descripción

## 🛠️ Tecnologías

- **Next.js 15.5.5**: Framework React
- **React 19.1.0**: Biblioteca UI
- **Axios**: Cliente HTTP
- **html5-qrcode**: Escáner de códigos QR

## 📋 Prerrequisitos

- Node.js >= 18.0.0
- npm o yarn

## 🔧 Instalación

```bash
cd mobile
npm install
```

## 🚀 Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3002`

## ⚙️ Configuración

Crea un archivo `.env.local` en la carpeta `mobile`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

En producción, configura la URL del backend:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

## 📱 Estructura del Proyecto

```
mobile/
├── src/
│   ├── app/
│   │   ├── page.js                    # Home
│   │   ├── qr/
│   │   │   └── page.jsx               # QR Scanner
│   │   ├── sectores/
│   │   │   ├── page.jsx               # Lista de sectores
│   │   │   └── [qrCode]/
│   │   │       └── especies/
│   │   │           └── page.jsx       # Especies en sector
│   │   └── especies/
│   │       └── [slug]/
│   │           └── page.jsx           # Detalle de especie
│   ├── components/
│   │   ├── Header.jsx                  # Header compartido
│   │   └── BottomNavigation.jsx       # Navegación inferior
│   ├── utils/
│   │   └── api.js                      # Cliente API
│   └── globals.css                    # Estilos globales
├── package.json
└── next.config.mjs
```

## 🎨 Diseño

La aplicación sigue un diseño móvil-first con:

- **Header**: Fondo marrón oscuro (#6B5A4F) con logo y título
- **Contenido**: Fondo blanco con scroll vertical
- **Footer**: Navegación inferior con botones Home, QR lector, Sectores
- **Colores**: Paleta tierra con marrón, beige y blanco

## 🔌 API Endpoints Utilizados

- `GET /sectors/public` - Lista de sectores
- `GET /sectors/public/{qr_code}` - Detalle de sector por QR
- `GET /sectors/public/{qr_code}/species` - Especies de un sector
- `GET /species/public` - Lista de especies
- `GET /species/public/{slug}` - Detalle de especie

## 📦 Build para Producción

```bash
npm run build
npm start
```

## 🌐 Despliegue

La app puede desplegarse en:
- **Vercel**: Deploy automático desde GitHub
- **Railway**: Similar al frontend principal
- **Netlify**: Deploy desde Git

## 📝 Notas

- La app está optimizada para dispositivos móviles
- El escáner QR requiere permisos de cámara
- Los datos se cargan desde el backend FastAPI
- Se incluyen placeholders para desarrollo cuando el backend no está disponible

