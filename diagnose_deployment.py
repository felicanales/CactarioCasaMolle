#!/usr/bin/env python3
"""
Script de diagnóstico para verificar el estado del despliegue en Railway
"""
import requests
import json
import sys
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def test_endpoint(method, url, data=None, headers=None, description=""):
    """Función helper para probar endpoints"""
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"\n🔍 {method} {url}")
        print(f"Description: {description}")
        print(f"Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                json_data = response.json()
                print(f"Response: {json.dumps(json_data, indent=2)}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"Response: {response.text[:200]}...")
            
        return response
    except requests.exceptions.Timeout:
        print(f"❌ Timeout: {url}")
        return None
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: {url}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🚀 Diagnóstico de Despliegue en Railway...")
    
    # Obtener URL base desde variables de entorno o usar localhost
    base_url = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    if base_url:
        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"
        print(f"Railway Domain: {base_url}")
    else:
        base_url = "http://localhost:8000"
        print(f"Using localhost: {base_url}")
    
    print("=" * 60)
    
    # 1. Probar endpoint raíz del backend
    test_endpoint("GET", f"{base_url}/", description="Backend root endpoint")
    
    # 2. Probar endpoint de debug
    test_endpoint("GET", f"{base_url}/debug", description="Debug endpoint")
    
    # 3. Probar listado de rutas
    test_endpoint("GET", f"{base_url}/debug/routes", description="Available routes")
    
    # 4. Probar status de Supabase
    test_endpoint("GET", f"{base_url}/debug/supabase-status", description="Supabase connection")
    
    # 5. Probar /auth/me sin autenticación (debería dar 401, no 404)
    test_endpoint("GET", f"{base_url}/auth/me", description="Auth me endpoint (should return 401, not 404)")
    
    # 6. Probar request-otp
    test_endpoint("POST", f"{base_url}/auth/request-otp", 
                 {"email": "test@example.com"}, 
                 description="Request OTP endpoint")
    
    # 7. Probar frontend (si está en el mismo dominio)
    if base_url != "http://localhost:8000":
        frontend_url = base_url.replace(":8000", "").replace("http://", "https://")
        test_endpoint("GET", frontend_url, description="Frontend (Next.js)")
    
    print("\n" + "=" * 60)
    print("📋 DIAGNÓSTICO:")
    print("\n✅ Si todos los endpoints del backend (/) devuelven 200:")
    print("   → El backend está funcionando correctamente")
    print("\n❌ Si los endpoints del backend devuelven 404:")
    print("   → El backend no está desplegado o no está corriendo")
    print("\n❌ Si /auth/me devuelve 404:")
    print("   → El backend no está desplegado correctamente")
    print("\n❌ Si /auth/me devuelve 401:")
    print("   → El backend está funcionando, solo falta autenticación")
    
    print("\n🔧 SOLUCIONES:")
    print("1. Verificar que Railway esté ejecutando 'npm run start:all'")
    print("2. Verificar que las variables de entorno estén configuradas")
    print("3. Verificar los logs de Railway en el dashboard")
    print("4. Verificar que el frontend esté usando la URL correcta del backend")

if __name__ == "__main__":
    main()
