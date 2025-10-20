#!/bin/bash

# Script de inicio robusto para el backend FastAPI en Railway
echo "🚀 Starting Cactario Casa Molle Backend on Railway..."

# Verificar variables de entorno críticas
echo "📋 Environment Variables:"
echo "PORT: ${PORT:-8000}"
echo "SUPABASE_URL: ${SUPABASE_URL:-not set}"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-not set}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-not set}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Función para validar y establecer PORT
setup_port() {
    # Si PORT no está definido, usar 8000
    if [ -z "$PORT" ]; then
        PORT=8000
        echo "⚠️  PORT not set, using default: $PORT"
    fi
    
    # Validar que PORT sea un número
    if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
        echo "❌ PORT is not a valid integer: '$PORT'"
        echo "🔧 Using default port: 8000"
        PORT=8000
    fi
    
    # Validar que PORT esté en rango válido
    if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo "❌ PORT is out of valid range (1-65535): $PORT"
        echo "🔧 Using default port: 8000"
        PORT=8000
    fi
    
    echo "✅ Using PORT: $PORT"
    export PORT
}

# Configurar PORT
setup_port

# Verificar que Python esté disponible
echo "🔍 Checking Python environment..."
python3 --version || {
    echo "❌ Python3 not found"
    exit 1
}

# Verificar que pip esté disponible
echo "🔍 Checking pip availability..."
python3 -m pip --version || {
    echo "❌ pip not available, trying to install..."
    python3 -m ensurepip --upgrade || {
        echo "❌ Failed to install pip"
        exit 1
    }
}

# Instalar dependencias si es necesario
echo "📦 Installing Python dependencies..."
echo "🔍 Checking pip availability..."
python3 -m pip --version || {
    echo "❌ pip not available, trying to install..."
    python3 -m ensurepip --upgrade || {
        echo "❌ Failed to install pip"
        exit 1
    }
}

echo "📦 Installing dependencies with pip..."
python3 -m pip install -r requirements.txt || {
    echo "❌ Failed to install dependencies"
    exit 1
}

# Verificar que las dependencias estén instaladas
echo "🔍 Checking if dependencies are installed..."
python3 -c "import fastapi, uvicorn" && echo "✅ FastAPI and uvicorn available" || {
    echo "❌ FastAPI dependencies not available"
    exit 1
}

# Verificar configuración de Supabase
echo "🔍 Checking Supabase configuration..."
python3 -c "
import os
from app.core.supabase_auth import get_public, get_service
try:
    sb_public = get_public()
    sb_service = get_service()
    print('✅ Supabase clients configured successfully')
except Exception as e:
    print(f'❌ Supabase configuration error: {e}')
    exit(1)
" || {
    echo "❌ Supabase configuration failed"
    exit 1
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

# Iniciar FastAPI
echo "🚀 Starting FastAPI on port $PORT..."
echo "🔧 Using uvicorn with optimized settings for Railway..."

# Usar python -m uvicorn para mayor compatibilidad
python3 -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port $PORT \
    --workers 1 \
    --log-level info \
    --access-log \
    --no-use-colors
