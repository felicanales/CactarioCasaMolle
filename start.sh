#!/bin/bash

# Script de inicio para Railway
# Este script maneja las variables de entorno de Railway correctamente

echo "🚀 Starting Cactario Casa Molle application..."

# Verificar variables de entorno
echo "📋 Environment variables:"
echo "PORT: ${PORT:-8000}"
echo "NODE_ENV: ${NODE_ENV:-development}"

# Instalar dependencias de Python
echo "📦 Installing Python dependencies..."
cd fastapi && pip install -r requirements.txt && cd ..

# Instalar dependencias de Node.js
echo "📦 Installing Node.js dependencies..."
npm install

# Construir Next.js
echo "🏗️ Building Next.js application..."
npm run build

# Iniciar aplicaciones
echo "🚀 Starting applications..."
echo "FastAPI will run on port ${PORT:-8000}"
echo "Next.js will run on port 3001"

# Iniciar FastAPI en background
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
cd fastapi && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} &
FASTAPI_PID=$!

# Esperar un momento para que FastAPI se inicie
sleep 5

# Verificar que FastAPI esté funcionando
echo "🔍 Checking FastAPI health..."
curl -f http://localhost:${PORT:-8000}/health || echo "FastAPI health check failed"

# Iniciar Next.js
echo "🚀 Starting Next.js on port 3001..."
cd nextjs && npm start -- -p 3001 &
NEXTJS_PID=$!

# Esperar a que ambos procesos terminen
wait $FASTAPI_PID $NEXTJS_PID
