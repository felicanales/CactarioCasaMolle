#!/usr/bin/env python3
"""
Script para revertir carpetas renombradas en Supabase Storage.

Este script:
1. Lista todas las carpetas en photos/especies/
2. Identifica carpetas que tienen nombres de especies (no IDs numéricos)
3. Busca el ID correspondiente en la base de datos
4. Mueve los archivos a la carpeta correcta con el ID
"""

import os
import sys
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.supabase_auth import get_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BUCKET_NAME = "photos"

def get_species_by_name(nombre_común: str, scientific_name: str = None):
    """Busca una especie por nombre común o científico."""
    sb = get_service()
    
    query = sb.table("especies").select("id, nombre_común, scientific_name")
    
    if nombre_común:
        query = query.ilike("nombre_común", f"%{nombre_común}%")
    
    if scientific_name:
        query = query.or_(f"nombre_común.ilike.%{nombre_común}%,scientific_name.ilike.%{scientific_name}%")
    
    result = query.execute()
    return result.data if result.data else []

def list_storage_folders():
    """Lista todas las carpetas en photos/especies/"""
    sb = get_service()
    
    try:
        # Listar todos los archivos en photos/especies/
        files = sb.storage.from_(BUCKET_NAME).list("especies")
        
        # Extraer nombres de carpetas únicos
        folders = set()
        for file in files:
            if '/' in file.get('name', ''):
                # Extraer el nombre de la carpeta (segunda parte del path)
                parts = file['name'].split('/')
                if len(parts) >= 2:
                    folders.add(parts[1])
        
        return sorted(list(folders))
    except Exception as e:
        logger.error(f"Error al listar carpetas: {e}")
        return []

def is_numeric_folder(folder_name: str) -> bool:
    """Verifica si el nombre de la carpeta es un ID numérico."""
    try:
        int(folder_name)
        return True
    except ValueError:
        return False

def move_files_to_correct_folder(old_folder_name: str, new_folder_id: int):
    """Mueve todos los archivos de una carpeta a otra."""
    sb = get_service()
    
    try:
        # Listar archivos en la carpeta antigua
        files = sb.storage.from_(BUCKET_NAME).list(f"especies/{old_folder_name}")
        
        moved_count = 0
        errors = []
        
        for file_info in files:
            old_path = f"especies/{old_folder_name}/{file_info['name']}"
            
            # El nuevo path usa el ID numérico
            new_path = f"especies/{new_folder_id}/{file_info['name']}"
            
            try:
                # Descargar el archivo
                file_content = sb.storage.from_(BUCKET_NAME).download(old_path)
                
                # Subir a la nueva ubicación
                sb.storage.from_(BUCKET_NAME).upload(
                    new_path,
                    file_content,
                    file_options={"content-type": file_info.get('metadata', {}).get('contentType', 'image/jpeg')}
                )
                
                # Actualizar storage_path en la base de datos
                sb.table("fotos").update({"storage_path": new_path})\
                  .eq("storage_path", old_path)\
                  .execute()
                
                # Eliminar el archivo antiguo
                sb.storage.from_(BUCKET_NAME).remove([old_path])
                
                moved_count += 1
                logger.info(f"  ✅ Movido: {old_path} → {new_path}")
                
            except Exception as e:
                error_msg = f"Error al mover {old_path}: {e}"
                errors.append(error_msg)
                logger.error(f"  ❌ {error_msg}")
        
        # Intentar eliminar la carpeta vacía (si Supabase lo permite)
        try:
            # Listar nuevamente para verificar si está vacía
            remaining = sb.storage.from_(BUCKET_NAME).list(f"especies/{old_folder_name}")
            if not remaining:
                logger.info(f"  📁 Carpeta {old_folder_name} está vacía (puede eliminarse manualmente)")
        except:
            pass
        
        return moved_count, errors
        
    except Exception as e:
        logger.error(f"Error al procesar carpeta {old_folder_name}: {e}")
        return 0, [str(e)]

