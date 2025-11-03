"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
                    maxWidth: '800px',
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

export default function InventoryPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [ejemplares, setEjemplares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [checkedAuth, setCheckedAuth] = useState(false);
    
    // Filtros
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSpecies, setFilterSpecies] = useState("");
    const [filterMorfologia, setFilterMorfologia] = useState("");
    const [filterNombreComun, setFilterNombreComun] = useState("");
    const [filterTamaño, setFilterTamaño] = useState("");
    const [sortBy, setSortBy] = useState("scientific_name");
    const [sortOrder, setSortOrder] = useState("asc");
    
    // Listas para filtros
    const [speciesList, setSpeciesList] = useState([]);
    const [sectorsList, setSectorsList] = useState([]);
    
    // Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view"); // "view" | "create"
    const [selectedEjemplar, setSelectedEjemplar] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Form data para crear nuevo ejemplar
    const [formData, setFormData] = useState({
        species_id: "",
        sector_id: "",
        purchase_date: "",
        sale_date: "",
        nursery: "",
        age_months: "",
        tamaño: "",
        health_status: "",
        location: "",
        purchase_price: "",
        sale_price: "",
        collection_date: "",
        has_offshoots: false,
        cantidad: 1 // Cantidad de ejemplares a crear
    });

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

    // Cargar especies y sectores para filtros
    useEffect(() => {
        const fetchSpecies = async () => {
            try {
                const res = await apiRequest(`${API}/species/staff`);
                if (res.ok) {
                    const data = await res.json();
                    setSpeciesList(data);
                }
            } catch (err) {
                console.error('Error loading species:', err);
            }
        };
        
        const fetchSectors = async () => {
            try {
                const res = await apiRequest(`${API}/sectors/staff`);
                if (res.ok) {
                    const data = await res.json();
                    setSectorsList(data);
                }
            } catch (err) {
                console.error('Error loading sectors:', err);
            }
        };
        
        if (checkedAuth) {
            fetchSpecies();
            fetchSectors();
        }
    }, [checkedAuth]);

    // Cargar ejemplares
    const fetchEjemplares = async () => {
        try {
            setLoading(true);
            setError("");
            
            const params = new URLSearchParams();
            if (searchQuery) params.append('q', searchQuery);
            if (filterSpecies) params.append('species_id', filterSpecies);
            if (filterMorfologia) params.append('morfologia', filterMorfologia);
            if (filterNombreComun) params.append('nombre_comun', filterNombreComun);
            if (filterTamaño) params.append('tamaño', filterTamaño);
            params.append('sort_by', sortBy);
            params.append('sort_order', sortOrder);
            
            const url = `${API}/ejemplar/staff?${params.toString()}`;
            const res = await apiRequest(url);
            
            if (!res.ok && !BYPASS_AUTH) {
                if (res.status === 401) {
                    setError("Sesión expirada. Por favor, inicia sesión nuevamente.");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Error al cargar ejemplares");
            }
            
            const data = await res.json();
            // Asegurar que data es un array
            if (Array.isArray(data)) {
                setEjemplares(data);
            } else {
                console.error('[InventoryPage] Respuesta no es un array:', data);
                setEjemplares([]);
                setError("Error: respuesta del servidor no válida");
            }
        } catch (err) {
            console.error('[InventoryPage] Error:', err);
            setError(err.message || "Error al cargar ejemplares");
            // Asegurar que ejemplares es un array en caso de error
            setEjemplares([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && checkedAuth) {
            fetchEjemplares();
        }
    }, [user, checkedAuth, searchQuery, filterSpecies, filterMorfologia, filterNombreComun, filterTamaño, sortBy, sortOrder]);

    const handleView = (ej) => {
        setModalMode("view");
        setSelectedEjemplar(ej);
        setShowModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        
        // Validar campos obligatorios
        if (!formData.species_id || !formData.sector_id) {
            setError("La especie y el sector son obligatorios");
            return;
        }
        
        // Validar cantidad
        const cantidad = parseInt(formData.cantidad) || 1;
        if (cantidad < 1) {
            setError("La cantidad debe ser al menos 1");
            return;
        }
        if (cantidad > 100) {
            setError("La cantidad máxima permitida es 100 ejemplares por operación");
            return;
        }
        
        try {
            setSubmitting(true);
            setError("");
            
            // Preparar payload base (sin cantidad)
            const basePayload = { ...formData };
            delete basePayload.cantidad; // Remover cantidad del payload
            
            // Convertir IDs a números
            basePayload.species_id = parseInt(formData.species_id);
            basePayload.sector_id = parseInt(formData.sector_id);
            
            // Convertir age_months a número si existe
            if (basePayload.age_months) {
                basePayload.age_months = parseInt(basePayload.age_months);
            }
            
            // Convertir precios a números si existen
            if (basePayload.purchase_price) {
                basePayload.purchase_price = parseFloat(basePayload.purchase_price);
            }
            if (basePayload.sale_price) {
                basePayload.sale_price = parseFloat(basePayload.sale_price);
            }
            
            // Crear múltiples ejemplares
            let created = 0;
            let failed = 0;
            const errors = [];
            
            for (let i = 0; i < cantidad; i++) {
                try {
                    const res = await apiRequest(`${API}/ejemplar/staff`, {
                        method: "POST",
                        body: JSON.stringify(basePayload)
                    });
                    
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.detail || "Error al crear el ejemplar");
                    }
                    
                    created++;
                } catch (err) {
                    failed++;
                    errors.push(`Ejemplar ${i + 1}: ${err.message}`);
                    // Continuar con los siguientes ejemplares incluso si uno falla
                }
            }
            
            // Mostrar resultado
            if (created > 0) {
                // Recargar lista y cerrar modal solo si al menos uno se creó
                await fetchEjemplares();
                
                if (failed === 0) {
                    // Todos exitosos
                    setShowModal(false);
                    setFormData({
                        species_id: "",
                        sector_id: "",
                        purchase_date: "",
                        sale_date: "",
                        nursery: "",
                        age_months: "",
                        tamaño: "",
                        health_status: "",
                        location: "",
                        purchase_price: "",
                        sale_price: "",
                        collection_date: "",
                        has_offshoots: false,
                        cantidad: 1
                    });
                } else {
                    // Algunos fallaron
                    setError(`Se crearon ${created} de ${cantidad} ejemplares. Errores: ${errors.join('; ')}`);
                }
            } else {
                // Todos fallaron
                throw new Error(`No se pudo crear ningún ejemplar. Errores: ${errors.join('; ')}`);
            }
        } catch (err) {
            console.error('[InventoryPage] Error creating ejemplares:', err);
            setError(err.message || "Error al crear los ejemplares");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const calculateAge = (ageMonths, purchaseDate) => {
        if (ageMonths) {
            if (ageMonths >= 12) {
                const years = Math.floor(ageMonths / 12);
                const months = ageMonths % 12;
                return months > 0 ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}` : `${years} año${years !== 1 ? 's' : ''}`;
            }
            return `${ageMonths} mes${ageMonths !== 1 ? 'es' : ''}`;
        }
        if (purchaseDate) {
            const purchase = new Date(purchaseDate);
            const now = new Date();
            const diffMonths = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
            if (diffMonths >= 12) {
                const years = Math.floor(diffMonths / 12);
                const months = diffMonths % 12;
                return months > 0 ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}` : `${years} año${years !== 1 ? 's' : ''}`;
            }
            return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
        }
        return "-";
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
                        borderTop: "4px solid #f59e0b",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px"
                    }}></div>
                    <p style={{ color: "#6b7280" }}>Cargando inventario...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // Obtener morfologías únicas de las especies
    const morfologias = [...new Set(
        speciesList
            .map(s => s.tipo_morfología || s.morfología_cactus)
            .filter(Boolean)
    )].sort();

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
                        maxWidth: "1400px",
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
                                    Stock e Inventario
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
                                    color: "#6b7280",
                                    margin: 0
                                }}>
                                    {ejemplares.length} ejemplares registrados
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button
                                onClick={() => {
                                    setModalMode("create");
                                    setFormData({
                                        species_id: "",
                                        sector_id: "",
                                        purchase_date: "",
                                        sale_date: "",
                                        nursery: "",
                                        age_months: "",
                                        tamaño: "",
                                        health_status: "",
                                        location: "",
                                        purchase_price: "",
                                        sale_price: "",
                                        collection_date: "",
                                        has_offshoots: false,
                                        cantidad: 1
                                    });
                                    setShowModal(true);
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    fontSize: "clamp(12px, 3vw, 14px)",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>+</span>
                                <span>Nuevo Ejemplar</span>
                            </button>
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
                                    transition: "all 0.2s"
                                }}
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </header>

                <main style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "clamp(24px, 5vw, 32px) 24px"
                }}>
                    {/* Filtros */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "clamp(16px, 3vw, 20px)",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px",
                            marginBottom: "16px"
                        }}>
                            <input
                                type="text"
                                placeholder="Búsqueda general..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                            
                            <select
                                value={filterSpecies}
                                onChange={(e) => setFilterSpecies(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todas las especies</option>
                                {speciesList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.scientific_name}
                                    </option>
                                ))}
                            </select>
                            
                            <select
                                value={filterMorfologia}
                                onChange={(e) => setFilterMorfologia(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todas las morfologías</option>
                                {morfologias.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            
                            <input
                                type="text"
                                placeholder="Nombre común..."
                                value={filterNombreComun}
                                onChange={(e) => setFilterNombreComun(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                            
                            <select
                                value={filterTamaño}
                                onChange={(e) => setFilterTamaño(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todos los tamaños</option>
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                            </select>
                            
                            <div style={{ display: "flex", gap: "8px" }}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                >
                                    <option value="scientific_name">Nombre científico</option>
                                    <option value="nombre_comun">Nombre común</option>
                                    <option value="tamaño">Tamaño</option>
                                    <option value="purchase_date">Fecha compra</option>
                                    <option value="sector_name">Sector</option>
                                </select>
                                
                                <button
                                    type="button"
                                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                    style={{
                                        padding: "10px 16px",
                                        backgroundColor: sortOrder === "asc" ? "#10b981" : "#3b82f6",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        whiteSpace: "nowrap"
                                    }}
                                    title={sortOrder === "asc" ? "Orden A-Z" : "Orden Z-A"}
                                >
                                    {sortOrder === "asc" ? "A-Z" : "Z-A"}
                                </button>
                            </div>
                        </div>
                        
                        {(searchQuery || filterSpecies || filterMorfologia || filterNombreComun || filterTamaño) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterSpecies("");
                                    setFilterMorfologia("");
                                    setFilterNombreComun("");
                                    setFilterTamaño("");
                                }}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#f3f4f6",
                                    color: "#374151",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                Limpiar filtros
                            </button>
                        )}
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

                    {/* Tabla de Ejemplares */}
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
                                            Especie
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
                                            Fecha Compra/Venta
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
                                            Vivero
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
                                            Edad
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
                                            Tamaño
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
                                            Sector / Ubicación
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
                                            Salud
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
                                    {ejemplares.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                {loading ? "Cargando ejemplares..." : "No hay ejemplares registrados"}
                                            </td>
                                        </tr>
                                    ) : (
                                        ejemplares.map((ej) => {
                                            const especie = ej.especies || {};
                                            const sector = ej.sectores || {};
                                            return (
                                                <tr
                                                    key={ej.id}
                                                    style={{
                                                        borderBottom: "1px solid #e5e7eb",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                                >
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            <div style={{
                                                                fontSize: "14px",
                                                                fontWeight: "600",
                                                                fontStyle: "italic",
                                                                color: "#111827"
                                                            }}>
                                                                {especie.scientific_name || "-"}
                                                            </div>
                                                            {especie.nombre_común && (
                                                                <div style={{
                                                                    fontSize: "12px",
                                                                    color: "#6b7280"
                                                                }}>
                                                                    {especie.nombre_común}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            {ej.purchase_date && (
                                                                <div>
                                                                    <span style={{ color: "#059669", fontWeight: "500" }}>Compra: </span>
                                                                    {formatDate(ej.purchase_date)}
                                                                </div>
                                                            )}
                                                            {ej.sale_date && (
                                                                <div>
                                                                    <span style={{ color: "#dc2626", fontWeight: "500" }}>Venta: </span>
                                                                    {formatDate(ej.sale_date)}
                                                                </div>
                                                            )}
                                                            {!ej.purchase_date && !ej.sale_date && (
                                                                <span style={{ color: "#9ca3af", fontStyle: "italic" }}>-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {ej.nursery || "-"}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {calculateAge(ej.age_months, ej.purchase_date)}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {ej.tamaño ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 12px",
                                                                borderRadius: "12px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                backgroundColor: "#e0f2fe",
                                                                color: "#0284c7"
                                                            }}>
                                                                {ej.tamaño}
                                                            </span>
                                                        ) : "-"}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        verticalAlign: "middle",
                                                        maxWidth: "250px"
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            <div style={{ fontWeight: "500" }}>
                                                                {sector.name || "-"}
                                                            </div>
                                                            {ej.location && (
                                                                <div style={{
                                                                    fontSize: "12px",
                                                                    color: "#6b7280",
                                                                    fontStyle: "italic",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap"
                                                                }}>
                                                                    {ej.location}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "4px 12px",
                                                            borderRadius: "12px",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            backgroundColor: ej.health_status === "Excelente" ? "#d1fae5" :
                                                                ej.health_status === "Bueno" ? "#dbeafe" :
                                                                ej.health_status === "Regular" ? "#fef3c7" :
                                                                ej.health_status === "Mal" ? "#fee2e2" : "#f3f4f6",
                                                            color: ej.health_status === "Excelente" ? "#065f46" :
                                                                ej.health_status === "Bueno" ? "#1e40af" :
                                                                ej.health_status === "Regular" ? "#92400e" :
                                                                ej.health_status === "Mal" ? "#991b1b" : "#6b7280"
                                                        }}>
                                                            {ej.health_status || "No especificado"}
                                                        </span>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        textAlign: "right",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <button
                                                            onClick={() => handleView(ej)}
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

            {/* Modal de Visualización o Creación */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setError("");
                    if (modalMode === "create") {
                        setFormData({
                            species_id: "",
                            sector_id: "",
                            purchase_date: "",
                            sale_date: "",
                            nursery: "",
                            age_months: "",
                            tamaño: "",
                            health_status: "",
                            location: "",
                            purchase_price: "",
                            sale_price: "",
                            collection_date: "",
                            has_offshoots: false
                        });
                    }
                }}
                title={modalMode === "create" ? "Crear Nuevo Ejemplar" : "Detalle del Ejemplar"}
            >
                {modalMode === "create" ? (
                    <form onSubmit={handleCreate}>
                        {error && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "8px",
                                color: "#dc2626",
                                marginBottom: "20px",
                                fontSize: "14px"
                            }}>
                                {error}
                            </div>
                        )}
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Especie (obligatorio) */}
                            <div>
                                <label style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "6px",
                                    display: "block"
                                }}>
                                    Especie <span style={{ color: "#dc2626" }}>*</span>
                                </label>
                                <select
                                    required
                                    value={formData.species_id}
                                    onChange={(e) => setFormData({ ...formData, species_id: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                >
                                    <option value="">Seleccionar especie...</option>
                                    {speciesList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.scientific_name} {s.nombre_común ? `(${s.nombre_común})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Sector (obligatorio) */}
                            <div>
                                <label style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "6px",
                                    display: "block"
                                }}>
                                    Sector <span style={{ color: "#dc2626" }}>*</span>
                                </label>
                                <select
                                    required
                                    value={formData.sector_id}
                                    onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                >
                                    <option value="">Seleccionar sector...</option>
                                    {sectorsList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                {/* Tamaño */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Tamaño
                                    </label>
                                    <select
                                        value={formData.tamaño}
                                        onChange={(e) => setFormData({ ...formData, tamaño: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="XS">XS</option>
                                        <option value="S">S</option>
                                        <option value="M">M</option>
                                        <option value="L">L</option>
                                        <option value="XL">XL</option>
                                        <option value="XXL">XXL</option>
                                    </select>
                                </div>
                                
                                {/* Edad (meses) */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Edad (meses)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.age_months}
                                        onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                                
                                {/* Estado de Salud */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Estado de Salud
                                    </label>
                                    <select
                                        value={formData.health_status}
                                        onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Excelente">Excelente</option>
                                        <option value="Bueno">Bueno</option>
                                        <option value="Regular">Regular</option>
                                        <option value="Mal">Mal</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                {/* Fecha de Compra */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Fecha de Compra
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                                
                                {/* Fecha de Venta */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Fecha de Venta
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.sale_date}
                                        onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                                
                                {/* Fecha de Colección */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Fecha de Colección
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.collection_date}
                                        onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Vivero */}
                            <div>
                                <label style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "6px",
                                    display: "block"
                                }}>
                                    Vivero
                                </label>
                                <input
                                    type="text"
                                    value={formData.nursery}
                                    onChange={(e) => setFormData({ ...formData, nursery: e.target.value })}
                                    placeholder="Nombre del vivero o proveedor"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>
                            
                            {/* Ubicación Específica */}
                            <div>
                                <label style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "6px",
                                    display: "block"
                                }}>
                                    Ubicación Específica
                                </label>
                                <textarea
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Descripción detallada de la ubicación dentro del sector"
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        resize: "vertical",
                                        fontFamily: "inherit"
                                    }}
                                />
                            </div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                                {/* Precio de Compra */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Precio de Compra
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.purchase_price}
                                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                        placeholder="0.00"
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                                
                                {/* Precio de Venta */}
                                <div>
                                    <label style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#6b7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "6px",
                                        display: "block"
                                    }}>
                                        Precio de Venta
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.sale_price}
                                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                        placeholder="0.00"
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Tiene Retoños */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="checkbox"
                                    id="has_offshoots"
                                    checked={formData.has_offshoots}
                                    onChange={(e) => setFormData({ ...formData, has_offshoots: e.target.checked })}
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer"
                                    }}
                                />
                                <label htmlFor="has_offshoots" style={{
                                    fontSize: "14px",
                                    color: "#374151",
                                    cursor: "pointer"
                                }}>
                                    Tiene retoños
                                </label>
                            </div>
                            
                            {/* Botones */}
                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setError("");
                                        setFormData({
                                            species_id: "",
                                            sector_id: "",
                                            purchase_date: "",
                                            sale_date: "",
                                            nursery: "",
                                            age_months: "",
                                            tamaño: "",
                                            health_status: "",
                                            location: "",
                                            purchase_price: "",
                                            sale_price: "",
                                            collection_date: "",
                                            has_offshoots: false,
                                            cantidad: 1
                                        });
                                    }}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "1px solid #d1d5db",
                                        backgroundColor: "white",
                                        color: "#374151",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "none",
                                        backgroundColor: submitting ? "#9ca3af" : "#10b981",
                                        color: "white",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: submitting ? "not-allowed" : "pointer",
                                        transition: "all 0.2s"
                                    }}
                                    disabled={submitting}
                                >
                                    {submitting 
                                        ? `Creando ${formData.cantidad} ejemplar${formData.cantidad > 1 ? 'es' : ''}...` 
                                        : `Crear ${formData.cantidad === 1 ? 'Ejemplar' : `${formData.cantidad} Ejemplares`}`}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : selectedEjemplar && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {(() => {
                            const especie = selectedEjemplar.especies || {};
                            const sector = selectedEjemplar.sectores || {};
                            return (
                                <>
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
                                            Especie
                                        </label>
                                        <p style={{ margin: 0, fontSize: "18px", fontWeight: "600", fontStyle: "italic", color: "#111827" }}>
                                            {especie.scientific_name || "-"}
                                        </p>
                                        {especie.nombre_común && (
                                            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#374151" }}>
                                                {especie.nombre_común}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
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
                                                Fecha de Compra
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {formatDate(selectedEjemplar.purchase_date)}
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
                                                Fecha de Venta
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {formatDate(selectedEjemplar.sale_date)}
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
                                                Vivero
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {selectedEjemplar.nursery || "-"}
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
                                                Edad
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {calculateAge(selectedEjemplar.age_months, selectedEjemplar.purchase_date)}
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
                                                Tamaño
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {selectedEjemplar.tamaño ? (
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "4px 12px",
                                                        borderRadius: "12px",
                                                        fontSize: "13px",
                                                        fontWeight: "600",
                                                        backgroundColor: "#e0f2fe",
                                                        color: "#0284c7"
                                                    }}>
                                                        {selectedEjemplar.tamaño}
                                                    </span>
                                                ) : "-"}
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
                                                Estado de Salud
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {selectedEjemplar.health_status || "-"}
                                            </p>
                                        </div>
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
                                            Sector
                                        </label>
                                        <p style={{ margin: 0, fontSize: "16px", fontWeight: "500", color: "#111827" }}>
                                            {sector.name || "-"}
                                        </p>
                                        {sector.description && (
                                            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6b7280" }}>
                                                {sector.description}
                                            </p>
                                        )}
                                    </div>

                                    {selectedEjemplar.location && (
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
                                                Ubicación Específica
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
                                                {selectedEjemplar.location}
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </Modal>
        </>
    );
}

