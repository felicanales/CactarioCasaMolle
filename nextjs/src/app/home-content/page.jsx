"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import PhotoUploader from "../../components/PhotoUploader";
import { getApiUrl } from "../../utils/api-config";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const getDynamicApiUrl = () => {
    try {
        return getApiUrl();
    } catch (error) {
        console.error('[home-content] Error getting API URL:', error);
        return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    }
};

const API = typeof window !== 'undefined' ? getDynamicApiUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

const getAccessTokenFromContext = (accessTokenFromContext) => {
    if (accessTokenFromContext) {
        return accessTokenFromContext;
    }
    if (typeof window === 'undefined') return null;
    try {
        let match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
        if (match && match[2]) {
            return match[2];
        }
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sb-access-token' && value) {
                return value;
            }
        }
    } catch (error) {
        console.warn('[home-content] Error reading cookies:', error);
    }
    return null;
};

export default function HomeContentPage() {
    const { user, loading: authLoading, accessToken, apiRequest, csrfToken } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [welcomeTextEs, setWelcomeTextEs] = useState("Bienvenido al Cactario CasaMolle");
    const [welcomeTextEn, setWelcomeTextEn] = useState("Welcome to Cactario CasaMolle");
    const [carouselImages, setCarouselImages] = useState([]);
    const [sectionsEs, setSectionsEs] = useState([]);
    const [sectionsEn, setSectionsEn] = useState([]);
    const [activeLanguage, setActiveLanguage] = useState("es"); // "es" o "en"

    useEffect(() => {
        if (BYPASS_AUTH) {
            loadContent();
            return;
        }
        if (!authLoading && !user) {
            router.replace("/login");
        } else if (user) {
            loadContent();
        }
    }, [user, authLoading, router]);

    const loadContent = async () => {
        try {
            setLoading(true);
            const token = getAccessTokenFromContext(accessToken);
            const res = await apiRequest(`${API}/home-content/staff`, {
                method: "GET",
            }, token);

            if (!res.ok) {
                if (res.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                throw new Error("Error al cargar contenido");
            }

            const data = await res.json();
            setWelcomeTextEs(data.welcome_text_es || "Bienvenido al Cactario CasaMolle");
            setWelcomeTextEn(data.welcome_text_en || "Welcome to Cactario CasaMolle");
            setCarouselImages(data.carousel_images || []);
            setSectionsEs(data.sections_es || []);
            setSectionsEn(data.sections_en || []);
        } catch (err) {
            console.error("Error loading content:", err);
            setError("Error al cargar el contenido del home");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const token = getAccessTokenFromContext(accessToken);
            const payload = {
                welcome_text_es: welcomeTextEs,
                welcome_text_en: welcomeTextEn,
                carousel_images: carouselImages,
                sections_es: sectionsEs,
                sections_en: sectionsEn,
                is_active: true
            };

            const res = await apiRequest(`${API}/home-content/staff`, {
                method: "POST",
                body: JSON.stringify(payload),
            }, token);

            if (!res.ok) {
                if (res.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al guardar");
            }

            setSuccess("Contenido guardado exitosamente");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error saving content:", err);
            setError(err.message || "Error al guardar el contenido");
        } finally {
            setSaving(false);
        }
    };

    const [uploadingImageIndex, setUploadingImageIndex] = useState(null);

    const addCarouselImage = () => {
        setCarouselImages([...carouselImages, { url: "", alt_es: "", alt_en: "" }]);
    };

    const removeCarouselImage = (index) => {
        setCarouselImages(carouselImages.filter((_, i) => i !== index));
    };

    const updateCarouselImage = (index, field, value) => {
        const updated = [...carouselImages];
        updated[index] = { ...updated[index], [field]: value };
        setCarouselImages(updated);
    };

    const handleImageUpload = async (index, file) => {
        if (!file) return;

        setUploadingImageIndex(index);
        setError("");

        try {
            const token = getAccessTokenFromContext(accessToken);
            if (!token) {
                setError("No estás autenticado. Por favor, inicia sesión.");
                setUploadingImageIndex(null);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const csrfTokenValue = csrfToken || null;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            if (csrfTokenValue) {
                headers['X-CSRF-Token'] = csrfTokenValue;
            }

            const uploadRes = await fetch(`${API}/home-content/staff/upload-image`, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            if (!uploadRes.ok) {
                if (uploadRes.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await uploadRes.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al subir la imagen");
            }

            const uploadData = await uploadRes.json();

            // Actualizar la imagen en el índice correspondiente
            const updated = [...carouselImages];
            updated[index] = {
                ...updated[index],
                url: uploadData.url,
                alt_es: updated[index].alt_es || uploadData.alt || file.name,
                alt_en: updated[index].alt_en || uploadData.alt || file.name
            };
            setCarouselImages(updated);
            setSuccess("Imagen subida exitosamente");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error uploading image:", err);
            setError(err.message || "Error al subir la imagen");
        } finally {
            setUploadingImageIndex(null);
        }
    };

    // Funciones para manejar secciones según el idioma activo
    const getCurrentSections = () => activeLanguage === "es" ? sectionsEs : sectionsEn;
    const setCurrentSections = (newSections) => {
        if (activeLanguage === "es") {
            setSectionsEs(newSections);
        } else {
            setSectionsEn(newSections);
        }
    };

    const addSection = () => {
        const current = getCurrentSections();
        setCurrentSections([...current, {
            title: "",
            items: [] // Array de items: { type: "paragraph" | "image", content: "...", imageUrl: "...", alt: "..." }
        }]);
    };

    const removeSection = (index) => {
        const current = getCurrentSections();
        setCurrentSections(current.filter((_, i) => i !== index));
    };

    const updateSection = (index, field, value) => {
        const current = getCurrentSections();
        const updated = [...current];
        updated[index] = { ...updated[index], [field]: value };
        setCurrentSections(updated);
    };

    // Funciones para manejar items dentro de secciones
    const addItem = (sectionIndex, itemType) => {
        const current = getCurrentSections();
        const updated = [...current];
        if (!updated[sectionIndex].items) {
            updated[sectionIndex].items = [];
        }
        updated[sectionIndex].items.push({
            type: itemType, // "paragraph" o "image"
            content: "",
            imageUrl: "",
            alt: ""
        });
        setCurrentSections(updated);
    };

    const removeItem = (sectionIndex, itemIndex) => {
        const current = getCurrentSections();
        const updated = [...current];
        updated[sectionIndex].items = updated[sectionIndex].items.filter((_, i) => i !== itemIndex);
        setCurrentSections(updated);
    };

    const updateItem = (sectionIndex, itemIndex, field, value) => {
        const current = getCurrentSections();
        const updated = [...current];
        updated[sectionIndex].items[itemIndex] = {
            ...updated[sectionIndex].items[itemIndex],
            [field]: value
        };
        setCurrentSections(updated);
    };

    const moveItem = (sectionIndex, itemIndex, direction) => {
        const current = getCurrentSections();
        const updated = [...current];
        const items = updated[sectionIndex].items;
        if (direction === "up" && itemIndex > 0) {
            [items[itemIndex], items[itemIndex - 1]] = [items[itemIndex - 1], items[itemIndex]];
        } else if (direction === "down" && itemIndex < items.length - 1) {
            [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
        }
        setCurrentSections(updated);
    };

    const handleSectionImageUpload = async (sectionIndex, itemIndex, file) => {
        if (!file) return;

        setUploadingImageIndex(`section-${sectionIndex}-item-${itemIndex}`);
        setError("");

        try {
            const token = getAccessTokenFromContext(accessToken);
            if (!token) {
                setError("No estás autenticado. Por favor, inicia sesión.");
                setUploadingImageIndex(null);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const csrfTokenValue = csrfToken || null;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            if (csrfTokenValue) {
                headers['X-CSRF-Token'] = csrfTokenValue;
            }

            const uploadRes = await fetch(`${API}/home-content/staff/upload-image`, {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            if (!uploadRes.ok) {
                if (uploadRes.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await uploadRes.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al subir la imagen");
            }

            const uploadData = await uploadRes.json();
            updateItem(sectionIndex, itemIndex, "imageUrl", uploadData.url);
            updateItem(sectionIndex, itemIndex, "alt", uploadData.alt || file.name);
            setSuccess("Imagen subida exitosamente");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error uploading image:", err);
            setError(err.message || "Error al subir la imagen");
        } finally {
            setUploadingImageIndex(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f9fafb"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        border: "3px solid #e5e7eb",
                                    borderTop: "3px solid #5a6b3d",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto"
                    }}></div>
                    <p style={{ marginTop: "12px", color: "#6b7280" }}>Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user && !BYPASS_AUTH) {
        return null;
    }

    return (
        <>
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .editor-container {
                    width: 100%;
                }
                
                @media (min-width: 768px) {
                    .editor-container {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 24px;
                        padding: 32px !important;
                    }
                    
                    .welcome-card {
                        padding: 32px !important;
                    }
                    
                    .section-card {
                        transition: transform 0.2s, box-shadow 0.2s;
                        padding: 24px !important;
                    }
                    
                    .section-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    
                    .item-card {
                        transition: background-color 0.2s;
                        padding: 16px !important;
                    }
                    
                    .item-card:hover {
                        background-color: #f3f4f6;
                    }
                }
                
                @media (min-width: 1024px) {
                    .editor-container {
                        grid-template-columns: 1fr;
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                }
            `}</style>

            <div style={{
                minHeight: "100vh",
                backgroundColor: "#f9fafb"
            }}>
                {/* Header */}
                <header style={{
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "16px 24px",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    <div style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 12px)", flex: 1, minWidth: "200px" }}>
                            <Link href="/staff" style={{
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "white",
                                color: "#374151",
                                textDecoration: "none",
                                fontSize: "14px",
                                transition: "all 0.2s",
                                flexShrink: 0
                            }}>
                                ←
                            </Link>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{
                                    fontSize: "clamp(16px, 4vw, 20px)",
                                    fontWeight: "700",
                                    color: "#111827",
                                    margin: 0
                                }}>
                                    Editor de Contenido del Home
                                </h1>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: "8px 24px",
                                backgroundColor: saving ? "#9ca3af" : "#5a6b3d",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: saving ? "not-allowed" : "pointer",
                                fontWeight: "600",
                                fontSize: "14px"
                            }}
                        >
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="editor-container" style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "24px"
                }}>
                    {error && (
                        <div style={{
                            backgroundColor: "#fee2e2",
                            border: "1px solid #fecaca",
                            color: "#991b1b",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            marginBottom: "24px"
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            backgroundColor: "#d1fae5",
                            border: "1px solid #a7f3d0",
                            color: "#065f46",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            marginBottom: "24px"
                        }}>
                            {success}
                        </div>
                    )}

                    {/* Language Tabs */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "16px 24px",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                        <div style={{
                            display: "flex",
                            gap: "8px",
                            borderBottom: "2px solid #e5e7eb"
                        }}>
                            <button
                                onClick={() => setActiveLanguage("es")}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: activeLanguage === "es" ? "#5a6b3d" : "transparent",
                                    color: activeLanguage === "es" ? "white" : "#6b7280",
                                    border: "none",
                                    borderRadius: "8px 8px 0 0",
                                    cursor: "pointer",
                                    fontWeight: activeLanguage === "es" ? "600" : "400",
                                    fontSize: "14px"
                                }}
                            >
                                ES
                            </button>
                            <button
                                onClick={() => setActiveLanguage("en")}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: activeLanguage === "en" ? "#5a6b3d" : "transparent",
                                    color: activeLanguage === "en" ? "white" : "#6b7280",
                                    border: "none",
                                    borderRadius: "8px 8px 0 0",
                                    cursor: "pointer",
                                    fontWeight: activeLanguage === "en" ? "600" : "400",
                                    fontSize: "14px"
                                }}
                            >
                                EN
                            </button>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "24px",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }} className="welcome-card">
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            marginBottom: "12px",
                            color: "#111827"
                        }}>
                            Texto de Bienvenida ({activeLanguage === "es" ? "Español" : "English"})
                        </h2>
                        <input
                            type="text"
                            value={activeLanguage === "es" ? welcomeTextEs : welcomeTextEn}
                            onChange={(e) => {
                                if (activeLanguage === "es") {
                                    setWelcomeTextEs(e.target.value);
                                } else {
                                    setWelcomeTextEn(e.target.value);
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "16px"
                            }}
                            placeholder={activeLanguage === "es" ? "Bienvenido al Cactario CasaMolle" : "Welcome to Cactario CasaMolle"}
                        />
                    </div>

                    {/* Carousel Images */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "24px",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px"
                        }}>
                            <h2 style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: "#111827",
                                margin: 0
                            }}>
                                Imágenes del Carrusel
                            </h2>
                            <button
                                onClick={addCarouselImage}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500"
                                }}
                            >
                                + Agregar Imagen
                            </button>
                        </div>

                        {carouselImages.map((img, index) => (
                            <div key={index} style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "16px",
                                marginBottom: "12px"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "12px"
                                }}>
                                    <span style={{ fontWeight: "500", color: "#374151" }}>
                                        Imagen {index + 1}
                                    </span>
                                    <button
                                        onClick={() => removeCarouselImage(index)}
                                        style={{
                                            padding: "4px 12px",
                                            backgroundColor: "#ef4444",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                                <div style={{ marginBottom: "8px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "4px"
                                    }}>
                                        Subir imagen desde archivo:
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleImageUpload(index, file);
                                            }
                                        }}
                                        disabled={uploadingImageIndex === index}
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            cursor: uploadingImageIndex === index ? "not-allowed" : "pointer"
                                        }}
                                    />
                                    {uploadingImageIndex === index && (
                                        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                            Subiendo...
                                        </p>
                                    )}
                                    {img.url && uploadingImageIndex !== index && (
                                        <div style={{ marginTop: "8px" }}>
                                            <img
                                                src={img.url}
                                                alt={img.alt_es || img.alt || `Imagen ${index + 1}`}
                                                style={{
                                                    maxWidth: "100%",
                                                    maxHeight: "200px",
                                                    borderRadius: "8px",
                                                    objectFit: "cover",
                                                    marginBottom: "8px"
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                            <p style={{ fontSize: "12px", color: "#10b981" }}>
                                                ✓ Imagen subida correctamente
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: "8px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "4px"
                                    }}>
                                        Texto alternativo (alt) - Español:
                                    </label>
                                    <input
                                        type="text"
                                        value={img.alt_es || img.alt || ""}
                                        onChange={(e) => updateCarouselImage(index, "alt_es", e.target.value)}
                                        placeholder="Texto alternativo en español"
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            marginBottom: "8px"
                                        }}
                                    />
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "4px"
                                    }}>
                                        Texto alternativo (alt) - English:
                                    </label>
                                    <input
                                        type="text"
                                        value={img.alt_en || img.alt || ""}
                                        onChange={(e) => updateCarouselImage(index, "alt_en", e.target.value)}
                                        placeholder="Alternative text in English"
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px"
                                        }}
                                    />
                                </div>
                                {img.url && (
                                    <div style={{ marginTop: "12px" }}>
                                        <img
                                            src={img.url}
                                            alt={img.alt_es || img.alt || `Imagen ${index + 1}`}
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "200px",
                                                borderRadius: "8px",
                                                objectFit: "cover"
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = "none";
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {carouselImages.length === 0 && (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                                No hay imágenes agregadas. Las imágenes se mostrarán en un carrusel que rota cada 5 segundos.
                            </p>
                        )}
                    </div>

                    {/* Sections */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "24px",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px"
                        }}>
                            <h2 style={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: "#111827",
                                margin: 0
                            }}>
                                Secciones de Contenido ({activeLanguage === "es" ? "Español" : "English"})
                            </h2>
                            <button
                                onClick={addSection}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500"
                                }}
                            >
                                + Agregar Sección
                            </button>
                        </div>

                        {getCurrentSections().map((section, sectionIndex) => (
                            <div key={sectionIndex} className="section-card" style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "12px",
                                padding: "24px",
                                marginBottom: "24px",
                                backgroundColor: "white",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                borderLeft: "4px solid #5a6b3d"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "12px"
                                }}>
                                    <span style={{ fontWeight: "500", color: "#374151" }}>
                                        Sección {sectionIndex + 1}
                                    </span>
                                    <button
                                        onClick={() => removeSection(sectionIndex)}
                                        style={{
                                            padding: "4px 12px",
                                            backgroundColor: "#ef4444",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={section.title || ""}
                                    onChange={(e) => updateSection(sectionIndex, "title", e.target.value)}
                                    placeholder="Título de la sección"
                                    style={{
                                        width: "100%",
                                        padding: "8px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        marginBottom: "16px",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                />

                                {/* Items de la sección */}
                                <div style={{ marginBottom: "16px" }}>
                                    {(section.items || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="item-card" style={{
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "8px",
                                            padding: "16px",
                                            marginBottom: "12px",
                                            backgroundColor: "#f9fafb"
                                        }}>
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "8px"
                                            }}>
                                                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>
                                                    {item.type === "paragraph" ? "📝 Párrafo" : "🖼️ Imagen"}
                                                </span>
                                                <div style={{ display: "flex", gap: "4px" }}>
                                                    <button
                                                        onClick={() => moveItem(sectionIndex, itemIndex, "up")}
                                                        disabled={itemIndex === 0}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: itemIndex === 0 ? "#d1d5db" : "#6b7280",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: itemIndex === 0 ? "not-allowed" : "pointer",
                                                            fontSize: "10px"
                                                        }}
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        onClick={() => moveItem(sectionIndex, itemIndex, "down")}
                                                        disabled={itemIndex === (section.items || []).length - 1}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: itemIndex === (section.items || []).length - 1 ? "#d1d5db" : "#6b7280",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: itemIndex === (section.items || []).length - 1 ? "not-allowed" : "pointer",
                                                            fontSize: "10px"
                                                        }}
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(sectionIndex, itemIndex)}
                                                        style={{
                                                            padding: "4px 8px",
                                                            backgroundColor: "#ef4444",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            fontSize: "10px"
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>

                                            {item.type === "paragraph" && (
                                                <textarea
                                                    value={item.content || ""}
                                                    onChange={(e) => updateItem(sectionIndex, itemIndex, "content", e.target.value)}
                                                    placeholder="Escribe el párrafo aquí..."
                                                    rows={4}
                                                    style={{
                                                        width: "100%",
                                                        padding: "8px",
                                                        border: "1px solid #d1d5db",
                                                        borderRadius: "6px",
                                                        fontSize: "14px",
                                                        fontFamily: "inherit"
                                                    }}
                                                />
                                            )}

                                            {item.type === "image" && (
                                                <div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleSectionImageUpload(sectionIndex, itemIndex, file);
                                                            }
                                                        }}
                                                        disabled={uploadingImageIndex === `section-${sectionIndex}-item-${itemIndex}`}
                                                        style={{
                                                            width: "100%",
                                                            padding: "8px",
                                                            border: "1px solid #d1d5db",
                                                            borderRadius: "6px",
                                                            fontSize: "14px",
                                                            marginBottom: "8px",
                                                            cursor: uploadingImageIndex === `section-${sectionIndex}-item-${itemIndex}` ? "not-allowed" : "pointer"
                                                        }}
                                                    />
                                                    {uploadingImageIndex === `section-${sectionIndex}-item-${itemIndex}` && (
                                                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                                                            Subiendo...
                                                        </p>
                                                    )}
                                                    {item.imageUrl && (
                                                        <div style={{ marginTop: "8px" }}>
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.alt || `Imagen ${itemIndex + 1}`}
                                                                style={{
                                                                    maxWidth: "100%",
                                                                    maxHeight: "200px",
                                                                    borderRadius: "8px",
                                                                    objectFit: "cover"
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.style.display = "none";
                                                                }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={item.alt || ""}
                                                                onChange={(e) => updateItem(sectionIndex, itemIndex, "alt", e.target.value)}
                                                                placeholder="Texto alternativo (alt)"
                                                                style={{
                                                                    width: "100%",
                                                                    padding: "8px",
                                                                    border: "1px solid #d1d5db",
                                                                    borderRadius: "6px",
                                                                    fontSize: "14px",
                                                                    marginTop: "8px"
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Botones para agregar items */}
                                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                    <button
                                        onClick={() => addItem(sectionIndex, "paragraph")}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#5a6b3d",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}
                                    >
                                        + Agregar Párrafo
                                    </button>
                                    <button
                                        onClick={() => addItem(sectionIndex, "image")}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#10b981",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "12px",
                                            fontWeight: "500"
                                        }}
                                    >
                                        + Agregar Imagen
                                    </button>
                                </div>
                            </div>
                        ))}

                        {getCurrentSections().length === 0 && (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                                No hay secciones agregadas. Puedes agregar secciones con párrafos e imágenes intercalados.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

