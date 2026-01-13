'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';

/**
 * Componente para mostrar imágenes que pueden requerir autenticación
 * Si la imagen es pública, la carga directamente. Si es del backend y requiere auth, intenta cargarla.
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
    const [resolvedUrl, setResolvedUrl] = useState(null);
    const [authTried, setAuthTried] = useState(false);

    useEffect(() => {
        if (!src) {
            setImageSrc(null);
            setResolvedUrl(null);
            setLoading(false);
            return;
        }

        setAuthTried(false);
        setError(false);
        setLoading(true);

        let finalUrl = src;
        if (src.startsWith('/photos/')) {
            finalUrl = `${API_URL}${src}`;
        }

        setResolvedUrl(finalUrl);
        setImageSrc(finalUrl);
        setLoading(false);
    }, [src]);

    const loadAuthenticatedImage = async (url) => {
        try {
            setLoading(true);
            setError(false);

            // Primero intentar cargar directamente (puede ser pública)
            const response = await fetch(url, {
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                setImageSrc(blobUrl);
                setError(false);
                setLoading(false);
                return;
            }

            // Si falla, intentar con token
            const token = getAccessToken();
            if (token) {
                const authResponse = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    credentials: 'include'
                });

                if (authResponse.ok) {
                    const blob = await authResponse.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    setImageSrc(blobUrl);
                    setError(false);
                    setLoading(false);
                    return;
                }
            }

            // Si todo falla, intentar como imagen pública de todas formas
            setImageSrc(url);
            setError(false);
        } catch (err) {
            console.error('[AuthenticatedImage] Error loading image:', err);
            // Intentar mostrar como URL pública de todas formas
            setImageSrc(url);
            setError(false);
        } finally {
            setLoading(false);
        }
    };

    const getAccessToken = () => {
        if (typeof window === 'undefined') return null;
        
        try {
            // Intentar leer cookies
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'sb-access-token' && value) {
                    return value;
                }
            }
            
            // Fallback a localStorage
            return localStorage.getItem('access_token');
        } catch (error) {
            console.warn('[AuthenticatedImage] Error reading token:', error);
            return null;
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
                    color: '#9ca3af',
                    borderRadius: style?.borderRadius || '8px',
                }}
                {...props}
            >
                <span style={{ fontSize: '12px' }}>🌵</span>
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
                    color: '#9ca3af',
                    borderRadius: style?.borderRadius || '8px',
                }}
                {...props}
            >
                <span style={{ fontSize: '24px' }}>🌵</span>
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            style={style}
            onError={(e) => {
                if (!authTried && resolvedUrl && resolvedUrl.startsWith(API_URL + '/photos/')) {
                    setAuthTried(true);
                    loadAuthenticatedImage(resolvedUrl);
                    return;
                }
                setError(true);
                if (onError) {
                    onError(e);
                }
            }}
            loading="lazy"
            decoding="async"
            {...props}
        />
    );
}

