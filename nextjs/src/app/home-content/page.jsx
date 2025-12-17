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
            type: "text", // "text", "bullets", "image"
            title: "",
            content: "",
            bullets: [],
            imageUrl: ""
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

    const addBullet = (sectionIndex) => {
        const current = getCurrentSections();
        const updated = [...current];
        if (!updated[sectionIndex].bullets) {
            updated[sectionIndex].bullets = [];
        }
        updated[sectionIndex].bullets.push("");
        setCurrentSections(updated);
    };

    const removeBullet = (sectionIndex, bulletIndex) => {
        const current = getCurrentSections();
        const updated = [...current];
        updated[sectionIndex].bullets = updated[sectionIndex].bullets.filter((_, i) => i !== bulletIndex);
        setCurrentSections(updated);
    };

    const updateBullet = (sectionIndex, bulletIndex, value) => {
        const current = getCurrentSections();
        const updated = [...current];
        updated[sectionIndex].bullets[bulletIndex] = value;
        setCurrentSections(updated);
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
                        borderTop: "3px solid #3b82f6",
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
            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
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
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <Link href="/staff" style={{ textDecoration: "none", color: "#3b82f6" }}>
                                ← Volver
                            </Link>
                            <h1 style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#111827",
                                margin: 0
                            }}>
                                Editor de Contenido del Home
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: "8px 24px",
                                backgroundColor: saving ? "#9ca3af" : "#3b82f6",
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
                <main style={{
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
                                    backgroundColor: activeLanguage === "es" ? "#3b82f6" : "transparent",
                                    color: activeLanguage === "es" ? "white" : "#6b7280",
                                    border: "none",
                                    borderRadius: "8px 8px 0 0",
                                    cursor: "pointer",
                                    fontWeight: activeLanguage === "es" ? "600" : "400",
                                    fontSize: "14px"
                                }}
                            >
                                🇪🇸 Español
                            </button>
                            <button
                                onClick={() => setActiveLanguage("en")}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: activeLanguage === "en" ? "#3b82f6" : "transparent",
                                    color: activeLanguage === "en" ? "white" : "#6b7280",
                                    border: "none",
                                    borderRadius: "8px 8px 0 0",
                                    cursor: "pointer",
                                    fontWeight: activeLanguage === "en" ? "600" : "400",
                                    fontSize: "14px"
                                }}
                            >
                                🇬🇧 English
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
                    }}>
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
                            <div key={sectionIndex} style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "16px",
                                marginBottom: "16px"
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

                                <select
                                    value={section.type || "text"}
                                    onChange={(e) => updateSection(sectionIndex, "type", e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        marginBottom: "12px",
                                        fontSize: "14px"
                                    }}
                                >
                                    <option value="text">Texto con párrafo</option>
                                    <option value="bullets">Lista con puntos</option>
                                    <option value="image">Imagen</option>
                                </select>

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
                                        marginBottom: "12px",
                                        fontSize: "14px"
                                    }}
                                />

                                {section.type === "text" && (
                                    <textarea
                                        value={section.content || ""}
                                        onChange={(e) => updateSection(sectionIndex, "content", e.target.value)}
                                        placeholder="Contenido del párrafo"
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

                                {section.type === "bullets" && (
                                    <div>
                                        {(section.bullets || []).map((bullet, bulletIndex) => (
                                            <div key={bulletIndex} style={{
                                                display: "flex",
                                                gap: "8px",
                                                marginBottom: "8px"
                                            }}>
                                                <input
                                                    type="text"
                                                    value={bullet}
                                                    onChange={(e) => updateBullet(sectionIndex, bulletIndex, e.target.value)}
                                                    placeholder={`Punto ${bulletIndex + 1}`}
                                                    style={{
                                                        flex: 1,
                                                        padding: "8px",
                                                        border: "1px solid #d1d5db",
                                                        borderRadius: "6px",
                                                        fontSize: "14px"
                                                    }}
                                                />
                                                <button
                                                    onClick={() => removeBullet(sectionIndex, bulletIndex)}
                                                    style={{
                                                        padding: "8px 12px",
                                                        backgroundColor: "#ef4444",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        fontSize: "12px"
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addBullet(sectionIndex)}
                                            style={{
                                                padding: "6px 12px",
                                                backgroundColor: "#3b82f6",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontSize: "12px"
                                            }}
                                        >
                                            + Agregar Punto
                                        </button>
                                    </div>
                                )}

                                {section.type === "image" && (
                                    <input
                                        type="text"
                                        value={section.imageUrl || ""}
                                        onChange={(e) => updateSection(sectionIndex, "imageUrl", e.target.value)}
                                        placeholder="URL de la imagen"
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px"
                                        }}
                                    />
                                )}
                            </div>
                        ))}

                        {getCurrentSections().length === 0 && (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                                No hay secciones agregadas. Puedes agregar secciones con texto, listas o imágenes.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

