# 📸 Guía para Subir Fotos

## ✅ Pasos Completados

1. ✅ Tabla `fotos` creada en Supabase con foreign keys
2. ✅ Bucket `photos` configurado en Supabase Storage
3. ✅ Endpoints de API creados (`/photos/*`)
4. ✅ Componentes React creados (`PhotoUploader` y `PhotoGallery`)

## 🚀 Cómo Subir Fotos

### Opción 1: Desde el Frontend (Recomendado)

#### 1. Integrar el componente en la página de especies

Abre `nextjs/src/app/species/page.jsx` y agrega el componente:

```jsx
import PhotoUploader from '../../components/PhotoUploader';
import PhotoGallery from '../../components/PhotoGallery';

// Dentro del modal de edición/visualización, agrega:
{modalMode === 'view' && selectedSpecies && (
    <>
        <PhotoGallery 
            entityType="especie" 
            entityId={selectedSpecies.id}
            showManageButtons={true}
        />
        <PhotoUploader 
            entityType="especie" 
            entityId={selectedSpecies.id}
            onUploadComplete={() => {
                // Refrescar datos de la especie
                fetchSpecies();
            }}
            maxPhotos={10}
        />
    </>
)}
```

#### 2. Para Sectores

Similar pero usando `entityType="sector"`

### Opción 2: Desde Postman o cURL (Para pruebas)

```bash
# Subir fotos de una especie (ID 1)
curl -X POST "http://localhost:8000/photos/especie/1" \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "files=@foto1.jpg" \
  -F "files=@foto2.jpg"

# Listar fotos
curl "http://localhost:8000/photos/especie/1"

# Obtener foto de portada
curl "http://localhost:8000/photos/especie/1/cover"

# Marcar foto como portada
curl -X PUT "http://localhost:8000/photos/123" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "is_cover=true"

# Eliminar foto
curl -X DELETE "http://localhost:8000/photos/123" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Opción 3: Desde JavaScript/TypeScript

```javascript
const uploadPhotos = async (entityType, entityId, files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const token = localStorage.getItem('access_token');
  
  const response = await fetch(
    `${API_URL}/photos/${entityType}/${entityId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  const data = await response.json();
  return data;
};
```

## 📋 Endpoints Disponibles

### Subir Fotos
```
POST /photos/{entity_type}/{entity_id}
```
- `entity_type`: `especie`, `sector`, `ejemplar`
- `entity_id`: ID de la entidad
- Body: `multipart/form-data` con campo `files` (múltiple)

### Listar Fotos
```
GET /photos/{entity_type}/{entity_id}
```
- Retorna todas las fotos con URLs públicas

### Obtener Portada
```
GET /photos/{entity_type}/{entity_id}/cover
```
- Retorna la foto de portada (is_cover=true o primera por orden)

### Actualizar Foto
```
PUT /photos/{photo_id}
```
- Parámetros: `is_cover`, `order_index`, `caption`

### Eliminar Foto
```
DELETE /photos/{photo_id}
```

## 🎨 Características

- ✅ Subida múltiple de fotos
- ✅ Previsualización antes de subir
- ✅ Redimensionamiento automático (máx 2048px)
- ✅ Validación de tipo y tamaño
- ✅ Marcado de foto de portada
- ✅ Orden de fotos
- ✅ Eliminación de fotos
- ✅ Galería con vista ampliada

## 📝 Notas Importantes

1. **Autenticación**: Todos los endpoints de escritura requieren token
2. **Límites**: Máximo 10MB por foto, recomendado 4-5 fotos por especie
3. **Formato**: JPEG, PNG, WebP son soportados
4. **Storage**: Las fotos se guardan en `photos/{tipo}/{id}/{uuid}.jpg`

## 🔧 Troubleshooting

### Error: "No access token available"
- Asegúrate de estar autenticado
- Verifica que el token esté en cookies o localStorage

### Error: "Tipo de entidad no válido"
- Usa: `especie`, `sector`, o `ejemplar` (en minúsculas)

### Error: "Foto no encontrada"
- Verifica que el ID de la foto sea correcto
- La foto debe existir en la tabla `fotos`

### Las fotos no se muestran
- Verifica que el bucket `photos` esté público en Supabase
- Verifica las políticas RLS en la tabla `fotos`

## 📚 Próximos Pasos

1. Integrar `PhotoUploader` en la página de especies
2. Integrar `PhotoGallery` para mostrar las fotos
3. Agregar fotos a sectores si es necesario
4. Actualizar el frontend público para mostrar las fotos

