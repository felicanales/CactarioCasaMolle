"use client";

import { useState } from "react";
import { useAuth } from "../app/context/AuthContext";
import { getApiUrl } from "../utils/api-config";

// Helper para obtener el access token
// Prioridad: token del AuthContext > cookies > localStorage
const getAccessTokenFromContext = (accessTokenFromContext) => {
    // Prioridad 1: Token del estado de AuthContext (más confiable)
    if (accessTokenFromContext) {
        console.log('[PhotoUploader] Using token from AuthContext state');
        return accessTokenFromContext;
    }

    if (typeof window === 'undefined') return null;

    // Prioridad 2: cookies (incluyendo cookies cross-domain)
    // Intentar leer cookies de diferentes formas para cross-domain
    try {
        // Método 1: Regex estándar
        let match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
        if (match && match[2]) {
            console.log('[PhotoUploader] Using token from cookies (method 1)');
            return match[2];
        }

        // Método 2: Buscar en todas las cookies (para cross-domain)
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sb-access-token' && value) {
                console.log('[PhotoUploader] Using token from cookies (method 2)');
                return value;
            }
        }
    } catch (error) {
        console.warn('[PhotoUploader] Error reading cookies:', error);
    }

    // Prioridad 3: localStorage (para compatibilidad)
    try {
        const localStorageToken = localStorage.getItem('access_token');
        if (localStorageToken) {
            console.log('[PhotoUploader] Using token from localStorage');
            return localStorageToken;
        }
    } catch (error) {
        console.warn('[PhotoUploader] Error reading localStorage:', error);
    }

    console.warn('[PhotoUploader] No token found in any source');
    return null;
};

// Helper para obtener CSRF token (cross-domain compatible)
const getCsrfToken = () => {
    if (typeof document === 'undefined') return null;

    // Intentar leer cookies de diferentes formas para cross-domain
    try {
        // Método 1: Regex estándar
        let match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
        if (match && match[2]) {
            return match[2];
        }

        // Método 2: Buscar en todas las cookies (para cross-domain)
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf-token' && value) {
                return value;
            }
        }
    } catch (error) {
        console.warn('[PhotoUploader] Error reading CSRF token from cookies:', error);
    }

    return null;
};

