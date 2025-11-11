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
NODE_ENV=production
PORT=3000
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

### Railway (recomendado)

1. **Repositorio actualizado**  
   - Verifica que la rama `main` tenga la app (`npm run build` debe completar sin errores).  
   - Sube los cambios a GitHub.

2. **Crear servicio**  
   - En tu proyecto Railway existente, haz clic en `New → Service → Deploy from GitHub`.  
   - Selecciona el repositorio y la carpeta `mobile`.

3. **Variables de entorno (`Settings → Variables`)**  
   ```json
   {
     "NODE_ENV": "production",
     "PORT": "3000",
     "NEXT_PUBLIC_API_URL": "https://tu-backend.railway.app"
   }
   ```
   Ajusta `NEXT_PUBLIC_API_URL` a la URL real del backend público.

4. **Comandos**  
   - Build: `npm install && npm run build`  
   - Start (override recomendado): `next start -p $PORT`  
     - Si prefieres usar el script existente (`npm run start`, que utiliza el puerto 3002), define `PORT=3002` o actualiza el script para leer la variable.

5. **Deploy**  
   - Ejecuta `Deploy` y espera a que el build termine.  
   - Abre el dominio generado por Railway para validar.

6. **Auto deploy opcional**  
   - Activa `Settings → Deployments → Auto Deploy` para que cada push redeploye automáticamente.

### Otros proveedores
- **Vercel**: Deploy automático desde GitHub.
- **Netlify**: Deploy desde Git.

## 📝 Notas

- La app está optimizada para dispositivos móviles
- El escáner QR requiere permisos de cámara
- Los datos se cargan desde el backend FastAPI
- Se incluyen placeholders para desarrollo cuando el backend no está disponible

