#!/usr/bin/env python3
"""
Setup script for Cactario Casa Molle Backend
Ensures pip is available and installs dependencies
"""

import subprocess
import sys
import os

def ensure_pip():
    """Ensure pip is available"""
    try:
        import pip
        print("✅ pip is available")
        return True
    except ImportError:
        print("❌ pip not available, trying to install...")
        try:
            subprocess.check_call([sys.executable, "-m", "ensurepip", "--upgrade"])
            print("✅ pip installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install pip: {e}")
            return False

def install_requirements():
    """Install requirements from requirements.txt"""
    if not os.path.exists("requirements.txt"):
        print("❌ requirements.txt not found")
        return False
    
    try:
        print("📦 Installing requirements...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def verify_installation():
    """Verify that key dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        print("✅ FastAPI and uvicorn available")
        return True
    except ImportError as e:
        print(f"❌ Key dependencies missing: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up Cactario Casa Molle Backend...")
    
    if not ensure_pip():
        sys.exit(1)
    
    if not install_requirements():
        sys.exit(1)
    
    if not verify_installation():
        sys.exit(1)
    
    print("✅ Setup completed successfully!")
