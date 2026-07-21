"use client";
/* eslint-disable @next/next/no-img-element -- Este componente renderiza blob URLs autenticadas que Next Image no puede optimizar. */

import { useState, useEffect, useRef } from "react";
import { getApiUrl } from "../utils/api-config";
import { getAccessTokenFromContext } from "../utils/auth-helpers";

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
    const [activeSource, setActiveSource] = useState(src);
    const onErrorRef = useRef(onError);

    const getAccessToken = () => getAccessTokenFromContext(null);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        setActiveSource(src);
        setUsedFallback(false);
        setError(false);
    }, [src, fallbackSrc]);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = null;

        const loadImage = async () => {
            if (!activeSource) {
                setImageSrc(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(false);

            const API = getApiUrl();
            const isAuthenticatedPath = activeSource.startsWith('/photos/');
            const isAuthenticatedUrl = activeSource.startsWith(`${API}/photos/`);

            if (!isAuthenticatedPath && !isAuthenticatedUrl) {
                setImageSrc(activeSource);
                setLoading(false);
                return;
            }

            const url = isAuthenticatedPath ? `${API}${activeSource}` : activeSource;

            try {
                const token = getAccessToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;

                const response = await fetch(url, { headers, credentials: 'include' });
                if (!response.ok) {
                    throw new Error(`Failed to load image: ${response.status}`);
                }

                const blob = await response.blob();
                if (cancelled) return;

                objectUrl = URL.createObjectURL(blob);
                setImageSrc(objectUrl);
            } catch (err) {
                if (cancelled) return;

                if (fallbackSrc && !usedFallback && fallbackSrc !== src && activeSource !== fallbackSrc) {
                    setUsedFallback(true);
                    setActiveSource(fallbackSrc);
                    return;
                }

                console.error('[AuthenticatedImage] Error loading image:', err);
                setError(true);
                onErrorRef.current?.(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadImage();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [activeSource, fallbackSrc, src, usedFallback]);

    const handleImageError = (event) => {
        if (fallbackSrc && !usedFallback && fallbackSrc !== src && activeSource !== fallbackSrc) {
            setUsedFallback(true);
            setActiveSource(fallbackSrc);
            return;
        }

        setError(true);
        onErrorRef.current?.(event);
    };

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
            onError={handleImageError}
            {...props}
        />
    );
}

