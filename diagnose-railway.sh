#!/bin/bash

# Script de diagnóstico para Railway
echo "🔍 Railway Deployment Diagnosis Script"
echo "======================================"

# Verificar variables de entorno
echo "📋 Environment Variables:"
echo "PORT: ${PORT:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "RAILWAY_PUBLIC_DOMAIN: ${RAILWAY_PUBLIC_DOMAIN:-not set}"
echo "SUPABASE_URL: ${SUPABASE_URL:-not set}"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-not set}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-not set}"
echo ""

# Verificar Python
echo "🐍 Python Environment:"
python3 --version || echo "❌ Python3 not found"
pip --version || echo "❌ pip not found"
echo ""

# Verificar dependencias
echo "📦 Python Dependencies:"
cd fastapi
python3 -c "import fastapi; print('✅ FastAPI:', fastapi.__version__)" || echo "❌ FastAPI not available"
python3 -c "import uvicorn; print('✅ Uvicorn available')" || echo "❌ Uvicorn not available"
python3 -c "import supabase; print('✅ Supabase available')" || echo "❌ Supabase not available"
cd ..
echo ""

# Verificar endpoint /health
echo "🔍 Health Endpoint Check:"
cd fastapi
python3 -c "
import sys
sys.path.append('.')
try:
    from app.main import app
    routes = [route.path for route in app.routes]
    if '/health' in routes:
        print('✅ /health endpoint is configured')
    else:
        print('❌ /health endpoint not found')
        print('Available routes:', routes)
except Exception as e:
    print('❌ Error checking routes:', str(e))
"
cd ..
echo ""

# Verificar configuración de Railway
echo "🚂 Railway Configuration:"
if [ -f "railway.json" ]; then
    echo "✅ railway.json exists"
    cat railway.json
else
    echo "❌ railway.json not found"
fi
echo ""

if [ -f "nixpacks.toml" ]; then
    echo "✅ nixpacks.toml exists"
    cat nixpacks.toml
else
    echo "❌ nixpacks.toml not found"
fi
echo ""

if [ -f "start-railway-final.sh" ]; then
    echo "✅ start-railway-final.sh exists"
    echo "Script is executable: $([ -x start-railway-final.sh ] && echo 'Yes' || echo 'No')"
else
    echo "❌ start-railway-final.sh not found"
fi
echo ""

echo "🎯 Diagnosis Complete!"
