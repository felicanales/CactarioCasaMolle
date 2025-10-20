#!/bin/bash

# Script de inicio para el backend FastAPI en Railway
echo "🚀 Starting Cactario Casa Molle Backend on Railway..."

# Verificar variables de entorno críticas
echo "📋 Environment Variables:"
echo "PORT: ${PORT:-8000}"
echo "SUPABASE_URL: ${SUPABASE_URL:-not set}"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-not set}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-not set}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Verificar que Python esté disponible
echo "🔍 Checking Python environment..."
python3 --version || {
    echo "❌ Python3 not found"
    exit 1
}

pip --version || {
    echo "❌ pip not found"
    exit 1
}

# Instalar dependencias si es necesario
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt || {
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
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
echo "🔧 Using uvicorn with optimized settings for Railway..."

uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --log-level info \
    --access-log \
    --no-use-colors
