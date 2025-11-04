"use client";

import { useState } from "react";

const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // Si estamos en un dominio ngrok o railway, usar backend de producción
        if (hostname.includes('railway.app') ||
            hostname.includes('ngrok.io') ||
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev') ||
            hostname.includes('ngrokapp.com') ||
            hostname.includes('ngrok')) {
            return "https://cactariocasamolle-production.up.railway.app";
        }

        // Si estamos en HTTPS, usar producción
        if (protocol === 'https:') {
            return "https://cactariocasamolle-production.up.railway.app";
        }
    }
    return "http://localhost:8000";
};

const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match) return match[2];
    return localStorage.getItem('access_token');
};

export default function PhotoUploader({
    entityType,
    entityId,
    onUploadComplete,
    maxPhotos = 10
}) {
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
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const API = getApiUrl();

            const response = await fetch(`${API}/photos/${entityType}/${entityId}`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
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
                setError(data.detail || data.message || 'Error al subir fotos');
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

