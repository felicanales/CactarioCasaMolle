"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/api-config";

const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match) return match[2];
    return localStorage.getItem('access_token');
};

export default function PhotoGallery({ 
    entityType, 
    entityId,
    onRefresh,
    showManageButtons = false 
}) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const fetchPhotos = async () => {
        setLoading(true);
        setError("");
        try {
            const API = getApiUrl();
            const response = await fetch(`${API}/photos/${entityType}/${entityId}`);
            const data = await response.json();

            if (response.ok) {
                setPhotos(data.photos || []);
            } else {
                setError(data.detail || 'Error al cargar fotos');
            }
        } catch (err) {
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, [entityType, entityId]);

    const handleSetCover = async (photoId) => {
        try {
            const API = getApiUrl();

            const response = await fetch(`${API}/photos/${photoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    is_cover: 'true'
                }),
                credentials: 'include'
            });

            if (response.ok) {
                fetchPhotos();
                if (onRefresh) onRefresh();
            }
        } catch (err) {
            console.error('Error al establecer portada:', err);
        }
    };

    const handleDelete = async (photoId) => {
        if (!confirm('¿Estás seguro de eliminar esta foto?')) return;

        try {
            const API = getApiUrl();

            const response = await fetch(`${API}/photos/${photoId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok || response.status === 204) {
                fetchPhotos();
                if (onRefresh) onRefresh();
            }
        } catch (err) {
            console.error('Error al eliminar foto:', err);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Cargando fotos...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: '6px',
                margin: '20px 0'
            }}>
                {error}
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#9ca3af',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                margin: '20px 0'
            }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>📷</p>
                <p>No hay fotos disponibles</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
            }}>
                {photos.map((photo) => (
                    <div key={photo.id} style={{ position: 'relative' }}>
                        <div style={{
                            position: 'relative',
                            paddingBottom: '100%',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: photo.is_cover ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                            cursor: 'pointer'
                        }}
                        onClick={() => setSelectedPhoto(photo)}
                        >
                            <img
                                src={photo.public_url}
                                alt="Foto"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            {photo.is_cover && (
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    Portada
                                </div>
                            )}
                        </div>

                        {showManageButtons && (
                            <div style={{
                                display: 'flex',
                                gap: '4px',
                                marginTop: '8px',
                                justifyContent: 'center'
                            }}>
                                {!photo.is_cover && (
                                    <button
                                        onClick={() => handleSetCover(photo.id)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                        title="Marcar como portada"
                                    >
                                        ⭐ Portada
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(photo.id)}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#fef2f2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                    title="Eliminar foto"
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal para ver foto en grande */}
            {selectedPhoto && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}
                    onClick={() => setSelectedPhoto(null)}
                >
                    <img
                        src={selectedPhoto.public_url}
                        alt="Foto ampliada"
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            borderRadius: '8px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}

