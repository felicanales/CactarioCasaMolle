#!/bin/bash

# Script simple para Railway que funciona con Nixpacks
echo "🚀 Starting Cactario Casa Molle on Railway (Simple)..."

# Verificar variables de entorno
echo "📋 Environment:"
echo "PORT: ${PORT:-8000}"

# Verificar que Python esté disponible
echo "🔍 Checking Python environment..."
python3 --version
pip --version

# Cambiar al directorio fastapi
echo "📁 Changing to fastapi directory..."
cd fastapi

# Verificar que las dependencias estén instaladas
echo "📦 Checking if dependencies are installed..."
python3 -c "import fastapi" && echo "✅ FastAPI available" || echo "❌ FastAPI not available"

# Iniciar FastAPI
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info
