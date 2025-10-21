#!/usr/bin/env python3
"""
Script de inicio para Railway - maneja el puerto dinámicamente
"""
import os
import sys

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"Starting Uvicorn server on 0.0.0.0:{port}", file=sys.stderr)
    
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

