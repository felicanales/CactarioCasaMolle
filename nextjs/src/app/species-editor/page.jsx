"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('railway.app') || hostname.includes('ngrok.io') ||
            hostname.includes('ngrok-free.app') || hostname.includes('ngrok-free.dev') ||
            hostname.includes('ngrokapp.com')) {
            return "https://cactariocasamolle-production.up.railway.app";
        }
    }
    return "http://localhost:8000";
};

const API = getApiUrl();

const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    const localStorageToken = localStorage.getItem('access_token');
    if (localStorageToken) return localStorageToken;
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    return match ? match[2] : null;
};

const getCsrfToken = () => {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
        return match ? match[2] : null;
    }
    return null;
};

const apiRequest = async (url, options = {}) => {
    const accessToken = getAccessToken();
    const csrfToken = getCsrfToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
};

export default function SpeciesEditorPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [species, setSpecies] = useState([]);
    const [filteredSpecies, setFilteredSpecies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [formData, setFormData] = useState({
        scientific_name: "", nombre_común: "", nombres_comunes: "",
        tipo_planta: "", tipo_morfología: "", habitat: "",
        distribución: "", estado_conservación: "", categoria_conservacion: "", Endémica: false,
        expectativa_vida: "", floración: "", cuidado: "",
        usos: "", historia_nombre: "", historia_y_leyendas: "", image_url: ""
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (BYPASS_AUTH) return;
        if (!authLoading && !user) {
            router.replace("/login");
        }
    }, [user, authLoading, router]);

    const fetchSpecies = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await apiRequest(`${API}/species/staff`);

            if (!res.ok) {
                if (res.status === 401 && !BYPASS_AUTH) {
                    setError("Sesión expirada");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al cargar especies");
            }

            const data = await res.json();
            setSpecies(data);
            setFilteredSpecies(data);
        } catch (err) {
            setError(err.message || "Error al cargar especies");
            console.error('Error loading species:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user || BYPASS_AUTH) {
            fetchSpecies();
        }
    }, [user]);

    const handleSelect = (sp) => {
        setSelectedSpecies(sp);
        setFormData({
            scientific_name: sp.scientific_name || "",
            nombre_común: sp.nombre_común || "",
            nombres_comunes: sp.nombres_comunes || "",
            tipo_planta: sp.tipo_planta || "",
            tipo_morfología: sp.tipo_morfología || "",
            habitat: sp.habitat || "",
            distribución: sp.distribución || "",
            estado_conservación: sp.estado_conservación || "",
            categoria_conservacion: sp.categoria_conservacion || "",
            Endémica: sp.Endémica || false,
            expectativa_vida: sp.expectativa_vida || "",
            floración: sp.floración || "",
            cuidado: sp.cuidado || "",
            usos: sp.usos || "",
            historia_nombre: sp.historia_nombre || "",
            historia_y_leyendas: sp.historia_y_leyendas || "",
            image_url: sp.image_url || ""
        });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const slug = formData.scientific_name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
            const res = await apiRequest(`${API}/species/staff/${selectedSpecies.id}`, {
                method: "PUT",
                body: JSON.stringify({ ...formData, slug })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al guardar");
            }

            setError("✅ Cambios guardados correctamente");
            // Recargar especies para ver los cambios
            fetchSpecies();

            // Limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setError(""), 3000);
        } catch (err) {
            setError(err.message || "Error al guardar");
            console.error('Error saving species:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !user && !BYPASS_AUTH) {
        return (
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center",
                justifyContent: "center", backgroundColor: "#f9fafb"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: "48px", height: "48px", border: "4px solid #e5e7eb",
                        borderTop: "4px solid #10b981", borderRadius: "50%",
                        animation: "spin 1s linear infinite", margin: "0 auto 16px"
                    }}></div>
                    <p style={{ color: "#6b7280" }}>Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user && !BYPASS_AUTH) return null;

    return (
        <>
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                /* Asegurar que el contenido del editor no se salga */
                .editor-content {
                    overflow-x: hidden !important;
                    box-sizing: border-box !important;
                }
                
                .editor-content * {
                    box-sizing: border-box !important;
                    max-width: 100% !important;
                }
                
                .editor-content input,
                .editor-content textarea,
                .editor-content select {
                    box-sizing: border-box !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                @media (max-width: 1024px) {
                    .editor-layout {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .species-list {
                        max-height: 400px !important;
                        margin-bottom: 24px;
                    }
                    
                    .editor-content {
                        padding: 20px !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .grid-2-cols {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .editor-content {
                        padding: 16px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .species-list-item {
                        padding: 10px 12px !important;
                        font-size: 13px !important;
                    }
                    
                    .editor-content {
                        padding: 12px !important;
                    }
                }
            `}</style>

            <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
                <header style={{
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px clamp(12px, 4vw, 24px)",
                    position: "sticky", top: 0, zIndex: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    <div style={{
                        maxWidth: "1400px", margin: "0 auto",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: "8px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                            <Link href="/staff" style={{
                                padding: "8px", borderRadius: "6px",
                                border: "1px solid #e5e7eb", backgroundColor: "white",
                                color: "#374151", textDecoration: "none",
                                fontSize: "14px", transition: "all 0.2s", flexShrink: 0
                            }}>
                                ←
                            </Link>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{
                                    fontSize: "clamp(16px, 4vw, 20px)",
                                    fontWeight: "700", color: "#111827", margin: 0
                                }}>
                                    Editor de Contenido Móvil
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
                                    color: "#6b7280", margin: 0
                                }}>
                                    Edita información para la App de Escaneo QR
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="editor-layout" style={{
                    maxWidth: "1400px", margin: "0 auto",
                    padding: "clamp(24px, 5vw, 32px) 24px",
                    display: "grid",
                    gridTemplateColumns: "minmax(300px, 400px) 1fr",
                    gap: "24px"
                }}>
                    {/* Lista de especies */}
                    <div className="species-list" style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        padding: "16px",
                        maxHeight: "calc(100vh - 150px)",
                        overflowY: "auto"
                    }}>
                        <div style={{
                            padding: "12px 16px",
                            backgroundColor: "#eff6ff",
                            borderRadius: "8px",
                            marginBottom: "16px",
                            border: "1px solid #dbeafe"
                        }}>
                            <h3 style={{
                                fontSize: "14px", fontWeight: "600",
                                color: "#1e40af", margin: "0 0 4px 0"
                            }}>
                                📱 Información para App QR
                            </h3>
                            <p style={{
                                fontSize: "12px", color: "#1e40af",
                                margin: 0, lineHeight: "1.4"
                            }}>
                                Elige una especie para editar su información que aparecerá cuando se escanee el código QR.
                            </p>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar especie..."
                            onChange={(e) => {
                                const query = e.target.value.toLowerCase();
                                const filtered = species.filter(s =>
                                    s.scientific_name.toLowerCase().includes(query) ||
                                    s.nombre_común?.toLowerCase().includes(query)
                                );
                                setFilteredSpecies(filtered);
                            }}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                marginBottom: "16px",
                                outline: "none"
                            }}
                        />

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {filteredSpecies.length === 0 ? (
                                <div style={{
                                    padding: "32px 16px",
                                    textAlign: "center",
                                    color: "#9ca3af"
                                }}>
                                    No hay especies que coincidan con la búsqueda
                                </div>
                            ) : (
                                filteredSpecies.map((sp) => (
                                    <button
                                        key={sp.id}
                                        className="species-list-item"
                                        onClick={() => handleSelect(sp)}
                                        style={{
                                            padding: "12px 16px",
                                            border: selectedSpecies?.id === sp.id
                                                ? "2px solid #ec4899"
                                                : "1px solid #e5e7eb",
                                            borderRadius: "8px",
                                            backgroundColor: selectedSpecies?.id === sp.id
                                                ? "#fce7f3"
                                                : "white",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            width: "100%"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedSpecies?.id !== sp.id) {
                                                e.target.style.backgroundColor = "#f9fafb";
                                                e.target.style.borderColor = "#d1d5db";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedSpecies?.id !== sp.id) {
                                                e.target.style.backgroundColor = "white";
                                                e.target.style.borderColor = "#e5e7eb";
                                            }
                                        }}
                                    >
                                        <div style={{
                                            fontSize: "14px", fontWeight: "600",
                                            color: "#111827", marginBottom: "4px",
                                            fontStyle: "italic"
                                        }}>
                                            {sp.scientific_name}
                                        </div>
                                        <div style={{
                                            fontSize: "12px",
                                            color: "#6b7280",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "2px"
                                        }}>
                                            {sp.nombre_común ? (
                                                <span>{sp.nombre_común}</span>
                                            ) : (
                                                <span style={{ fontStyle: "italic", color: "#9ca3af" }}>
                                                    Sin nombre común
                                                </span>
                                            )}
                                            {sp.nombres_comunes && sp.nombres_comunes !== sp.nombre_común && (
                                                <span style={{
                                                    fontSize: "11px",
                                                    color: "#9ca3af",
                                                    fontStyle: "italic"
                                                }}>
                                                    ({sp.nombres_comunes})
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="editor-content" style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        padding: "24px"
                    }}>
                        {!selectedSpecies ? (
                            <div style={{
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                padding: "60px 20px", textAlign: "center"
                            }}>
                                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📝</div>
                                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>
                                    Selecciona una especie
                                </h3>
                                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                                    Elige una especie de la lista para comenzar a editar su información que se mostrará en la app móvil.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    alignItems: "center", marginBottom: "24px"
                                }}>
                                    <div>
                                        <h2 style={{
                                            fontSize: "20px", fontWeight: "700",
                                            color: "#111827", margin: "0 0 4px 0",
                                            fontStyle: "italic"
                                        }}>
                                            {selectedSpecies.scientific_name}
                                        </h2>
                                        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                                            {selectedSpecies.nombre_común || "Sin nombre común"}
                                        </p>
                                    </div>
                                    <span style={{
                                        padding: "4px 12px", borderRadius: "12px",
                                        fontSize: "12px", fontWeight: "600",
                                        backgroundColor: "#eff6ff", color: "#1e40af"
                                    }}>
                                        CONTENIDO APP QR
                                    </span>
                                </div>

                                {error && (
                                    <div style={{
                                        padding: "12px", backgroundColor: "#fef2f2",
                                        border: "1px solid #fecaca", borderRadius: "6px",
                                        color: "#dc2626", fontSize: "14px", marginBottom: "16px"
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                                        {/* Imagen */}
                                        <div>
                                            <label style={{
                                                display: "block", fontSize: "12px",
                                                fontWeight: "500", color: "#111827", marginBottom: "6px"
                                            }}>
                                                Imagen de Portada
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.image_url}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                placeholder="URL de imagen"
                                                style={{
                                                    width: "100%",
                                                    padding: "6px 10px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: "6px",
                                                    fontSize: "13px"
                                                }}
                                            />
                                        </div>

                                        {/* Información Básica */}
                                        <div style={{
                                            padding: "10px", backgroundColor: "#f9fafb",
                                            borderRadius: "8px", border: "1px solid #e5e7eb"
                                        }}>
                                            <h3 style={{
                                                fontSize: "12px", fontWeight: "600",
                                                color: "#111827", margin: "0 0 8px 0"
                                            }}>
                                                Información Básica
                                            </h3>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Nombre Común
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.nombre_común}
                                                        onChange={(e) => setFormData({ ...formData, nombre_común: e.target.value })}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Estado de Conservación (Descripción Libre)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.estado_conservación}
                                                        onChange={(e) => setFormData({ ...formData, estado_conservación: e.target.value })}
                                                        placeholder="Ej: Endémica de Chile central"
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Categoría de Conservación
                                                    </label>
                                                    <select
                                                        value={formData.categoria_conservacion}
                                                        onChange={(e) => setFormData({ ...formData, categoria_conservacion: e.target.value })}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                        }}
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        <option value="No amenazado">No amenazado</option>
                                                        <option value="Preocupación menor">Preocupación menor</option>
                                                        <option value="Protegido">Protegido</option>
                                                        <option value="En peligro de extinción">En peligro de extinción</option>
                                                    </select>
                                                </div>
                                                <label style={{
                                                    display: "flex", alignItems: "center", gap: "8px",
                                                    fontSize: "14px", fontWeight: "500", cursor: "pointer"
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.Endémica}
                                                        onChange={(e) => setFormData({ ...formData, Endémica: e.target.checked })}
                                                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                                    />
                                                    Endémica de Chile 🇨🇱
                                                </label>
                                            </div>
                                        </div>

                                        {/* Descripciones */}
                                        <div style={{
                                            padding: "16px", backgroundColor: "#f9fafb",
                                            borderRadius: "8px", border: "1px solid #e5e7eb"
                                        }}>
                                            <h3 style={{
                                                fontSize: "14px", fontWeight: "600",
                                                color: "#111827", margin: "0 0 12px 0"
                                            }}>
                                                Descripciones
                                            </h3>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Hábitat
                                                    </label>
                                                    <textarea
                                                        value={formData.habitat}
                                                        onChange={(e) => setFormData({ ...formData, habitat: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Cuidado y Recomendaciones
                                                    </label>
                                                    <textarea
                                                        value={formData.cuidado}
                                                        onChange={(e) => setFormData({ ...formData, cuidado: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Usos
                                                    </label>
                                                    <textarea
                                                        value={formData.usos}
                                                        onChange={(e) => setFormData({ ...formData, usos: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Información Taxonómica */}
                                        <div style={{
                                            padding: "10px", backgroundColor: "#f9fafb",
                                            borderRadius: "8px", border: "1px solid #e5e7eb"
                                        }}>
                                            <h3 style={{
                                                fontSize: "12px", fontWeight: "600",
                                                color: "#111827", margin: "0 0 8px 0"
                                            }}>
                                                Información Taxonómica
                                            </h3>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <div>
                                                    <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Nombres Comunes (separados por comas)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.nombres_comunes}
                                                        onChange={(e) => setFormData({ ...formData, nombres_comunes: e.target.value })}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                            Tipo de Planta
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.tipo_planta}
                                                            onChange={(e) => setFormData({ ...formData, tipo_planta: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "6px 10px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                            Tipo de Morfología
                                                        </label>
                                                        <select
                                                            value={formData.tipo_morfología}
                                                            onChange={(e) => setFormData({ ...formData, tipo_morfología: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "6px 10px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                            }}
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            <option value="Globosa">Globosa</option>
                                                            <option value="Columnar">Columnar</option>
                                                            <option value="Arbustiva">Arbustiva</option>
                                                            <option value="Rastrera">Rastrera</option>
                                                            <option value="Trepadora">Trepadora</option>
                                                            <option value="Cilíndrica">Cilíndrica</option>
                                                            <option value="Aplanada">Aplanada</option>
                                                            <option value="Cladodio">Cladodio</option>
                                                            <option value="Otro">Otro</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Distribución
                                                    </label>
                                                    <textarea
                                                        value={formData.distribución}
                                                        onChange={(e) => setFormData({ ...formData, distribución: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                            Expectativa de Vida
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.expectativa_vida}
                                                            onChange={(e) => setFormData({ ...formData, expectativa_vida: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "6px 10px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                            Floración
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.floración}
                                                            onChange={(e) => setFormData({ ...formData, floración: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "6px 10px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Historia y Leyendas */}
                                        <div style={{
                                            padding: "10px", backgroundColor: "#f9fafb",
                                            borderRadius: "8px", border: "1px solid #e5e7eb"
                                        }}>
                                            <h3 style={{
                                                fontSize: "12px", fontWeight: "600",
                                                color: "#111827", margin: "0 0 8px 0"
                                            }}>
                                                Historia y Cultura
                                            </h3>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                <div>
                                                    <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Historia del Nombre
                                                    </label>
                                                    <textarea
                                                        value={formData.historia_nombre}
                                                        onChange={(e) => setFormData({ ...formData, historia_nombre: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }}>
                                                        Historia y Leyendas
                                                    </label>
                                                    <textarea
                                                        value={formData.historia_y_leyendas}
                                                        onChange={(e) => setFormData({ ...formData, historia_y_leyendas: e.target.value })}
                                                        rows={2}
                                                        style={{
                                                            width: "100%", padding: "6px 10px",
                                                            border: "1px solid #d1d5db", borderRadius: "6px",
                                                            fontSize: "13px", fontFamily: "inherit", resize: "vertical"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones */}
                                        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                style={{
                                                    flex: 1, padding: "12px 20px",
                                                    backgroundColor: "#10b981", color: "white",
                                                    border: "none", borderRadius: "8px",
                                                    fontSize: "14px", fontWeight: "600",
                                                    cursor: submitting ? "not-allowed" : "pointer",
                                                    opacity: submitting ? 0.6 : 1
                                                }}
                                            >
                                                {submitting ? "Guardando..." : "💾 Guardar Cambios"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

