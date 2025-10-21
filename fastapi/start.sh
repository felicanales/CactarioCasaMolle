#!/bin/sh
# Script de inicio para Railway - maneja el puerto correctamente
PORT=${PORT:-8000}
echo "Starting server on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

