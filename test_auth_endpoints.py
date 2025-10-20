#!/usr/bin/env python3
"""
Script de prueba para verificar endpoints de autenticación
"""
import requests
import json
import sys
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración
BASE_URL = os.getenv("API_URL", "http://localhost:8000")
TEST_EMAIL = "test@example.com"  # Cambiar por un email real de prueba

def test_endpoint(method, endpoint, data=None, headers=None):
    """Función helper para probar endpoints"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        
        print(f"\n🔍 {method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                json_data = response.json()
                print(f"Response: {json.dumps(json_data, indent=2)}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"Response: {response.text}")
            
        return response
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🚀 Probando endpoints de autenticación...")
    print(f"Base URL: {BASE_URL}")
    
    # 1. Probar endpoint raíz
    test_endpoint("GET", "/")
    
    # 2. Probar endpoint de debug
    test_endpoint("GET", "/debug")
    
    # 3. Probar listado de rutas
    test_endpoint("GET", "/debug/routes")
    
    # 4. Probar status de Supabase
    test_endpoint("GET", "/debug/supabase-status")
    
    # 5. Probar status de auth
    test_endpoint("GET", "/debug/auth-status")
    
    # 6. Probar /auth/me sin autenticación (debería dar 401)
    test_endpoint("GET", "/auth/me")
    
    # 7. Probar request-otp
    test_endpoint("POST", "/auth/request-otp", {"email": TEST_EMAIL})
    
    print("\n✅ Pruebas completadas!")
    print("\n📝 Notas:")
    print("- Si /auth/me da 404, hay un problema con el routing")
    print("- Si da 401, el endpoint está funcionando pero falta autenticación")
    print("- Si da 500, hay un problema con la configuración de Supabase")

if __name__ == "__main__":
    main()
