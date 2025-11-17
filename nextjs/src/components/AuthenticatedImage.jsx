"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/api-config";

/**
 * Componente para cargar imágenes que requieren autenticación
 * Carga la imagen usando fetch con el token y luego la muestra como blob URL
 */
export default function AuthenticatedImage({ 
    src, 
    alt, 
    className, 
    style,
    onError,
    ...props 
}) {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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
        } catch (error) {
            console.warn('[AuthenticatedImage] Error reading cookies:', error);
        }
        
        // Fallback a localStorage (para compatibilidad)
        try {
            return localStorage.getItem('access_token');
        } catch (error) {
            console.warn('[AuthenticatedImage] Error reading localStorage:', error);
        }
        
        return null;
    };

    useEffect(() => {
        if (!src) {
            setLoading(false);
            return;
        }

        // Si la URL es absoluta y externa, cargar normalmente
        if (src.startsWith('http://') || src.startsWith('https://')) {
            // Verificar si es una URL del backend que requiere autenticación
            const API = getApiUrl();
            if (src.startsWith(API + '/photos/')) {
                // Es una URL del backend que requiere autenticación
                loadAuthenticatedImage(src);
            } else {
                // URL externa, cargar normalmente
                setImageSrc(src);
                setLoading(false);
            }
        } else if (src.startsWith('/photos/')) {
            // URL relativa del backend, construir URL completa
            const API = getApiUrl();
            loadAuthenticatedImage(`${API}${src}`);
        } else {
            // URL relativa local, cargar normalmente
            setImageSrc(src);
            setLoading(false);
        }
    }, [src]);

    const loadAuthenticatedImage = async (url) => {
        try {
            setLoading(true);
            setError(false);

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
                if (response.status === 401) {
                    console.warn('[AuthenticatedImage] Unauthorized, token may be missing or expired');
                }
                throw new Error(`Failed to load image: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setImageSrc(blobUrl);
            setError(false);
        } catch (err) {
            console.error('[AuthenticatedImage] Error loading image:', err);
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
            {...props}
        />
    );
}

