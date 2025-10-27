"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está ACTIVADO en desarrollo local (no requiere .env)
// Para desactivar: setear NEXT_PUBLIC_BYPASS_AUTH=false en producción
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

// Configuración dinámica de API
const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Si se accede por ngrok o railway, usar backend de producción
        if (hostname.includes('railway.app') ||
            hostname.includes('ngrok.io') ||
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev') ||
            hostname.includes('ngrokapp.com')) {
            return "https://cactariocasamolle-production.up.railway.app";
        }
    }

    return "http://localhost:8000";
};

const API = getApiUrl();

// Helper para obtener el access token de localStorage o cookies
const getAccessToken = () => {
    if (typeof window === 'undefined') return null;

    // Prioridad 1: localStorage (para compatibilidad)
    const localStorageToken = localStorage.getItem('access_token');
    if (localStorageToken) {
        return localStorageToken;
    }

    // Prioridad 2: cookies
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match) {
        return match[2];
    }

    return null;
};

// Helper para obtener CSRF token
const getCsrfToken = () => {
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
        return match ? match[2] : null;
    }
    return null;
};

// Helper para requests autenticadas
const apiRequest = async (url, options = {}) => {
    const accessToken = getAccessToken();
    const csrfToken = getCsrfToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Agregar CSRF token para operaciones que modifican datos
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
        console.log('[SpeciesPage] Adding CSRF token to:', options.method, url);
    }

    // Agregar Authorization header si hay token disponible
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log('[SpeciesPage] Adding Authorization header to:', url);
    } else {
        console.warn('[SpeciesPage] ⚠️ No access token available for:', url);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
};

