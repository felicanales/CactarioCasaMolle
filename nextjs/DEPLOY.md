# 🚀 Deploy en Vercel - Guía Completa

## 📋 Prerrequisitos

1. **Cuenta en Vercel**: [vercel.com](https://vercel.com) (gratis)
2. **Cuenta en GitHub**: Para conectar tu repositorio
3. **API desplegada**: Tu backend FastAPI debe estar funcionando

## 🔧 Pasos para el Deploy

### 1. Preparar el Repositorio

```bash
# Navegar al directorio del proyecto
cd CactarioCasaMolle

# Inicializar git si no está inicializado
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit: Next.js app ready for Vercel deploy"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/tu-usuario/cactario-casa-molle.git
git push -u origin main
```

### 2. Deploy en Vercel

#### Opción A: Desde la Web (Recomendado)

1. **Ir a [vercel.com](https://vercel.com)**
2. **Iniciar sesión** con tu cuenta de GitHub
3. **Click en "New Project"**
4. **Importar tu repositorio** de GitHub
5. **Configurar el proyecto**:
   - Framework Preset: **Next.js** (detectado automáticamente)
   - Root Directory: `nextjs` (porque tu app está en esa carpeta)
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### Opción B: Desde la Terminal

```bash
# Instalar Vercel CLI
npm i -g vercel

# Navegar al directorio de Next.js
cd nextjs

# Iniciar deploy
vercel

# Seguir las instrucciones en pantalla
```

### 3. Configurar Variables de Entorno

En el dashboard de Vercel:

1. **Ir a tu proyecto**
2. **Settings → Environment Variables**
3. **Agregar**:
   - `NEXT_PUBLIC_API_URL`: URL de tu API FastAPI desplegada
   - Ejemplo: `https://tu-api.vercel.app` o `https://tu-api.railway.app`

### 4. Configurar el Root Directory

Si tu app está en la carpeta `nextjs`:

1. **Settings → General**
2. **Root Directory**: `nextjs`
3. **Save**

## 🌐 URLs Resultantes

- **Frontend**: `https://tu-proyecto.vercel.app`
- **API**: `https://tu-api.vercel.app` (si también desplegas la API)

## 🔄 Deploy Automático

Una vez configurado:
- **Push a main**: Deploy automático
- **Pull requests**: Preview deployments
- **Ramas**: Deployments independientes

## 🐛 Solución de Problemas

### Error de Build
```bash
# Verificar que el build funciona localmente
cd nextjs
npm run build
```

### Variables de Entorno
- Asegúrate de que `NEXT_PUBLIC_` esté en el nombre
- Las variables sin `NEXT_PUBLIC_` no están disponibles en el cliente

### CORS Issues
- Configurar CORS en tu API FastAPI para permitir tu dominio de Vercel

## 📱 Dominio Personalizado (Opcional)

1. **Settings → Domains**
2. **Add Domain**
3. **Configurar DNS** según las instrucciones

## ✅ Verificación

1. **Visitar tu URL de Vercel**
2. **Probar el login**
3. **Verificar que la API responde**
4. **Comprobar en móvil**

¡Listo! Tu app estará pública en Vercel 🎉
