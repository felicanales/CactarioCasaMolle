#!/bin/bash

# Script optimizado para Railway con healthcheck
echo "🚀 Starting Cactario Casa Molle on Railway..."

# Verificar variables de entorno
echo "📋 Environment:"
echo "PORT: ${PORT:-8000}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Instalar dependencias de Python
echo "📦 Installing Python dependencies..."
cd fastapi
pip install -r requirements.txt
cd ..

# Instalar dependencias de Node.js
echo "📦 Installing Node.js dependencies..."
npm install

# Construir Next.js
echo "🏗️ Building Next.js..."
npm run build

# Función para verificar que FastAPI esté listo
wait_for_fastapi() {
    local port=${1:-8000}
    local max_attempts=30
    local attempt=1
    
    echo "🔍 Waiting for FastAPI to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ FastAPI is ready!"
            return 0
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts - FastAPI not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ FastAPI failed to start within timeout"
    return 1
}

# Iniciar FastAPI en background
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
cd fastapi
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} &
FASTAPI_PID=$!
cd ..

# Esperar a que FastAPI esté listo
wait_for_fastapi ${PORT:-8000}

if [ $? -eq 0 ]; then
    echo "🎉 FastAPI is ready and healthcheck should pass!"
    
    # Iniciar Next.js en background
    echo "🚀 Starting Next.js on port 3001..."
    cd nextjs
    npm start -- -p 3001 &
    NEXTJS_PID=$!
    cd ..
    
    # Mantener ambos procesos corriendo
    wait $FASTAPI_PID $NEXTJS_PID
else
    echo "❌ Failed to start FastAPI properly"
    exit 1
fi
