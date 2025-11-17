"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoUploader from "../../components/PhotoUploader";
import PhotoGallery from "../../components/PhotoGallery";
import { getApiUrl } from "../../utils/api-config";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está DESACTIVADO (requiere autenticación)
// Para activar en desarrollo: setear NEXT_PUBLIC_BYPASS_AUTH=true
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

// Usar configuración centralizada de API URL
const API = getApiUrl();

// Helper para formatear nombres comunes
const formatCommonNames = (nombre_común, nombres_comunes) => {
    // Si hay nombres_comunes y es diferente de nombre_común, mostrar ambos
    if (nombres_comunes && nombres_comunes.trim() && nombres_comunes !== nombre_común) {
        return `${nombre_común || ''} ${nombres_comunes ? `(${nombres_comunes})` : ''}`;
    }
    return nombre_común || nombres_comunes || '';
};

// Helper para obtener el access token
// Prioridad: token del AuthContext > cookies > localStorage
const getAccessTokenFromContext = (accessTokenFromContext) => {
    // Prioridad 1: Token del estado de AuthContext (más confiable)
    if (accessTokenFromContext) {
        return accessTokenFromContext;
    }

    if (typeof window === 'undefined') return null;

    // Prioridad 2: cookies
    const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match) {
        return match[2];
    }

    // Prioridad 3: localStorage (para compatibilidad)
    const localStorageToken = localStorage.getItem('access_token');
    if (localStorageToken) {
        return localStorageToken;
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
// Recibe accessToken del AuthContext como parámetro
const apiRequest = async (url, options = {}, accessTokenFromContext = null) => {
    // Usar token del contexto si está disponible, sino buscar en cookies/localStorage
    const accessToken = getAccessTokenFromContext(accessTokenFromContext);
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
    const { user, loading: authLoading, logout, fetchMe, accessToken } = useAuth();
    const router = useRouter();

    const [species, setSpecies] = useState([]);
    const [filteredSpecies, setFilteredSpecies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMorfologia, setFilterMorfologia] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" | "edit" | "view"
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [checkedAuth, setCheckedAuth] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [speciesIdToDelete, setSpeciesIdToDelete] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [formData, setFormData] = useState({
        scientific_name: "",
        nombre_común: "",
        nombres_comunes: "",
        tipo_planta: "",
        tipo_morfología: "",
        habitat: "",
        distribución: "",
        estado_conservación: "",
        categoria_conservacion: "",
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

            // Cargar todas las especies sin filtros del backend
            const url = `${API}/species/staff`;

            console.log('[SpeciesPage] Fetching species from:', url);
            const res = await apiRequest(url, {}, accessToken);

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
            if (data.length > 0) {
                console.log('[SpeciesPage] First species data:', data[0]);
                console.log('[SpeciesPage] nombre_común value:', data[0].nombre_común);
                console.log('[SpeciesPage] All keys:', Object.keys(data[0]));
            }
            setSpecies(data);
            // Inicializar filteredSpecies con todas las especies
            setFilteredSpecies(data);
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
    }, [user, checkedAuth]);

    // Efecto para aplicar filtros y ordenamiento cuando cambian
    useEffect(() => {
        let filtered = [...species];

        // Filtro por búsqueda general (nombre científico, nombre común o nombres comunes)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s => {
                // Buscar en nombre científico
                if (s.scientific_name?.toLowerCase().includes(query)) return true;
                // Buscar en nombre común
                if (s.nombre_común?.toLowerCase().includes(query)) return true;
                // Buscar en nombres comunes (separados por coma)
                if (s.nombres_comunes) {
                    const nombresComunes = s.nombres_comunes.split(',').map(n => n.trim().toLowerCase());
                    if (nombresComunes.some(n => n.includes(query))) return true;
                }
                return false;
            });
        }

        // Filtro por morfología
        if (filterMorfologia) {
            filtered = filtered.filter(s =>
                s.tipo_morfología?.toLowerCase().includes(filterMorfologia.toLowerCase())
            );
        }

        // Filtro por categoría de conservación
        if (filterCategoria) {
            filtered = filtered.filter(s => {
                const categoria = s.categoría_de_conservación || s.categoria_conservacion || "";
                return categoria.toLowerCase().includes(filterCategoria.toLowerCase());
            });
        }

        // Ordenamiento alfabético por nombre científico
        filtered.sort((a, b) => {
            const nameA = (a.scientific_name || "").toLowerCase();
            const nameB = (b.scientific_name || "").toLowerCase();
            if (sortOrder === "asc") {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });

        setFilteredSpecies(filtered);
    }, [species, searchQuery, filterMorfologia, filterCategoria, sortOrder]);

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
            categoria_conservacion: "",
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
            categoria_conservacion: sp.categoria_conservacion || "",
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

            // Mapear categoria_conservacion → categoría_de_conservación (nombre real en Supabase)
            if (payload.categoria_conservacion && payload.categoria_conservacion.trim() !== "") {
                payload.categoría_de_conservación = payload.categoria_conservacion.trim();
            } else {
                payload.categoría_de_conservación = null;
            }
            delete payload.categoria_conservacion;

            // Limpiar campos que no existen en la tabla o deben ser auto-generados
            if (payload.id) delete payload.id;
            if (payload.image_url) delete payload.image_url; // image_url no existe en la tabla
            if (payload.created_at) delete payload.created_at;
            if (payload.updated_at) delete payload.updated_at;

            // Convertir strings vacíos a null para campos ENUM (no aceptan strings vacíos)
            const enumFields = ["morfología_cactus", "tipo_morfología", "tipo_planta"];
            enumFields.forEach(field => {
                if (payload[field] === "") {
                    payload[field] = null;
                }
            });

            // Mapear tipo_morfología a morfología_cactus si es necesario
            if (payload.tipo_morfología && !payload.morfología_cactus) {
                payload.morfología_cactus = payload.tipo_morfología;
            }

            let res;
            if (modalMode === "create") {
                res = await apiRequest(`${API}/species/staff`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                }, accessToken);
            } else if (modalMode === "edit") {
                res = await apiRequest(`${API}/species/staff/${selectedSpecies.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                }, accessToken);
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
            }, accessToken);

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
            <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Responsive para el botón */
                @media (max-width: 400px) {
                  .btn-text {
                    display: none !important;
                  }
                }
                
                @media (max-width: 768px) {
                  .grid-2-cols {
                    grid-template-columns: 1fr !important;
                  }
                }
        
        /* Responsive para las imágenes en la tabla */
        @media (max-width: 768px) {
          .species-image {
            width: 80px !important;
            height: 80px !important;
            min-width: 80px !important;
            min-height: 80px !important;
          }
          
          .species-image-placeholder {
            width: 80px !important;
            height: 80px !important;
            min-width: 80px !important;
            min-height: 80px !important;
            font-size: 32px !important;
          }
        }
        
        /* Responsive para el ancho de la columna */
        @media (max-width: 768px) {
          .image-column {
            width: 112px !important;
            min-width: 112px !important;
          }
        }
        
        /* Responsive para el padding en móvil */
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
                {/* Header */}
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
                                    Gestión de Especies
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
                                    color: "#6b7280",
                                    margin: 0
                                }}>
                                    {loading ? (
                                        "Cargando..."
                                    ) : filteredSpecies.length !== species.length ? (
                                        `${filteredSpecies.length} de ${species.length} especies`
                                    ) : (
                                        `${species.length} especies`
                                    )}
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
                            placeholder="Buscar por nombre científico o nombre común..."
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
                            <span className="btn-text">Nueva Especie</span>
                        </button>
                    </div>

                    {/* Controles de filtros y ordenamiento */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "clamp(12px, 3vw, 16px) clamp(12px, 4vw, 20px)",
                        marginBottom: "24px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                    }}>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                            {/* Ordenamiento */}
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1", minWidth: "150px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", minWidth: "60px" }}>
                                    Ordenar:
                                </label>
                                <button
                                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                    style={{
                                        padding: "6px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        backgroundColor: sortOrder === "asc" ? "#ecfdf5" : "#fef3c7",
                                        color: sortOrder === "asc" ? "#065f46" : "#92400e",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        flex: 1
                                    }}
                                >
                                    {sortOrder === "asc" ? "A-Z ↑" : "Z-A ↓"}
                                </button>
                            </div>

                            {/* Filtro por morfología */}
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1", minWidth: "200px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", minWidth: "80px" }}>
                                    Morfología:
                                </label>
                                <select
                                    value={filterMorfologia}
                                    onChange={(e) => setFilterMorfologia(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        outline: "none",
                                        backgroundColor: "white"
                                    }}
                                >
                                    <option value="">Todas las morfologías</option>
                                    <option value="Columnar">Columnar</option>
                                    <option value="Redondo">Redondo</option>
                                    <option value="Agave">Agave</option>
                                    <option value="Tallo plano">Tallo plano</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            {/* Filtro por categoría de conservación */}
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1", minWidth: "200px" }}>
                                <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", minWidth: "80px" }}>
                                    Conservación:
                                </label>
                                <select
                                    value={filterCategoria}
                                    onChange={(e) => setFilterCategoria(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        outline: "none",
                                        backgroundColor: "white"
                                    }}
                                >
                                    <option value="">Todas las categorías</option>
                                    <option value="No amenazado">No amenazado</option>
                                    <option value="Preocupación menor">Preocupación menor</option>
                                    <option value="Protegido">Protegido</option>
                                    <option value="En peligro de extinción">En peligro de extinción</option>
                                </select>
                            </div>
                        </div>

                        {/* Botón para limpiar filtros */}
                        {(searchQuery || filterMorfologia || filterCategoria) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterMorfologia("");
                                    setFilterCategoria("");
                                }}
                                style={{
                                    padding: "8px 12px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "6px",
                                    backgroundColor: "#f3f4f6",
                                    color: "#374151",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    alignSelf: "flex-start"
                                }}
                            >
                                Limpiar filtros
                            </button>
                        )}
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
                                        <th className="image-column table-header" style={{
                                            padding: "16px",
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
                                        <th className="table-header" style={{
                                            padding: "16px",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}>
                                            Nombre Científico
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
                                            Nombre Común
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
                                            Categoría de Conservación
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
                                            Endémica
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
                                            Cuidado y Recomendaciones
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
                                            Hábitat
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
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                Cargando especies...
                                            </td>
                                        </tr>
                                    ) : filteredSpecies.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{
                                                padding: "48px 16px",
                                                textAlign: "center",
                                                color: "#9ca3af"
                                            }}>
                                                {species.length === 0
                                                    ? "No hay especies registradas. ¡Crea la primera!"
                                                    : "No hay especies que coincidan con los filtros"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSpecies.map((sp) => {
                                            const isEndangered = sp.categoria_conservacion === "En peligro de extinción";
                                            return (
                                                <tr
                                                    key={sp.id}
                                                    style={{
                                                        borderBottom: "1px solid #e5e7eb",
                                                        transition: "background-color 0.2s",
                                                        backgroundColor: isEndangered ? "#fee2e2" : "white",
                                                        borderLeft: isEndangered ? "4px solid #ef4444" : "none"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isEndangered) {
                                                            e.currentTarget.style.backgroundColor = "#f9fafb";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = isEndangered ? "#fee2e2" : "white";
                                                    }}
                                                >
                                                    <td className="table-cell" style={{
                                                        padding: "16px 16px",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        {(sp.cover_photo || sp.image_url) ? (
                                                            <img
                                                                className="species-image"
                                                                src={sp.cover_photo || sp.image_url}
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedImage({ url: sp.cover_photo || sp.image_url, name: sp.nombre_común || sp.scientific_name });
                                                                    setShowImageModal(true);
                                                                }}
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
                                                            <div
                                                                className="species-image-placeholder"
                                                                style={{
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
                                                                }}
                                                            >
                                                                🌵
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#111827",
                                                        fontWeight: "500",
                                                        fontStyle: "italic",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                            <span>{sp.scientific_name}</span>
                                                            <span style={{ fontSize: "12px", color: "#9ca3af", fontFamily: "monospace", marginTop: "2px" }}>
                                                                ID: {sp.id}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        fontSize: "14px",
                                                        color: "#374151",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                            {sp.nombre_común && (
                                                                <span style={{ fontWeight: "500", fontSize: "14px" }}>{sp.nombre_común}</span>
                                                            )}
                                                            {sp.nombres_comunes && (
                                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                                                    {sp.nombres_comunes}
                                                                </span>
                                                            )}
                                                            {!sp.nombre_común && !sp.nombres_comunes && (
                                                                <span style={{ fontStyle: "italic", color: "#9ca3af", fontSize: "14px" }}>-</span>
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
                                                            backgroundColor: (sp.categoría_de_conservación === "En peligro de extinción" || sp.categoria_conservacion === "En peligro de extinción") ? "#fef2f2" :
                                                                (sp.categoría_de_conservación === "Protegido" || sp.categoria_conservacion === "Protegido") ? "#fff7ed" :
                                                                    (sp.categoría_de_conservación === "Preocupación menor" || sp.categoria_conservacion === "Preocupación menor") ? "#f0fdf4" :
                                                                        "#f3f4f6",
                                                            color: (sp.categoría_de_conservación === "En peligro de extinción" || sp.categoria_conservacion === "En peligro de extinción") ? "#dc2626" :
                                                                (sp.categoría_de_conservación === "Protegido" || sp.categoria_conservacion === "Protegido") ? "#ea580c" :
                                                                    (sp.categoría_de_conservación === "Preocupación menor" || sp.categoria_conservacion === "Preocupación menor") ? "#16a34a" :
                                                                        "#6b7280"
                                                        }}>
                                                            {sp.categoría_de_conservación || sp.categoria_conservacion || "No especificado"}
                                                        </span>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        textAlign: "center",
                                                        verticalAlign: "middle"
                                                    }}>
                                                        <span style={{
                                                            fontSize: "14px",
                                                            fontWeight: "600",
                                                            color: sp.Endémica ? "#16a34a" : "#9ca3af"
                                                        }}>
                                                            {sp.Endémica ? "Sí" : "No"}
                                                        </span>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        verticalAlign: "middle",
                                                        maxWidth: "300px"
                                                    }}>
                                                        <div style={{
                                                            fontSize: "13px",
                                                            color: "#374151",
                                                            lineHeight: "1.5",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: "vertical"
                                                        }}>
                                                            {sp.cuidado || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        verticalAlign: "middle",
                                                        maxWidth: "300px"
                                                    }}>
                                                        <div style={{
                                                            fontSize: "13px",
                                                            color: "#374151",
                                                            lineHeight: "1.5",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: "vertical"
                                                        }}>
                                                            {sp.habitat || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="table-cell" style={{
                                                        padding: "16px",
                                                        textAlign: "right",
                                                        verticalAlign: "middle"
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
                                            );
                                        })
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
                                    <p style={{
                                        fontSize: "13px",
                                        color: "#9ca3af",
                                        fontFamily: "monospace",
                                        margin: "4px 0 0 0"
                                    }}>
                                        ID: {selectedSpecies.id}
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
                                    {(selectedSpecies.cover_photo || selectedSpecies.image_url) ? (
                                        <img
                                            src={selectedSpecies.cover_photo || selectedSpecies.image_url}
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

                                {/* Sección de Fotos */}
                                <div style={{
                                    marginTop: "24px",
                                    paddingTop: "24px",
                                    borderTop: "2px solid #e5e7eb"
                                }}>
                                    <h3 style={{
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        color: "#111827",
                                        marginBottom: "16px"
                                    }}>
                                        📸 Fotos de la Especie
                                    </h3>

                                    {/* Galería de fotos existentes */}
                                    <PhotoGallery
                                        entityType="especie"
                                        entityId={selectedSpecies.id}
                                        showManageButtons={true}
                                        onRefresh={() => {
                                            // Refrescar datos de la especie
                                            if (selectedSpecies) {
                                                handleView(selectedSpecies);
                                            }
                                        }}
                                    />

                                    {/* Componente para subir nuevas fotos */}
                                    <PhotoUploader
                                        entityType="especie"
                                        entityId={selectedSpecies.id}
                                        onUploadComplete={() => {
                                            // Refrescar la galería después de subir
                                            if (selectedSpecies) {
                                                handleView(selectedSpecies);
                                            }
                                        }}
                                        maxPhotos={10}
                                    />
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
                                    Estado de Conservación (Descripción Libre)
                                </label>
                                <input
                                    type="text"
                                    value={formData.estado_conservación}
                                    onChange={(e) => setFormData({ ...formData, estado_conservación: e.target.value })}
                                    placeholder="Ej: Endémica de Chile central"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
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
                                    Categoría de Conservación
                                </label>
                                <select
                                    value={formData.categoria_conservacion}
                                    onChange={(e) => setFormData({ ...formData, categoria_conservacion: e.target.value })}
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
                                    <option value="No amenazado">No amenazado</option>
                                    <option value="Preocupación menor">Preocupación menor</option>
                                    <option value="Protegido">Protegido</option>
                                    <option value="En peligro de extinción">En peligro de extinción</option>
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

                            <div style={{
                                padding: "16px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb"
                            }}>
                                <h3 style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#111827",
                                    margin: "0 0 12px 0"
                                }}>
                                    Información Taxonómica
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "4px"
                                        }}>
                                            Nombres Comunes (separados por comas)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nombres_comunes}
                                            onChange={(e) => setFormData({ ...formData, nombres_comunes: e.target.value })}
                                            placeholder="Ej: Copao, Quisco"
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                color: "#374151",
                                                marginBottom: "4px"
                                            }}>
                                                Tipo de Planta
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.tipo_planta}
                                                onChange={(e) => setFormData({ ...formData, tipo_planta: e.target.value })}
                                                placeholder="Ej: Cactácea"
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: "6px",
                                                    fontSize: "14px",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                color: "#374151",
                                                marginBottom: "4px"
                                            }}>
                                                Tipo de Morfología
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.tipo_morfología}
                                                onChange={(e) => setFormData({ ...formData, tipo_morfología: e.target.value })}
                                                placeholder="Ej: Columnar, Espinoso"
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: "6px",
                                                    fontSize: "14px",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "4px"
                                        }}>
                                            Distribución
                                        </label>
                                        <textarea
                                            value={formData.distribución}
                                            onChange={(e) => setFormData({ ...formData, distribución: e.target.value })}
                                            rows={2}
                                            placeholder="Región de distribución..."
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                color: "#374151",
                                                marginBottom: "4px"
                                            }}>
                                                Expectativa de Vida
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.expectativa_vida}
                                                onChange={(e) => setFormData({ ...formData, expectativa_vida: e.target.value })}
                                                placeholder="Ej: 50-100 años"
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: "6px",
                                                    fontSize: "14px",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                color: "#374151",
                                                marginBottom: "4px"
                                            }}>
                                                Floración
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.floración}
                                                onChange={(e) => setFormData({ ...formData, floración: e.target.value })}
                                                placeholder="Ej: Primavera-Verano"
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: "6px",
                                                    fontSize: "14px",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: "16px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb"
                            }}>
                                <h3 style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#111827",
                                    margin: "0 0 12px 0"
                                }}>
                                    Información Adicional
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "4px"
                                        }}>
                                            Usos
                                        </label>
                                        <textarea
                                            value={formData.usos}
                                            onChange={(e) => setFormData({ ...formData, usos: e.target.value })}
                                            rows={2}
                                            placeholder="Usos tradicionales, medicinales, etc."
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "4px"
                                        }}>
                                            Historia del Nombre
                                        </label>
                                        <textarea
                                            value={formData.historia_nombre}
                                            onChange={(e) => setFormData({ ...formData, historia_nombre: e.target.value })}
                                            rows={2}
                                            placeholder="Origen y significado del nombre científico..."
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{
                                            display: "block",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "4px"
                                        }}>
                                            Historia y Leyendas
                                        </label>
                                        <textarea
                                            value={formData.historia_y_leyendas}
                                            onChange={(e) => setFormData({ ...formData, historia_y_leyendas: e.target.value })}
                                            rows={3}
                                            placeholder="Leyendas, mitos e historias relacionadas..."
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                                resize: "vertical",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>
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

            {/* Modal de Imagen Ampliada */}
            {showImageModal && selectedImage && (
                <div
                    onClick={() => setShowImageModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                >
                    <div style={{
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        position: 'relative'
                    }}>
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '12px'
                            }}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowImageModal(false);
                            }}
                            style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                color: '#1f2937',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'white';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            ×
                        </button>
                        <p style={{
                            position: 'absolute',
                            bottom: '-40px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center'
                        }}>
                            {selectedImage.name}
                        </p>
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


