#!/bin/bash

# Script simple para iniciar FastAPI con la variable PORT de Railway
echo "🚀 Starting FastAPI on port ${PORT:-8000}..."

# Instalar dependencias si es necesario
pip install -r requirements.txt

# Iniciar FastAPI
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
