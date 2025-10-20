#!/bin/bash

# Script final optimizado para Railway que resuelve pip y healthcheck
echo "🚀 Starting Cactario Casa Molle on Railway (Final Optimized)..."

# Configurar timeout de healthcheck
export RAILWAY_HEALTHCHECK_TIMEOUT_SEC=${RAILWAY_HEALTHCHECK_TIMEOUT_SEC:-600}
echo "Configured RAILWAY_HEALTHCHECK_TIMEOUT_SEC: $RAILWAY_HEALTHCHECK_TIMEOUT_SEC"

# Verificar variables de entorno críticas
echo "📋 Environment Variables:"
echo "PORT: ${PORT:-8000}"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "RAILWAY_PUBLIC_DOMAIN: ${RAILWAY_PUBLIC_DOMAIN:-not set}"

# Función para verificar que FastAPI esté listo
wait_for_fastapi() {
    local port=${1:-8000}
    local max_attempts=60  # 5 minutos máximo (60 * 5 segundos)
    local attempt=1
    
    echo "🔍 Waiting for FastAPI to be ready on port $port (max $max_attempts attempts)..."
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s --connect-timeout 5 --max-time 10 http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ FastAPI is ready and responding on port $port!"
            return 0
        fi
        echo "⏳ Attempt $attempt/$max_attempts: FastAPI not ready yet. Retrying in 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    echo "❌ FastAPI did not become ready within the timeout."
    return 1
}

# Verificar que Python esté disponible
echo "🔍 Checking Python environment..."
python3 --version || {
    echo "❌ Python3 not found - this should not happen with Nixpacks"
    exit 1
}

pip --version || {
    echo "❌ pip not found - this should not happen with Nixpacks"
    exit 1
}

# Cambiar al directorio fastapi
echo "📁 Changing to fastapi directory..."
cd fastapi

# Verificar que las dependencias estén instaladas
echo "📦 Checking if Python dependencies are installed..."
python3 -c "import fastapi, uvicorn" && echo "✅ FastAPI and uvicorn available" || {
    echo "❌ FastAPI dependencies not available - trying to install..."
    pip install -r requirements.txt || {
        echo "❌ Failed to install Python dependencies"
        exit 1
    }
}

# Verificar que el endpoint /health esté disponible
echo "🔍 Checking if /health endpoint is configured..."
python3 -c "
import sys
sys.path.append('.')
from app.main import app
routes = [route.path for route in app.routes]
if '/health' in routes:
    print('✅ /health endpoint is configured')
else:
    print('❌ /health endpoint not found')
    sys.exit(1)
" || {
    echo "❌ /health endpoint not properly configured"
    exit 1
}

# Iniciar FastAPI en background
echo "🚀 Starting FastAPI on port ${PORT:-8000} in background..."
echo "🔧 Using uvicorn with optimized settings for Railway..."

# Usar el puerto de Railway
FASTAPI_PORT=${PORT:-8000}

# Iniciar FastAPI con configuración optimizada
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port $FASTAPI_PORT \
    --workers 1 \
    --log-level info \
    --access-log \
    --no-use-colors &
FASTAPI_PID=$!

echo "FastAPI started with PID: $FASTAPI_PID"

# Función para cleanup al salir
cleanup() {
    echo "🧹 Cleaning up processes..."
    if [ ! -z "$FASTAPI_PID" ]; then
        kill $FASTAPI_PID 2>/dev/null || true
        echo "FastAPI process terminated"
    fi
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGTERM SIGINT

# Esperar a que FastAPI esté listo
if ! wait_for_fastapi $FASTAPI_PORT; then
    echo "❌ FastAPI failed to start properly. Exiting."
    cleanup
    exit 1
fi

echo "✅ All services started successfully!"
echo "🌐 FastAPI is running on port $FASTAPI_PORT"
echo "🔍 Health endpoint available at: http://localhost:$FASTAPI_PORT/health"

# Mantener el proceso corriendo
echo "🔄 Keeping the process alive..."
wait $FASTAPI_PID
