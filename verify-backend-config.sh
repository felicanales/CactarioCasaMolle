#!/bin/bash

# Script para verificar la configuración del backend para Railway
echo "🔍 Verificando configuración del backend para Railway..."

# Verificar que estamos en el directorio correcto
if [ ! -d "fastapi" ]; then
    echo "❌ Directorio 'fastapi' no encontrado"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

echo "✅ Directorio 'fastapi' encontrado"

# Verificar archivos de configuración
echo "📋 Verificando archivos de configuración..."

# Verificar railway.json
if [ -f "fastapi/railway.json" ]; then
    echo "✅ railway.json encontrado"
else
    echo "❌ railway.json no encontrado"
fi

# Verificar nixpacks.toml
if [ -f "fastapi/nixpacks.toml" ]; then
    echo "✅ nixpacks.toml encontrado"
    # Verificar sintaxis básica
    if grep -q 'providers = \["python"\]' fastapi/nixpacks.toml; then
        echo "✅ Sintaxis de providers correcta"
    else
        echo "❌ Sintaxis de providers incorrecta"
    fi
    # Verificar uso de python -m pip
    if grep -q 'python -m pip' fastapi/nixpacks.toml; then
        echo "✅ Usa 'python -m pip' (recomendado)"
    elif grep -q 'pip install' fastapi/nixpacks.toml; then
        echo "⚠️  Usa 'pip install' (puede fallar en Railway)"
    fi
else
    echo "❌ nixpacks.toml no encontrado"
    echo "   Railway usará detección automática de Python"
fi

# Verificar archivos alternativos
if [ -f "fastapi/nixpacks-robust.toml" ]; then
    echo "✅ nixpacks-robust.toml disponible como alternativa"
fi
if [ -f "fastapi/nixpacks-minimal.toml" ]; then
    echo "✅ nixpacks-minimal.toml disponible como alternativa"
fi

# Verificar Procfile
if [ -f "fastapi/Procfile" ]; then
    echo "✅ Procfile encontrado"
    if grep -q "uvicorn app.main:app" fastapi/Procfile; then
        echo "✅ Comando de inicio correcto"
    else
        echo "❌ Comando de inicio incorrecto"
    fi
else
    echo "❌ Procfile no encontrado"
fi

# Verificar runtime.txt
if [ -f "fastapi/runtime.txt" ]; then
    echo "✅ runtime.txt encontrado"
    if grep -q "python-3.11" fastapi/runtime.txt; then
        echo "✅ Versión de Python correcta"
    else
        echo "❌ Versión de Python incorrecta"
    fi
else
    echo "❌ runtime.txt no encontrado"
fi

# Verificar requirements.txt
if [ -f "fastapi/requirements.txt" ]; then
    echo "✅ requirements.txt encontrado"
    if grep -q "fastapi" fastapi/requirements.txt; then
        echo "✅ FastAPI en requirements.txt"
    else
        echo "❌ FastAPI no encontrado en requirements.txt"
    fi
    if grep -q "uvicorn" fastapi/requirements.txt; then
        echo "✅ Uvicorn en requirements.txt"
    else
        echo "❌ Uvicorn no encontrado en requirements.txt"
    fi
else
    echo "❌ requirements.txt no encontrado"
fi

# Verificar app/main.py
if [ -f "fastapi/app/main.py" ]; then
    echo "✅ app/main.py encontrado"
    if grep -q "FastAPI" fastapi/app/main.py; then
        echo "✅ FastAPI importado correctamente"
    else
        echo "❌ FastAPI no importado"
    fi
    if grep -q "@app.get.*health" fastapi/app/main.py; then
        echo "✅ Endpoint /health encontrado"
    else
        echo "❌ Endpoint /health no encontrado"
    fi
else
    echo "❌ app/main.py no encontrado"
fi

# Verificar configuración CORS
echo "🌐 Verificando configuración CORS..."
if grep -q "cactario-frontend-production.up.railway.app" fastapi/app/main.py; then
    echo "✅ Dominio del frontend configurado en CORS"
else
    echo "❌ Dominio del frontend no configurado en CORS"
fi

# Verificar middleware CORS
if grep -q "CORSMiddleware" fastapi/app/main.py; then
    echo "✅ CORSMiddleware configurado"
else
    echo "❌ CORSMiddleware no configurado"
fi

echo ""
echo "🎯 Resumen de verificación:"
echo "=========================="

# Contar archivos de configuración
config_files=0
if [ -f "fastapi/railway.json" ]; then ((config_files++)); fi
if [ -f "fastapi/nixpacks.toml" ]; then ((config_files++)); fi
if [ -f "fastapi/Procfile" ]; then ((config_files++)); fi
if [ -f "fastapi/runtime.txt" ]; then ((config_files++)); fi

echo "Archivos de configuración encontrados: $config_files/4"

if [ $config_files -eq 4 ]; then
    echo "✅ Todos los archivos de configuración están presentes"
    echo ""
    echo "🚀 El backend está listo para desplegar en Railway!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Ve a Railway Dashboard"
    echo "2. Crea un nuevo servicio"
    echo "3. Configura working directory como 'fastapi'"
    echo "4. Configura variables de entorno"
    echo "5. Genera dominio público"
    echo ""
    echo "📖 Consulta RAILWAY_BACKEND_DEPLOYMENT_GUIDE.md para instrucciones detalladas"
else
    echo "❌ Faltan archivos de configuración"
    echo "   Revisa los errores anteriores"
fi

echo ""
echo "🔧 Variables de entorno requeridas:"
echo "SUPABASE_URL=https://gefozbrdrtopdfuezppm.supabase.co"
echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "ENV=production"
echo "CORS_ORIGINS=https://cactario-frontend-production.up.railway.app"