def main():
    """Función principal."""
    logger.info("=" * 60)
    logger.info("🔧 Script de Corrección de Carpetas en Storage")
    logger.info("=" * 60)
    
    # Listar todas las carpetas
    logger.info("\n📋 Listando carpetas en photos/especies/...")
    folders = list_storage_folders()
    
    if not folders:
        logger.warning("No se encontraron carpetas.")
        return
    
    logger.info(f"Encontradas {len(folders)} carpetas:")
    for folder in folders:
        logger.info(f"  - {folder}")
    
    # Identificar carpetas que necesitan corrección (no son numéricas)
    logger.info("\n🔍 Identificando carpetas que necesitan corrección...")
    folders_to_fix = []
    
    for folder in folders:
        if not is_numeric_folder(folder):
            logger.info(f"  ⚠️  Carpeta con nombre (no ID): {folder}")
            folders_to_fix.append(folder)
    
    if not folders_to_fix:
        logger.info("✅ Todas las carpetas tienen nombres numéricos (IDs).")
        return
    
    logger.info(f"\n📝 Se encontraron {len(folders_to_fix)} carpetas para corregir:")
    for folder in folders_to_fix:
        logger.info(f"  - {folder}")
    
    # Buscar IDs correspondientes
    logger.info("\n🔎 Buscando IDs correspondientes en la base de datos...")
    folder_mapping = {}
    
    for folder_name in folders_to_fix:
        species = get_species_by_name(folder_name)
        
        if len(species) == 1:
            folder_mapping[folder_name] = species[0]['id']
            logger.info(f"  ✅ '{folder_name}' → ID {species[0]['id']} ({species[0].get('scientific_name', 'N/A')})")
        elif len(species) > 1:
            logger.warning(f"  ⚠️  Múltiples especies encontradas para '{folder_name}':")
            for sp in species:
                logger.warning(f"      - ID {sp['id']}: {sp.get('nombre_común', 'N/A')} ({sp.get('scientific_name', 'N/A')})")
            logger.warning(f"  ⚠️  No se puede determinar automáticamente. Requiere intervención manual.")
        else:
            logger.error(f"  ❌ No se encontró especie para '{folder_name}'")
    
    # Confirmar antes de proceder
    logger.info("\n" + "=" * 60)
    logger.info("📋 RESUMEN DE CAMBIOS:")
    logger.info("=" * 60)
    for old_name, new_id in folder_mapping.items():
        logger.info(f"  {old_name} → {new_id}")
    
    if not folder_mapping:
        logger.warning("\n⚠️  No hay carpetas que se puedan corregir automáticamente.")
        logger.info("Por favor, verifica manualmente las carpetas en Supabase Storage.")
        return
    
    # Preguntar confirmación
    logger.info("\n" + "=" * 60)
    logger.warning("⚠️  ADVERTENCIA: Este script moverá archivos en Supabase Storage.")
    logger.warning("⚠️  Asegúrate de tener un backup antes de continuar.")
    logger.info("=" * 60)
    
    response = input("\n¿Deseas continuar con la corrección? (sí/no): ").strip().lower()
    
    if response not in ['sí', 'si', 'yes', 'y', 's']:
        logger.info("Operación cancelada.")
        return
    
    # Proceder con la corrección
    logger.info("\n🚀 Iniciando corrección...")
    total_moved = 0
    total_errors = []
    
    for old_name, new_id in folder_mapping.items():
        logger.info(f"\n📦 Procesando: {old_name} → {new_id}")
        moved, errors = move_files_to_correct_folder(old_name, new_id)
        total_moved += moved
        total_errors.extend(errors)
    
    # Resumen final
    logger.info("\n" + "=" * 60)
    logger.info("✅ CORRECCIÓN COMPLETADA")
    logger.info("=" * 60)
    logger.info(f"Archivos movidos: {total_moved}")
    if total_errors:
        logger.warning(f"Errores: {len(total_errors)}")
        for error in total_errors:
            logger.error(f"  - {error}")
    else:
        logger.info("✅ Sin errores")
    
    logger.info("\n💡 NOTA: Las carpetas vacías pueden eliminarse manualmente desde Supabase Storage.")

if __name__ == "__main__":
    main()

