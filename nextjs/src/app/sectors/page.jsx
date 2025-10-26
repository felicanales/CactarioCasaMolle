"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Configuración dinámica de API
const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
        return "https://cactario-backend-production.up.railway.app";
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
        console.log('[SectorsPage] Adding CSRF token to:', options.method, url);
    }

    // Agregar Authorization header si hay token disponible
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log('[SectorsPage] Adding Authorization header to:', url);
    } else {
        console.warn('[SectorsPage] ⚠️ No access token available for:', url);
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

export default function SectorsPage() {
    const { user, loading: authLoading, logout, fetchMe } = useAuth();
    const router = useRouter();

    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit" | "view"
    const [selectedSector, setSelectedSector] = useState(null);
    const [checkedAuth, setCheckedAuth] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sectorIdToDelete, setSectorIdToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        location: "",
        qr_code: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // Verificar autenticación solo UNA vez
    useEffect(() => {
        if (!authLoading && !checkedAuth) {
            console.log('[SectorsPage] Checking auth, user:', user);
            if (!user) {
                console.log('[SectorsPage] No user, redirecting to login');
                router.replace("/login");
            }
            setCheckedAuth(true);
        }
    }, [user, authLoading, router, checkedAuth]);

    // Fetch sectors
    const fetchSectors = async () => {
        try {
            setLoading(true);
            setError("");

            const url = searchQuery
                ? `${API}/sectors/staff?q=${encodeURIComponent(searchQuery)}`
                : `${API}/sectors/staff`;

            console.log('[SectorsPage] Fetching sectors from:', url);
            const res = await apiRequest(url);

            if (!res.ok) {
                console.error('[SectorsPage] Fetch failed:', res.status);
                if (res.status === 401) {
                    // Usuario no autenticado - redirigir a login
                    console.log('[SectorsPage] 401 Unauthorized, redirecting to login');
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al cargar sectores");
            }
            const data = await res.json();
            console.log('[SectorsPage] Sectors loaded:', data.length);
            setSectors(data);
            setError("");
        } catch (err) {
            console.error('[SectorsPage] Error:', err);
            setError(err.message || "Error al cargar sectores");
        } finally {
            setLoading(false);
        }
    };

    // Cargar sectores solo cuando el usuario esté autenticado y se haya verificado
    useEffect(() => {
        if (user && checkedAuth) {
            console.log('[SectorsPage] User authenticated, loading sectors');
            fetchSectors();
        }
    }, [user, checkedAuth, searchQuery]);

    const handleCreate = () => {
        setModalMode("create");
        setSelectedSector(null);
        setFormData({
            name: "",
            description: "",
            location: "",
            qr_code: "",
        });
        setShowModal(true);
    };

    const handleEdit = (sector) => {
        setModalMode("edit");
        setSelectedSector(sector);
        setFormData({
            name: sector.name || "",
            description: sector.description || "",
            location: sector.location || "",
            qr_code: sector.qr_code || "",
        });
        setShowModal(true);
    };

    const handleView = (sector) => {
        setModalMode("view");
        setSelectedSector(sector);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            let res;
            if (modalMode === "create") {
                res = await apiRequest(`${API}/sectors/staff`, {
                    method: "POST",
                    body: JSON.stringify(formData),
                });
            } else if (modalMode === "edit") {
                res = await apiRequest(`${API}/sectors/staff/${selectedSector.id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData),
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
            fetchSectors();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id) => {
        setSectorIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!sectorIdToDelete) return;

        try {
            const res = await apiRequest(`${API}/sectors/staff/${sectorIdToDelete}`, {
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
            setSectorIdToDelete(null);
            fetchSectors();
        } catch (err) {
            setError(err.message);
            setShowDeleteModal(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setSectorIdToDelete(null);
    };

    if (authLoading || (loading && sectors.length === 0)) {
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
                    <p style={{ color: "#6b7280" }}>Cargando sectores...</p>
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
                                    Gestión de Sectores
                                </h1>
                                <p style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    margin: 0
                                }}>
                                    {sectors.length} sectores registrados
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
                            placeholder="Buscar por nombre de sector..."
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
                            Nuevo Sector
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

                    {/* Sectors Table */}
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
                                            letterSpacing: "0.05em"
                                        }}>
                                            Nombre
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
                                            Descripción
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
                                            Ubicación
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
                                            Código QR
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
                                    {sectors.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                No hay sectores registrados. ¡Crea el primero!
                                            </td>
                                        </tr>
                                    ) : (
                                        sectors.map((sector) => (
                                            <tr
                                                key={sector.id}
                                                style={{
                                                    borderBottom: "1px solid #e5e7eb",
                                                    transition: "background-color 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                            >
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#111827",
                                                    fontWeight: "500"
                                                }}>
                                                    {sector.name}
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#374151",
                                                    maxWidth: "300px"
                                                }}>
                                                    <div style={{
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}>
                                                        {sector.description || "-"}
                                                    </div>
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#374151"
                                                }}>
                                                    {sector.location || "-"}
                                                </td>
                                                <td style={{
                                                    padding: "16px",
                                                    fontSize: "14px",
                                                    color: "#374151",
                                                    fontFamily: "monospace"
                                                }}>
                                                    {sector.qr_code || "-"}
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
                                                            onClick={() => handleView(sector)}
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
                                                            onClick={() => handleEdit(sector)}
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
                                                            onClick={() => handleDeleteClick(sector.id)}
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
                    modalMode === "create" ? "Nuevo Sector" :
                        modalMode === "edit" ? "Editar Sector" :
                            "Detalles de Sector"
                }
            >
                {modalMode === "view" ? (
                    // View Mode
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {selectedSector && (
                            <>
                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        marginBottom: "4px"
                                    }}>
                                        Nombre
                                    </label>
                                    <p style={{
                                        fontSize: "16px",
                                        fontWeight: "500",
                                        color: "#111827",
                                        margin: 0
                                    }}>
                                        {selectedSector.name}
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
                                        Descripción
                                    </label>
                                    <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: 1.6 }}>
                                        {selectedSector.description || "-"}
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
                                        Ubicación
                                    </label>
                                    <p style={{ fontSize: "14px", color: "#374151", margin: 0 }}>
                                        {selectedSector.location || "-"}
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
                                        Código QR
                                    </label>
                                    <p style={{
                                        fontSize: "14px",
                                        color: "#374151",
                                        margin: 0,
                                        fontFamily: "monospace",
                                        backgroundColor: "#f3f4f6",
                                        padding: "8px 12px",
                                        borderRadius: "6px"
                                    }}>
                                        {selectedSector.qr_code || "-"}
                                    </p>
                                </div>
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
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Ej: Sector Norte"
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
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                                    placeholder="Descripción del sector..."
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
                                    Ubicación
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Ej: Zona norte del jardín"
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
                                    Código QR
                                </label>
                                <input
                                    type="text"
                                    value={formData.qr_code}
                                    onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontFamily: "monospace",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Ej: SECTOR_NORTE_001"
                                />
                                <p style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                    margin: "4px 0 0 0"
                                }}>
                                    Código único para identificar el sector mediante QR
                                </p>
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
                                    {submitting ? "Guardando..." : (modalMode === "create" ? "Crear Sector" : "Guardar Cambios")}
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
                                ¿Eliminar Sector?
                            </h3>
                            <p style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                lineHeight: "1.6",
                                margin: 0
                            }}>
                                Esta acción no se puede deshacer. El sector será eliminado permanentemente de la base de datos.
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