export default function PhotoUploader({
    entityType,
    entityId,
    onUploadComplete,
    maxPhotos = 10
}) {
    // Obtener el token del AuthContext si está disponible
    // El componente debe estar dentro del AuthProvider para que esto funcione
    const auth = useAuth();
    const accessTokenFromContext = auth?.accessToken || null;
    const csrfTokenFromContext = auth?.csrfToken || null;
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);

        if (selectedFiles.length + files.length > maxPhotos) {
            setError(`Solo puedes subir máximo ${maxPhotos} fotos`);
            return;
        }

        // Validar que sean imágenes
        const validFiles = selectedFiles.filter(file => {
            if (!file.type.startsWith('image/')) {
                setError(`${file.name} no es una imagen válida`);
                return false;
            }
            // Validar tamaño (máx 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError(`${file.name} es demasiado grande (máx 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setFiles([...files, ...validFiles]);
        setError("");

        // Crear previews
        const newPreviews = validFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            id: Math.random().toString(36).substring(7)
        }));
        setPreviews([...previews, ...newPreviews]);
    };

    const removeFile = (previewId) => {
        const preview = previews.find(p => p.id === previewId);
        if (preview) {
            URL.revokeObjectURL(preview.preview);
        }
        const newPreviews = previews.filter(p => p.id !== previewId);
        setPreviews(newPreviews);
        setFiles(files.filter((_, idx) => idx < newPreviews.length));
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setError("Selecciona al menos una foto");
            return;
        }

        setUploading(true);
        setError("");
        setSuccess("");

        try {
            const token = getAccessTokenFromContext(accessTokenFromContext);
            console.log('[PhotoUploader] Attempting upload, token available:', !!token);
            console.log('[PhotoUploader] Token source:', accessTokenFromContext ? 'AuthContext' : 'cookies/localStorage');

            if (!token) {
                console.error('[PhotoUploader] No token available for upload');
                setError("No estás autenticado. Por favor, inicia sesión.");
                setUploading(false);
                return;
            }

            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const API = getApiUrl();
            const url = `${API}/photos/${entityType}/${entityId}`;

            // Obtener CSRF token (prioridad: AuthContext > cookies)
            const csrfToken = csrfTokenFromContext || getCsrfToken();

            console.log('[PhotoUploader] Uploading to:', url);
            console.log('[PhotoUploader] Files count:', files.length);
            console.log('[PhotoUploader] Authorization header will be included');
            console.log('[PhotoUploader] CSRF token available:', !!csrfToken);
            console.log('[PhotoUploader] CSRF token source:', csrfTokenFromContext ? 'AuthContext' : 'cookies');

            const headers = {
                'Authorization': `Bearer ${token}`
                // NO incluir 'Content-Type' - el navegador lo establece automáticamente con boundary para FormData
            };

            // Agregar CSRF token para operaciones POST
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
                console.log('[PhotoUploader] ✅ Adding CSRF token to header');
            } else {
                console.error('[PhotoUploader] ❌ No CSRF token available');
                console.error('[PhotoUploader] document.cookie:', typeof document !== 'undefined' ? document.cookie : 'N/A');
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            console.log('[PhotoUploader] Response status:', response.status);

            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('[PhotoUploader] Error parsing response:', e);
                const text = await response.text();
                console.error('[PhotoUploader] Response text:', text);
                throw new Error('Error al procesar respuesta del servidor');
            }

            if (response.ok) {
                console.log('[PhotoUploader] Upload successful:', data);
                setSuccess(`${data.count || data.photos?.length || files.length} fotos subidas exitosamente`);
                // Revocar URLs de previews antes de limpiar
                previews.forEach(p => URL.revokeObjectURL(p.preview));
                setFiles([]);
                setPreviews([]);

                // Callback opcional
                if (onUploadComplete) {
                    setTimeout(() => {
                        onUploadComplete();
                    }, 1000);
                }
            } else {
                console.error('[PhotoUploader] Upload failed:', data);
                if (response.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                } else {
                    setError(data.detail || data.message || `Error al subir fotos (${response.status})`);
                }
            }
        } catch (err) {
            setError(`Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#f9fafb',
            marginTop: '20px'
        }}>
            <h3 style={{
                marginBottom: '16px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
            }}>
                📸 Subir Fotos
            </h3>

            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading || files.length >= maxPhotos}
                style={{
                    marginBottom: '16px',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    width: '100%',
                    cursor: uploading ? 'not-allowed' : 'pointer'
                }}
            />

            {error && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#d1fae5',
                    color: '#16a34a',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '14px'
                }}>
                    {success}
                </div>
            )}

            {previews.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    {previews.map((preview) => (
                        <div key={preview.id} style={{ position: 'relative' }}>
                            <img
                                src={preview.preview}
                                alt="Preview"
                                style={{
                                    width: '100%',
                                    height: '120px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb'
                                }}
                            />
                            <button
                                onClick={() => removeFile(preview.id)}
                                disabled={uploading}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    backgroundColor: 'rgba(220, 38, 38, 0.9)',
                                    color: 'white',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                style={{
                    padding: '12px 24px',
                    backgroundColor: uploading || files.length === 0 ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: uploading || files.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    width: '100%',
                    transition: 'all 0.2s'
                }}
            >
                {uploading
                    ? '⏳ Subiendo...'
                    : files.length === 0
                        ? 'Selecciona fotos para subir'
                        : `📤 Subir ${files.length} Foto${files.length > 1 ? 's' : ''}`
                }
            </button>

            {files.length > 0 && (
                <p style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    {files.length} de {maxPhotos} fotos seleccionadas
                </p>
            )}
        </div>
    );
}