// Modal Component
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#111827',
                        margin: 0
                    }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#e5e7eb';
                            e.target.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.color = '#6b7280';
                        }}
                    >
                        ×
                    </button>
                </div>
                <div style={{ padding: '24px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function SpeciesPage() {
    const { user, loading: authLoading, logout, fetchMe } = useAuth();
    const router = useRouter();

    const [species, setSpecies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit" | "view"
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [checkedAuth, setCheckedAuth] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [speciesIdToDelete, setSpeciesIdToDelete] = useState(null);
    const [formData, setFormData] = useState({
        scientific_name: "",
        nombre_común: "",
        nombres_comunes: "",
        tipo_planta: "",
        tipo_morfología: "",
        habitat: "",
        distribución: "",
        estado_conservación: "",
        Endémica: false,
        expectativa_vida: "",
        floración: "",
        cuidado: "",
        usos: "",
        historia_nombre: "",
        historia_y_leyendas: "",
        image_url: "", // URL de la imagen de la especie
    });
    const [submitting, setSubmitting] = useState(false);

    // Verificar autenticación solo UNA vez
    useEffect(() => {
        // BYPASS: No redirigir en desarrollo
        if (BYPASS_AUTH) {
            setCheckedAuth(true);
            return;
        }

        if (!authLoading && !checkedAuth) {
            console.log('[SpeciesPage] Checking auth, user:', user);
            if (!user) {
                console.log('[SpeciesPage] No user, redirecting to login');
                router.replace("/login");
            }
            setCheckedAuth(true);
        }
    }, [user, authLoading, router, checkedAuth]);

    // Fetch species
    const fetchSpecies = async () => {
        try {
            setLoading(true);
            setError("");

            const url = searchQuery
                ? `${API}/species/staff?q=${encodeURIComponent(searchQuery)}`
                : `${API}/species/staff`;

            console.log('[SpeciesPage] Fetching species from:', url);
            const res = await apiRequest(url);

            if (!res.ok) {
                console.error('[SpeciesPage] Fetch failed:', res.status);
                if (res.status === 401 && !BYPASS_AUTH) {
                    // Usuario no autenticado - redirigir a login
                    console.log('[SpeciesPage] 401 Unauthorized, redirecting to login');
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al cargar especies");
            }
            const data = await res.json();
            console.log('[SpeciesPage] Species loaded:', data.length);
            setSpecies(data);
            setError("");
        } catch (err) {
            console.error('[SpeciesPage] Error:', err);
            setError(err.message || "Error al cargar especies");
        } finally {
            setLoading(false);
        }
    };

    // Cargar especies solo cuando el usuario esté autenticado y se haya verificado
    useEffect(() => {
        if (user && checkedAuth) {
            console.log('[SpeciesPage] User authenticated, loading species');
            fetchSpecies();
        }
    }, [user, checkedAuth, searchQuery]);

    const handleCreate = () => {
        setModalMode("create");
        setSelectedSpecies(null);
        setFormData({
            scientific_name: "",
            nombre_común: "",
            nombres_comunes: "",
            tipo_planta: "",
            tipo_morfología: "",
            habitat: "",
            distribución: "",
            estado_conservación: "",
            Endémica: false,
            expectativa_vida: "",
            floración: "",
            cuidado: "",
            usos: "",
            historia_nombre: "",
            historia_y_leyendas: "",
            image_url: "",
        });
        setShowModal(true);
    };

    const handleEdit = (sp) => {
        setModalMode("edit");
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
            Endémica: sp.Endémica || false,
            expectativa_vida: sp.expectativa_vida || "",
            floración: sp.floración || "",
            cuidado: sp.cuidado || "",
            usos: sp.usos || "",
            historia_nombre: sp.historia_nombre || "",
            historia_y_leyendas: sp.historia_y_leyendas || "",
            image_url: sp.image_url || "",
        });
        setShowModal(true);
    };

    const handleView = (sp) => {
        setModalMode("view");
        setSelectedSpecies(sp);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            // Generate slug from scientific name
            const slug = formData.scientific_name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]/g, '');

            const payload = {
                ...formData,
                slug,
            };

            let res;
            if (modalMode === "create") {
                res = await apiRequest(`${API}/species/staff`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
            } else if (modalMode === "edit") {
                res = await apiRequest(`${API}/species/staff/${selectedSpecies.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                if (res.status === 401) {
                    // Usuario no autenticado - redirigir a login
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al guardar");
            }

            setShowModal(false);
            fetchSpecies();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id) => {
        setSpeciesIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!speciesIdToDelete) return;

        try {
            const res = await apiRequest(`${API}/species/staff/${speciesIdToDelete}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                if (res.status === 401) {
                    // Usuario no autenticado - redirigir a login
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al eliminar");
            }

            setShowDeleteModal(false);
            setSpeciesIdToDelete(null);
            fetchSpecies();
        } catch (err) {
            setError(err.message);
            setShowDeleteModal(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setSpeciesIdToDelete(null);
    };

    if (authLoading || (loading && species.length === 0)) {
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
                        width: "48px",
                        height: "48px",
                        border: "4px solid #e5e7eb",
                        borderTop: "4px solid #10b981",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                    }}></div>
                    <p style={{ color: "#6b7280" }}>Cargando especies...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

            <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
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
                            <Link href="/staff" style={{
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "white",
                                color: "#374151",
                                textDecoration: "none",
                                fontSize: "14px",
                                transition: "all 0.2s"
                            }}>
                                ← Volver
                            </Link>
                            <div>
                                <h1 style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#111827",
                                    margin: 0
                                }}>
                                    Gestión de Especies
                                </h1>
                                <p style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    margin: 0
                                }}>
                                    {species.length} especies registradas
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                backgroundColor: "white",
                                color: "#dc2626",
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "clamp(24px, 5vw, 32px) 24px"
                }}>
                    {/* Actions Bar */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <input
                            type="text"
                            placeholder="Buscar por nombre científico o común..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: "1",
                                minWidth: "250px",
                                padding: "10px 16px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                outline: "none",
                                transition: "border-color 0.2s"
                            }}
                        />

                        <button
                            onClick={handleCreate}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#059669"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "#10b981"}
                        >
                            <span style={{ fontSize: "18px" }}>+</span>
                            Nueva Especie
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: "16px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            color: "#dc2626",
                            marginBottom: "24px"
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Species Table */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        overflow: "hidden"
                    }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{
                                width: "100%",
                                borderCollapse: "collapse"
                            }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: "#f9fafb",
                                        borderBottom: "1px solid #e5e7eb"
                                    }}>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            width: "150px",
                                            minWidth: "150px"
                                        }}>
                                            Imagen
                                        </th>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Nombre Científico
                                        </th>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Nombre Común
                                        </th>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Estado
                                        </th>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Endémica
                                        </th>
                                        <th style={{
                                            padding: "12px 16px",
                                            textAlign: "right",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {species.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                No hay especies registradas. ¡Crea la primera!
                                            </td>
                                        </tr>
                                    ) : (
                                        species.map((sp) => (
                                            <tr
                                                key={sp.id}
                                                style={{
                                                    borderBottom: "1px solid #e5e7eb",
                                                    transition: "background-color 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                            >
                                                <td style={{
                                                    padding: "12px 16px",
                                                    verticalAlign: "middle"
                                                }}>
                                                    {sp.image_url ? (
                                                        <img
                                                            src={sp.image_url}
                                                            alt={sp.nombre_común || sp.scientific_name}
                                                            style={{
                                                                width: "120px",
                                                                height: "120px",
                                                                minWidth: "120px",
                                                                minHeight: "120px",
                                                                objectFit: "cover",
                                                                borderRadius: "12px",
                                                                border: "2px solid #e5e7eb",
                                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s",
                                                                display: "block"
                                                            }}
                                                            onClick={() => handleView(sp)}
                                                            onMouseEnter={(e) => {
                                                                e.target.style.transform = "scale(1.08)";
                                                                e.target.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.transform = "scale(1)";
                                                                e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: "120px",
                                                            height: "120px",
                                                            minWidth: "120px",
                                                            minHeight: "120px",
                                                            borderRadius: "12px",
                                                            backgroundColor: "#f3f4f6",
                                                            border: "2px dashed #d1d5db",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#9ca3af",
                                                            fontSize: "48px"
                                                        }}>
                                                            🌵
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#111827",
                                                    fontWeight: "500",
                                                    fontStyle: "italic"
                                                }}>
                                                    {sp.scientific_name}
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#374151"
                                                }}>
                                                    {sp.nombre_común || "-"}
                                                </td>
                                                <td style={{ padding: "16px" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "4px 12px",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        backgroundColor: sp.estado_conservación === "En peligro" ? "#fef2f2" :
                                                            sp.estado_conservación === "Vulnerable" ? "#fff7ed" :
                                                                "#f0fdf4",
                                                        color: sp.estado_conservación === "En peligro" ? "#dc2626" :
                                                            sp.estado_conservación === "Vulnerable" ? "#ea580c" :
                                                                "#16a34a"
                                                    }}>
                                                        {sp.estado_conservación || "No especificado"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px", textAlign: "center" }}>
                                                    <span style={{
                                                        fontSize: "20px"
                                                    }}>
                                                        {sp.Endémica ? "🇨🇱" : "-"}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    textAlign: "right"
                                                }}>
                                                    <div style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                        justifyContent: "flex-end"
                                                    }}>
                                                        <button
                                                            onClick={() => handleView(sp)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "#eff6ff",
                                                                color: "#2563eb",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "500",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s"
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#dbeafe"}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = "#eff6ff"}
                                                        >
                                                            Ver
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(sp)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "#fef3c7",
                                                                color: "#d97706",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "500",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s"
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#fde68a"}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = "#fef3c7"}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(sp.id)}
                                                            style={{
                                                                padding: "6px 12px",
                                                                backgroundColor: "#fef2f2",
                                                                color: "#dc2626",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontSize: "13px",
                                                                fontWeight: "500",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s"
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = "#fee2e2"}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = "#fef2f2"}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal for Create/Edit/View */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={
                    modalMode === "create" ? "Nueva Especie" :
                        modalMode === "edit" ? "Editar Especie" :
                            "Detalles de Especie"
                }
            >
                {modalMode === "view" ? (
                    // View Mode
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {selectedSpecies && (
                            <>
                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        marginBottom: "4px"
                                    }}>
                                        Nombre Científico
                                    </label>
                                    <p style={{
                                        fontSize: "16px",
                                        fontWeight: "500",
                                        color: "#111827",
                                        fontStyle: "italic",
                                        margin: 0
                                    }}>
                                        {selectedSpecies.scientific_name}
                                    </p>
                                </div>

                                {/* Espacio para imagen en modo vista */}
                                <div style={{
                                    padding: "20px",
                                    backgroundColor: "#f9fafb",
                                    border: "2px dashed #d1d5db",
                                    borderRadius: "8px",
                                    textAlign: "center"
                                }}>
                                    {selectedSpecies.image_url ? (
                                        <img
                                            src={selectedSpecies.image_url}
                                            alt={selectedSpecies.scientific_name}
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "300px",
                                                borderRadius: "6px",
                                                objectFit: "cover"
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <div style={{
                                                fontSize: "48px",
                                                marginBottom: "8px"
                                            }}>
                                                🌵
                                            </div>
                                            <p style={{
                                                fontSize: "13px",
                                                color: "#6b7280",
                                                fontStyle: "italic",
                                                margin: 0
                                            }}>
                                                Sin imagen disponible
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        marginBottom: "4px"
                                    }}>
                                        Nombre Común
                                    </label>
                                    <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                                        {selectedSpecies.nombre_común || "-"}
                                    </p>
                                </div>

                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        marginBottom: "4px"
                                    }}>
                                        Estado de Conservación
                                    </label>
                                    <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                                        {selectedSpecies.estado_conservación || "-"}
                                    </p>
                                </div>

                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        marginBottom: "4px"
                                    }}>
                                        Endémica de Chile
                                    </label>
                                    <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                                        {selectedSpecies.Endémica ? "Sí 🇨🇱" : "No"}
                                    </p>
                                </div>

                                {selectedSpecies.habitat && (
                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            marginBottom: "4px"
                                        }}>
                                            Hábitat
                                        </label>
                                        <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: 1.6 }}>
                                            {selectedSpecies.habitat}
                                        </p>
                                    </div>
                                )}

                                {selectedSpecies.cuidado && (
                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            marginBottom: "4px"
                                        }}>
                                            Cuidado
                                        </label>
                                        <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: 1.6 }}>
                                            {selectedSpecies.cuidado}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    // Create/Edit Mode
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "6px"
                                }}>
                                    Nombre Científico *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.scientific_name}
                                    onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontStyle: "italic",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Ej: Echinopsis chiloensis"
                                />
                            </div>

                            {/* Espacio para imagen */}
                            <div style={{
                                padding: "20px",
                                backgroundColor: "#f9fafb",
                                border: "2px dashed #d1d5db",
                                borderRadius: "8px",
                                textAlign: "center"
                            }}>
                                <div style={{
                                    fontSize: "48px",
                                    marginBottom: "12px"
                                }}>
                                    🌵
                                </div>
                                <p style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#374151",
                                    marginBottom: "8px"
                                }}>
                                    Imagen de la Especie
                                </p>
                                <p style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                    marginBottom: "12px",
                                    lineHeight: "1.5"
                                }}>
                                    Espacio reservado para la fotografía identificativa de la especie.
                                    <br />
                                    <span style={{ fontStyle: "italic" }}>
                                        (Funcionalidad de carga de imágenes próximamente)
                                    </span>
                                </p>
                                <input
                                    type="text"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                        backgroundColor: "white"
                                    }}
                                    placeholder="URL de imagen temporal (opcional)"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "6px"
                                }}>
                                    Nombre Común
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre_común}
                                    onChange={(e) => setFormData({ ...formData, nombre_común: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Ej: Copao"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "6px"
                                }}>
                                    Estado de Conservación
                                </label>
                                <select
                                    value={formData.estado_conservación}
                                    onChange={(e) => setFormData({ ...formData, estado_conservación: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="No amenazada">No amenazada</option>
                                    <option value="Vulnerable">Vulnerable</option>
                                    <option value="En peligro">En peligro</option>
                                    <option value="En peligro crítico">En peligro crítico</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    cursor: "pointer"
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.Endémica}
                                        onChange={(e) => setFormData({ ...formData, Endémica: e.target.checked })}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            cursor: "pointer"
                                        }}
                                    />
                                    Endémica de Chile 🇨🇱
                                </label>
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "6px"
                                }}>
                                    Hábitat
                                </label>
                                <textarea
                                    value={formData.habitat}
                                    onChange={(e) => setFormData({ ...formData, habitat: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        resize: "vertical",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Descripción del hábitat natural..."
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "6px"
                                }}>
                                    Cuidado
                                </label>
                                <textarea
                                    value={formData.cuidado}
                                    onChange={(e) => setFormData({ ...formData, cuidado: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        resize: "vertical",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Instrucciones de cuidado..."
                                />
                            </div>

                            {error && (
                                <div style={{
                                    padding: "12px",
                                    backgroundColor: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "6px",
                                    color: "#dc2626",
                                    fontSize: "14px"
                                }}>
                                    {error}
                                </div>
                            )}

                            <div style={{
                                display: "flex",
                                gap: "12px",
                                justifyContent: "flex-end",
                                marginTop: "8px"
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: "white",
                                        color: "#374151",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: submitting ? "#9ca3af" : "#10b981",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: submitting ? "not-allowed" : "pointer",
                                        transition: "background-color 0.2s"
                                    }}
                                >
                                    {submitting ? "Guardando..." : (modalMode === "create" ? "Crear Especie" : "Guardar Cambios")}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Confirmación de Eliminación */}
            {showDeleteModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "16px",
                    backdropFilter: "blur(4px)"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "16px",
                        maxWidth: "440px",
                        width: "100%",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        overflow: "hidden",
                        animation: "modalSlideIn 0.3s ease-out"
                    }}>
                        {/* Header con ícono de advertencia */}
                        <div style={{
                            padding: "24px",
                            textAlign: "center",
                            borderBottom: "1px solid #f3f4f6"
                        }}>
                            <div style={{
                                width: "64px",
                                height: "64px",
                                backgroundColor: "#fef2f2",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 16px",
                                fontSize: "32px"
                            }}>
                                ⚠️
                            </div>
                            <h3 style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#111827",
                                margin: "0 0 8px 0"
                            }}>
                                ¿Eliminar Especie?
                            </h3>
                            <p style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                lineHeight: "1.6",
                                margin: 0
                            }}>
                                Esta acción no se puede deshacer. La especie será eliminada permanentemente de la base de datos.
                            </p>
                        </div>

                        {/* Botones de confirmación */}
                        <div style={{
                            padding: "20px 24px",
                            display: "flex",
                            gap: "12px",
                            backgroundColor: "#f9fafb"
                        }}>
                            <button
                                onClick={cancelDelete}
                                style={{
                                    flex: 1,
                                    padding: "12px 20px",
                                    backgroundColor: "white",
                                    color: "#374151",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#f9fafb";
                                    e.target.style.borderColor = "#9ca3af";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "white";
                                    e.target.style.borderColor = "#d1d5db";
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    flex: 1,
                                    padding: "12px 20px",
                                    backgroundColor: "#dc2626",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#b91c1c";
                                    e.target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "#dc2626";
                                    e.target.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                                }}
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animación CSS */}
            <style jsx>{`
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </>
    );
}


