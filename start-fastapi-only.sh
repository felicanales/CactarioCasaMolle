#!/bin/bash

# Script para iniciar solo FastAPI con healthcheck optimizado para Railway
echo "🚀 Starting FastAPI for Railway healthcheck..."

# Verificar variables de entorno
echo "📋 Environment:"
echo "PORT: ${PORT:-8000}"

# Cambiar al directorio fastapi
cd fastapi

# Instalar dependencias
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Iniciar FastAPI con configuración optimizada
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info
