#!/usr/bin/env python3
"""
Script de inicio para Railway - maneja el puerto dinámicamente
"""
import os
import sys
import logging

# Configurar logging para que Railway capture los mensajes
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)  # Railway captura stderr
    ]
)
logger = logging.getLogger("startup")

if __name__ == "__main__":
    try:
        # Obtener puerto de Railway
        port = int(os.getenv("PORT", "8000"))
        logger.info(f"🚀 Starting Uvicorn server on 0.0.0.0:{port}")
        logger.info(f"📋 Environment: {os.getenv('RAILWAY_ENVIRONMENT_NAME', 'unknown')}")
        logger.info(f"🌍 Region: {os.getenv('RAILWAY_REGION', 'unknown')}")
        
        # Verificar que podemos importar la app antes de iniciar uvicorn
        logger.info("🔍 Verificando importación de la aplicación...")
        try:
            from app.main import app
            logger.info("✅ Aplicación importada correctamente")
        except Exception as import_error:
            logger.error(f"❌ Error al importar la aplicación: {import_error}", exc_info=True)
            raise
        
        # Importar uvicorn
        import uvicorn
        logger.info("✅ Uvicorn importado correctamente")
        
        # Iniciar servidor con configuración optimizada para Railway
        logger.info("🌐 Iniciando servidor Uvicorn...")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",  # Importante: debe ser 0.0.0.0, no localhost
            port=port,
            log_level="info",
            access_log=True,  # Habilitar access logs para debugging
            loop="asyncio",  # Usar asyncio loop
            timeout_keep_alive=5,  # Timeout para keep-alive
        )
    except KeyboardInterrupt:
        logger.info("⚠️  Servidor detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Error al iniciar el servidor: {e}", exc_info=True)
        sys.exit(1)

