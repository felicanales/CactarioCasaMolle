#!/bin/bash

# Script optimizado para Railway con manejo mejorado de timeout
echo "🚀 Starting Cactario Casa Molle on Railway (Optimized)..."

# Configurar timeout de healthcheck
export RAILWAY_HEALTHCHECK_TIMEOUT_SEC=600

# Verificar variables de entorno
echo "📋 Environment Variables:"
echo "PORT: ${PORT:-8000}"
echo "RAILWAY_HEALTHCHECK_TIMEOUT_SEC: ${RAILWAY_HEALTHCHECK_TIMEOUT_SEC}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Función para verificar que FastAPI esté listo
wait_for_fastapi() {
    local port=${1:-8000}
    local max_attempts=60  # 60 intentos x 5 segundos = 5 minutos
    local attempt=1
    
    echo "🔍 Waiting for FastAPI to be ready on port $port..."
    echo "⏱️  Maximum wait time: $((max_attempts * 5)) seconds"
    
    while [ $attempt -le $max_attempts ]; do
        echo "⏳ Attempt $attempt/$max_attempts - Checking FastAPI health..."
        
        if curl -f -s --connect-timeout 5 --max-time 10 http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ FastAPI is ready and responding!"
            echo "🎉 Healthcheck endpoint is active!"
            return 0
        fi
        
        echo "⏳ FastAPI not ready yet, waiting 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "❌ FastAPI failed to start within timeout ($((max_attempts * 5)) seconds)"
    echo "🔍 Checking if FastAPI process is running..."
    ps aux | grep uvicorn || echo "No uvicorn process found"
    return 1
}

# Cambiar al directorio fastapi
echo "📁 Changing to fastapi directory..."
cd fastapi

# Verificar que Python y pip estén disponibles
echo "🔍 Checking Python environment..."
python3 --version || echo "❌ Python3 not found"
pip --version || echo "❌ pip not found"

# Las dependencias ya deberían estar instaladas por Nixpacks
echo "📦 Python dependencies should be installed by Nixpacks..."

# Iniciar FastAPI en background
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
echo "🔧 Using uvicorn with optimized settings for Railway..."

# Iniciar FastAPI con configuración optimizada
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --log-level info \
    --access-log \
    --no-use-colors &
    
FASTAPI_PID=$!

echo "🔄 FastAPI started with PID: $FASTAPI_PID"

# Esperar a que FastAPI esté listo
wait_for_fastapi ${PORT:-8000}

if [ $? -eq 0 ]; then
    echo "🎉 SUCCESS: FastAPI is ready and healthcheck should pass!"
    echo "🔍 FastAPI is responding on port ${PORT:-8000}"
    echo "✅ Healthcheck endpoint /health is active"
    
    # Mantener el proceso corriendo
    echo "🔄 Keeping FastAPI running..."
    wait $FASTAPI_PID
else
    echo "❌ FAILED: FastAPI did not start properly"
    echo "🔍 Checking logs for errors..."
    
    # Matar el proceso si no está funcionando
    if kill -0 $FASTAPI_PID 2>/dev/null; then
        echo "🔄 Killing FastAPI process..."
        kill $FASTAPI_PID
    fi
    
    exit 1
fi
