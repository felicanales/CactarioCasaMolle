"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

// Configuración dinámica de API
const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
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
    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
};

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div
            onClick={onClose}
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
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                }}
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
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedSector, setSelectedSector] = useState(null);
    const [checkedAuth, setCheckedAuth] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sectorIdToDelete, setSectorIdToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        location: "",
        qr_code: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [sectorSpecies, setSectorSpecies] = useState([]);
    const [loadingSpecies, setLoadingSpecies] = useState(false);
    // Mapeo de sector_id -> especies para mostrar en la tabla
    const [sectorsSpeciesMap, setSectorsSpeciesMap] = useState({}); // { sectorId: [species] }
    const [loadingSpeciesMap, setLoadingSpeciesMap] = useState({}); // { sectorId: true/false }

    useEffect(() => {
        if (BYPASS_AUTH) {
            setCheckedAuth(true);
            return;
        }
        if (!authLoading && !checkedAuth) {
            if (!user) {
                router.replace("/login");
            }
            setCheckedAuth(true);
        }
    }, [user, authLoading, router, checkedAuth]);

    const fetchSectors = async () => {
        try {
            setLoading(true);
            setError("");
            const url = searchQuery
                ? `${API}/sectors/staff?q=${encodeURIComponent(searchQuery)}`
                : `${API}/sectors/staff`;
            const res = await apiRequest(url);
            if (!res.ok && !BYPASS_AUTH) {
                if (res.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al cargar sectores");
            }
            const data = await res.json();
            setSectors(data);
        } catch (err) {
            console.error('[SectorsPage] Error:', err);
            setError(err.message || "Error al cargar sectores");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && checkedAuth) {
            fetchSectors();
        }
    }, [user, checkedAuth, searchQuery]);

    // Cargar especies para todos los sectores al cargar la página
    useEffect(() => {
        if (sectors.length > 0) {
            const loadAllSpecies = async () => {
                for (const sector of sectors) {
                    try {
                        setLoadingSpeciesMap(prev => ({ ...prev, [sector.id]: true }));
                        const res = await apiRequest(`${API}/sectors/staff/${sector.id}/species`);
                        if (res.ok) {
                            const data = await res.json();
                            setSectorsSpeciesMap(prev => ({ ...prev, [sector.id]: data }));
                        } else {
                            // Si es 405, el endpoint no está disponible - no mostrar error
                            if (res.status !== 405) {
                                setSectorsSpeciesMap(prev => ({ ...prev, [sector.id]: [] }));
                            }
                        }
                    } catch (err) {
                        // Solo manejar errores que no sean 405
                        if (!err.message?.includes('405')) {
                            setSectorsSpeciesMap(prev => ({ ...prev, [sector.id]: [] }));
                        }
                    } finally {
                        setLoadingSpeciesMap(prev => ({ ...prev, [sector.id]: false }));
                    }
                }
            };
            loadAllSpecies();
        }
    }, [sectors]);

    const handleCreate = () => {
        setModalMode("create");
        setSelectedSector(null);
        setFormData({ name: "", description: "", location: "", qr_code: "" });
        setShowModal(true);
    };

    const handleEdit = (sector) => {
        setModalMode("edit");
        setSelectedSector(sector);
        setFormData({
            name: sector.name || "",
            description: sector.description || "",
            location: sector.location || "",
            qr_code: sector.qr_code || ""
        });
        setShowModal(true);
    };

    const fetchSectorSpecies = async (sectorId) => {
        try {
            setLoadingSpecies(true);
            const res = await apiRequest(`${API}/sectors/staff/${sectorId}/species`);
            if (res.ok) {
                const data = await res.json();
                setSectorSpecies(data);
            } else {
                setSectorSpecies([]);
            }
        } catch (err) {
            console.error('Error loading sector species:', err);
            setSectorSpecies([]);
        } finally {
            setLoadingSpecies(false);
        }
    };

    const handleView = (sector) => {
        setModalMode("view");
        setSelectedSector(sector);
        setSectorSpecies([]);
        fetchSectorSpecies(sector.id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            let res;
            if (modalMode === "create") {
                console.log("[handleSubmit] Creando sector con datos:", formData);
                res = await apiRequest(`${API}/sectors/staff`, {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                console.log("[handleSubmit] Respuesta del servidor:", res.status, res.ok);
            } else if (modalMode === "edit") {
                res = await apiRequest(`${API}/sectors/staff/${selectedSector.id}`, {
                    method: "PUT",
                    body: JSON.stringify(formData)
                });
            }
            
            // Verificar respuesta siempre, incluso con BYPASS_AUTH
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.detail || errorData.message || `Error ${res.status}: ${res.statusText}`;
                console.error("[handleSubmit] Error del servidor:", errorMessage);
                throw new Error(errorMessage);
            }
            
            // Si la respuesta es exitosa, obtener los datos
            const result = await res.json().catch(() => null);
            console.log("[handleSubmit] Sector guardado exitosamente:", result);
            
            setShowModal(false);
            fetchSectors();
        } catch (err) {
            console.error("[handleSubmit] Error al guardar sector:", err);
            setError(err.message || "Error al guardar el sector");
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
                method: "DELETE"
            });
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

    if (loading && !user) {
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
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 768px) {
                    .table-cell {
                        padding: 8px !important;
                    }
                    .table-header {
                        padding: 8px !important;
                    }
                }
            `}</style>

            <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
                <header style={{
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px clamp(12px, 4vw, 24px)",
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
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
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
                                    margin: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}>
                                    Gestión de Sectores
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
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
                                fontSize: "clamp(12px, 3vw, 14px)",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                flexShrink: 0
                            }}
                        >
                            Salir
                        </button>
                    </div>
                </header>

                <main style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "clamp(24px, 5vw, 32px) 24px"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "clamp(12px, 3vw, 16px) clamp(12px, 4vw, 20px)",
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
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: "1",
                                minWidth: "200px",
                                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "clamp(13px, 3vw, 14px)",
                                outline: "none",
                                transition: "border-color 0.2s"
                            }}
                        />

                        <button
                            onClick={handleCreate}
                            style={{
                                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 20px)",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "clamp(13px, 3vw, 14px)",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                whiteSpace: "nowrap"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#059669"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "#10b981"}
                        >
                            <span style={{ fontSize: "18px" }}>+</span>
                            <span className="btn-text">Nuevo Sector</span>
                        </button>
                    </div>

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
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Nombre
                                        </th>
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Descripción
                                        </th>
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Ubicación
                                        </th>
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Código QR
                                        </th>
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Especies
                                        </th>
                                        <th className="table-header" style={{
                                            padding: "16px",
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
                                            <td colSpan="6" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                No hay sectores registrados. ¡Crea el primero!
                                            </td>
                                        </tr>
                                    ) : (
                                        sectors.map((sector) => {
                                            const sectorSpeciesList = sectorsSpeciesMap[sector.id] || [];
                                            const isLoading = loadingSpeciesMap[sector.id];
                                            return (
                                                <tr
                                                    key={sector.id}
                                                    style={{
                                                        borderBottom: "1px solid #e5e7eb",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                                >
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#111827",
                                                        fontWeight: "500",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {sector.name}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {sector.description || "-"}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {sector.location || "-"}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#374151",
                                                        fontFamily: "monospace",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {sector.qr_code || "-"}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle",
                                                        maxWidth: "300px"
                                                    }}>
                                                        {isLoading ? (
                                                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Cargando...</span>
                                                        ) : sectorSpeciesList.length === 0 ? (
                                                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Sin especies</span>
                                                        ) : (
                                                            <div style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: "4px"
                                                            }}>
                                                                {sectorSpeciesList.slice(0, 3).map((specie) => (
                                                                    <div
                                                                        key={specie.id}
                                                                        style={{
                                                                            fontSize: "12px",
                                                                            fontStyle: "italic",
                                                                            color: "#111827",
                                                                            fontWeight: "500",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                            whiteSpace: "nowrap"
                                                                        }}
                                                                        title={specie.scientific_name}
                                                                    >
                                                                        {specie.scientific_name}
                                                                    </div>
                                                                ))}
                                                                {sectorSpeciesList.length > 3 && (
                                                                    <div style={{
                                                                        fontSize: "11px",
                                                                        color: "#6b7280",
                                                                        fontStyle: "italic"
                                                                    }}>
                                                                        +{sectorSpeciesList.length - 3} más
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        textAlign: "right",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <div style={{
                                                            display: "flex",
                                                            gap: "8px",
                                                            justifyContent: "flex-end",
                                                            flexWrap: "wrap"
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
                                                            >
                                                                Ver
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
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal para crear/editar/ver */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalMode === "create" ? "Nuevo Sector" : modalMode === "edit" ? "Editar Sector" : "Ver Sector"}
            >
                {(modalMode === "create" || modalMode === "edit") ? (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "8px"
                                }}>
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        transition: "border-color 0.2s"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "8px"
                                }}>
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                        fontFamily: "inherit"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "8px"
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
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        transition: "border-color 0.2s"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "8px"
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
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: "monospace",
                                        outline: "none",
                                        transition: "border-color 0.2s"
                                    }}
                                />
                            </div>

                            <div style={{
                                display: "flex",
                                gap: "12px",
                                marginTop: "8px"
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: "12px 20px",
                                        backgroundColor: "#f3f4f6",
                                        color: "#374151",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s"
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: "12px 20px",
                                        backgroundColor: "#10b981",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: submitting ? "not-allowed" : "pointer",
                                        transition: "background-color 0.2s",
                                        opacity: submitting ? 0.6 : 1
                                    }}
                                >
                                    {submitting ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: "4px",
                                display: "block"
                            }}>
                                Nombre
                            </label>
                            <p style={{ margin: 0, fontSize: "16px", color: "#111827" }}>
                                {selectedSector?.name || "-"}
                            </p>
                        </div>

                        <div>
                            <label style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: "4px",
                                display: "block"
                            }}>
                                Descripción
                            </label>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
                                {selectedSector?.description || "-"}
                            </p>
                        </div>

                        <div>
                            <label style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: "4px",
                                display: "block"
                            }}>
                                Ubicación
                            </label>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                {selectedSector?.location || "-"}
                            </p>
                        </div>

                        <div>
                            <label style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: "4px",
                                display: "block"
                            }}>
                                Código QR
                            </label>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", fontFamily: "monospace" }}>
                                {selectedSector?.qr_code || "-"}
                            </p>
                        </div>

                        <div>
                            <label style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: "8px",
                                display: "block"
                            }}>
                                Especies en este sector
                            </label>
                            {loadingSpecies ? (
                                <p style={{ margin: 0, fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>
                                    Cargando especies...
                                </p>
                            ) : sectorSpecies.length === 0 ? (
                                <p style={{ margin: 0, fontSize: "14px", color: "#9ca3af", fontStyle: "italic" }}>
                                    No hay especies asociadas a este sector
                                </p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                                    {sectorSpecies.map((specie) => (
                                        <div
                                            key={specie.id}
                                            style={{
                                                padding: "8px 12px",
                                                backgroundColor: "#f9fafb",
                                                borderRadius: "6px",
                                                border: "1px solid #e5e7eb"
                                            }}
                                        >
                                            <div style={{
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                color: "#111827",
                                                fontStyle: "italic",
                                                marginBottom: "2px"
                                            }}>
                                                {specie.scientific_name}
                                            </div>
                                            {specie.nombre_común && (
                                                <div style={{
                                                    fontSize: "12px",
                                                    color: "#6b7280"
                                                }}>
                                                    {specie.nombre_común}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={showDeleteModal}
                onClose={cancelDelete}
                title="Confirmar Eliminación"
            >
                <div>
                    <p style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: "12px"
                    }}>
                        ¿Estás seguro de que deseas eliminar este sector?
                    </p>
                    <p style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        lineHeight: "1.6",
                        margin: 0
                    }}>
                        Esta acción no se puede deshacer. El sector será eliminado permanentemente.
                    </p>
                </div>

                <div style={{
                    padding: "20px 0 0",
                    display: "flex",
                    gap: "12px"
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
                            transition: "all 0.2s"
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
                            transition: "background-color 0.2s"
                        }}
                    >
                        Eliminar
                    </button>
                </div>
            </Modal>

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
                
                @media (max-width: 400px) {
                    .btn-text {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    );
}

