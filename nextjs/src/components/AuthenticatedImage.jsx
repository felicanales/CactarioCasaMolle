"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/api-config";

/**
 * Componente para cargar imágenes que requieren autenticación
 * Carga la imagen usando fetch con el token y luego la muestra como blob URL
 */
export default function AuthenticatedImage({
    src,
    fallbackSrc,
    alt,
    className,
    style,
    onError,
    ...props
}) {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [usedFallback, setUsedFallback] = useState(false);

    // Helper para obtener el access token
    const getAccessToken = () => {
        if (typeof window === 'undefined') return null;

        // Intentar leer cookies de diferentes formas para cross-domain
        try {
            // Método 1: Regex estándar
            let match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
            if (match && match[2]) {
                return match[2];
            }

            // Método 2: Buscar en todas las cookies (para cross-domain)
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'sb-access-token' && value) {
                    return value;
                }
            }
        } catch {}

        // Fallback a localStorage (para compatibilidad)
        try {
            return localStorage.getItem('access_token');
        } catch {}

        return null;
    };


    const loadFromSource = (value) => {
        if (!value) {
            setLoading(false);
            return;
        }

        if (value.startsWith('http://') || value.startsWith('https://')) {
            const API = getApiUrl();
            if (value.startsWith(`${API}/photos/`)) {
                loadAuthenticatedImage(value);
            } else {
                setImageSrc(value);
                setLoading(false);
            }
            return;
        }

        if (value.startsWith('/photos/')) {
            const API = getApiUrl();
            loadAuthenticatedImage(`${API}${value}`);
            return;
        }

        setImageSrc(value);
        setLoading(false);
    };

    const attemptFallback = (reason) => {
        if (!fallbackSrc || usedFallback || fallbackSrc === src) {
            return false;
        }
        setUsedFallback(true);
        setError(false);
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[AuthenticatedImage] Falling back to original image', {
                src,
                fallbackSrc,
                reason
            });
        }
        loadFromSource(fallbackSrc);
        return true;
    };

    useEffect(() => {
        setUsedFallback(false);
        setError(false);
        loadFromSource(src);
    }, [src, fallbackSrc]);

    const loadAuthenticatedImage = async (url) => {
        try {
            setLoading(true);
            setError(false);

            // Revocar URL anterior antes de cargar una nueva
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }

            const token = getAccessToken();
            const headers = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to load image: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setImageSrc(blobUrl);
            setError(false);
        } catch (err) {
            console.error('[AuthenticatedImage] Error loading image:', err);
            if (attemptFallback('fetch-error')) {
                return;
            }
            setError(true);
            if (onError) {
                onError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    // Limpiar blob URL cuando el componente se desmonte o cambie la imagen
    useEffect(() => {
        return () => {
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [imageSrc]);

    if (loading) {
        return (
            <div
                className={className}
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af'
                }}
                {...props}
            >
                <span style={{ fontSize: '12px' }}>Cargando...</span>
            </div>
        );
    }

    if (error || !imageSrc) {
        return (
            <div
                className={className}
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af'
                }}
                {...props}
            >
                <span style={{ fontSize: '12px' }}>Error al cargar</span>
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            style={style}
            onError={(event) => {
                if (attemptFallback('img-error')) {
                    return;
                }
                setError(true);
                if (onError) {
                    onError(event);
                }
            }}
            {...props}
        />
    );
}

