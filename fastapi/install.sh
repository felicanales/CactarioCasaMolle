#!/bin/bash

# Installation script for Cactario Casa Molle Backend
echo "🚀 Installing Cactario Casa Molle Backend..."

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

# Actualizar pip
echo "📦 Updating pip..."
python3 -m pip install --upgrade pip

# Instalar dependencias
echo "📦 Installing dependencies..."
python3 -m pip install -r requirements.txt || {
    echo "❌ Failed to install dependencies"
    exit 1
}

# Verificar instalación
echo "🔍 Verifying installation..."
python3 -c "import fastapi, uvicorn; print('✅ FastAPI and uvicorn available')" || {
    echo "❌ Key dependencies missing"
    exit 1
}

echo "✅ Installation completed successfully!"
