"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import PhotoUploader from "../../components/PhotoUploader";
import { getApiUrl } from "../../utils/api-config";
import { resolvePhotoUrl } from "../../utils/images";
import { getAccessTokenFromContext } from "../../utils/auth-helpers";
import { fetchAllStaffSpecies } from "../../utils/species-api";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
const API = getApiUrl();
const EDITOR_SPECIES_PAGE_SIZE = 25;
const SIDEBAR_DEFAULT_WIDTH = 480;
const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_MAX_WIDTH = 680;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const EDITOR_HEADER_FALLBACK_HEIGHT = 76;

const clampSidebarWidth = (value) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value));

export default function SpeciesEditorPage() {
    const { user, loading: authLoading, logout, accessToken, apiRequest: authApiRequest } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [species, setSpecies] = useState([]);
    const [filteredSpecies, setFilteredSpecies] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [filteredSectors, setFilteredSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [editorMode, setEditorMode] = useState("species"); // "species" or "sectors"
    const [mobileEditorView, setMobileEditorView] = useState("modules"); // "modules" | "list" | "detail"

    // Estados para filtros y ordenamiento de especies
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMorfologia, setFilterMorfologia] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"
    const [currentEditorSpeciesPage, setCurrentEditorSpeciesPage] = useState(1);
    const [formData, setFormData] = useState({
        scientific_name: "", nombre_común: "", nombres_comunes: "",
        tipo_planta: "", tipo_morfología: "", habitat: "",
        distribución: "", estado_conservación: "", categoria_conservacion: "", Endémica: false,
        expectativa_vida: "", floración: "", cuidado: "",
        usos: "", historia_nombre: "", historia_y_leyendas: "", image_url: ""
    });
    // Estados para sectores
    const [sectorSearchQuery, setSectorSearchQuery] = useState("");
    const [sectorFormData, setSectorFormData] = useState({
        name: "", description: "", qr_code: ""
    });
    const [sectorSpeciesIds, setSectorSpeciesIds] = useState([]); // IDs de especies asociadas
    const [allSpeciesList, setAllSpeciesList] = useState([]); // Lista completa de especies para selección
    const [loadingSectorSpecies, setLoadingSectorSpecies] = useState(false);
    // Cache para saber si el endpoint de especies del sector está disponible
    const [speciesEndpointAvailable, setSpeciesEndpointAvailable] = useState(null); // null = no probado, true = disponible, false = no disponible
    const [submitting, setSubmitting] = useState(false);
    // Nueva búsqueda local para "Especies en este Sector"
    const [sectorSpeciesQuery, setSectorSpeciesQuery] = useState("");
    // Ordenamiento de sectores
    const [sectorSortOrder, setSectorSortOrder] = useState("asc"); // "asc" | "desc"

    const [checkedAuth, setCheckedAuth] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [editorHeaderHeight, setEditorHeaderHeight] = useState(EDITOR_HEADER_FALLBACK_HEIGHT);
    const [showPhotoUploader, setShowPhotoUploader] = useState(false);
    const [speciesPhotos, setSpeciesPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const fileInputRef = useRef(null);
    const editorHeaderRef = useRef(null);
    const speciesSidebarRef = useRef(null);
    const sidebarResizeRef = useRef({
        startX: 0,
        startWidth: SIDEBAR_DEFAULT_WIDTH
    });

    const handleSidebarResizeStart = (event) => {
        if (sidebarCollapsed) return;
        event.preventDefault();
        event.stopPropagation();
        sidebarResizeRef.current = {
            startX: event.clientX,
            startWidth: sidebarWidth
        };
        setIsResizingSidebar(true);
    };

    const handleSidebarResizeKeyDown = (event) => {
        if (sidebarCollapsed) return;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            setSidebarWidth(width => clampSidebarWidth(width - 24));
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            setSidebarWidth(width => clampSidebarWidth(width + 24));
        }
    };

    useEffect(() => {
        if (!isResizingSidebar) return;

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;

        const handlePointerMove = (event) => {
            const { startX, startWidth } = sidebarResizeRef.current;
            setSidebarWidth(clampSidebarWidth(startWidth + event.clientX - startX));
        };

        const handlePointerUp = () => {
            setIsResizingSidebar(false);
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [isResizingSidebar]);

    useEffect(() => {
        if (!editorHeaderRef.current) return;

        const updateHeaderHeight = () => {
            const nextHeight = Math.ceil(editorHeaderRef.current?.getBoundingClientRect().height || EDITOR_HEADER_FALLBACK_HEIGHT);
            setEditorHeaderHeight(nextHeight);
        };

        updateHeaderHeight();

        const resizeObserver = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(updateHeaderHeight)
            : null;

        resizeObserver?.observe(editorHeaderRef.current);
        window.addEventListener("resize", updateHeaderHeight);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener("resize", updateHeaderHeight);
        };
    }, []);

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

    // Helper para requests autenticadas
    // Usa el apiRequest del AuthContext si está disponible, sino crea uno local
    // Mantiene la lógica especial para ngrok y endpoints de especies
    const apiRequest = async (url, options = {}, accessTokenFromContext = null) => {
        try {
            // Validar y corregir URL si es localhost desde dispositivo remoto
            let finalUrl = url;
            if (typeof window !== 'undefined') {
                const currentHostname = window.location.hostname;
                // Si la URL es localhost pero estamos en un dispositivo remoto, usar producción
                if (url.includes('localhost:8000') || url.includes('127.0.0.1:8000')) {
                    if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
                        // Usar la URL del API configurada en lugar de hardcodear
                        const apiUrl = getApiUrl();
                        finalUrl = url.replace(/http:\/\/(localhost|127\.0\.0\.1):8000/g, apiUrl);
                    }
                }
            }

            // Detectar si es un endpoint de especies del sector
            const isSpeciesEndpoint = finalUrl.includes('/sectors/staff/') && finalUrl.includes('/species');

            // Si tenemos apiRequest del AuthContext, usarlo
            if (authApiRequest) {
                // Agregar header de ngrok si es necesario
                const ngrokHeaders = {};
                if (typeof window !== 'undefined' &&
                    (window.location.hostname.includes('ngrok.io') ||
                        window.location.hostname.includes('ngrok-free.dev') ||
                        window.location.hostname.includes('ngrok-free.app') ||
                        window.location.hostname.includes('ngrokapp.com') ||
                        window.location.hostname.includes('ngrok'))) {
                    ngrokHeaders['ngrok-skip-browser-warning'] = 'true';
                }

                const response = await authApiRequest(finalUrl, {
                    ...options,
                    headers: {
                        ...ngrokHeaders,
                        ...options.headers,
                    },
                    signal: options.signal
                });

                // Manejar error 405 para endpoints de especies
                if (!response.ok && response.status === 405 && isSpeciesEndpoint) {
                    return {
                        ok: false,
                        status: 405,
                        json: async () => ({}),
                        text: async () => '',
                        headers: response.headers,
                        statusText: 'Method Not Allowed'
                    };
                }

                return response;
            }

            // Fallback: implementación local (para compatibilidad)
            const accessToken = getAccessTokenFromContext(accessTokenFromContext);
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };

            // Agregar header de ngrok si estamos en un dominio ngrok
            if (typeof window !== 'undefined' &&
                (window.location.hostname.includes('ngrok.io') ||
                    window.location.hostname.includes('ngrok-free.dev') ||
                    window.location.hostname.includes('ngrok-free.app') ||
                    window.location.hostname.includes('ngrokapp.com') ||
                    window.location.hostname.includes('ngrok'))) {
                headers['ngrok-skip-browser-warning'] = 'true';
            }

            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            } else {
                console.error('[SpeciesEditor] ❌ No access token available for:', options.method || 'GET', finalUrl);
            }

            try {
                const response = await fetch(finalUrl, {
                    ...options,
                    headers,
                    credentials: 'include',
                    signal: options.signal
                });

                if (!response.ok) {
                    // Suprimir completamente el error 405 para endpoints de especies
                    if (response.status === 405 && isSpeciesEndpoint) {
                        return {
                            ok: false,
                            status: 405,
                            json: async () => ({}),
                            text: async () => '',
                            headers: response.headers,
                            statusText: 'Method Not Allowed'
                        };
                    }

                    const errorText = await response.text().catch(() => '');
                    const errorMessage = errorText || response.statusText;
                    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
                }

                return response;
            } catch (fetchError) {
                throw fetchError;
            }
        } catch (error) {
            // Si es un error de red, lanzarlo con un mensaje más descriptivo
            if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('Load failed'))) {
                throw new Error('Error de conexión. Verifica tu conexión a internet o intenta más tarde.');
            }
            throw error;
        }
    };

    const invalidateSpeciesDependentQueries = (speciesId = null) => {
        queryClient.invalidateQueries({ queryKey: ["species"] });
        if (speciesId) {
            queryClient.invalidateQueries({ queryKey: ["species", speciesId] });
        }
        queryClient.invalidateQueries({ queryKey: ["ejemplares"] });
        queryClient.invalidateQueries({ queryKey: ["sectors"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
    };

    const fetchSpecies = async () => {
        try {
            setLoading(true);
            setError("");

            const requestWithToken = (url, options = {}) => apiRequest(url, options, accessToken);
            const data = await fetchAllStaffSpecies(requestWithToken);
            setSpecies(data);
            setSelectedSpecies(current => {
                if (!current) return current;
                return data.find(sp => sp.id === current.id) || current;
            });
            // Los filtros se aplicarán automáticamente en el useEffect
        } catch (err) {
            if (err.status === 401 && !BYPASS_AUTH) {
                setError("Sesión expirada");
                setTimeout(() => router.replace("/login"), 1500);
                return;
            }
            // Manejar errores de red sin mostrar en consola
            const errorMessage = err.message || "Error al cargar especies";
            if (!errorMessage.includes('Network error') && !errorMessage.includes('Load failed')) {
                setError(errorMessage);
            } else {
                setError("Error de conexión. Por favor, verifica tu conexión a internet.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Función para verificar silenciosamente si el endpoint está disponible
    const checkSpeciesEndpointAvailability = async (testSectorId = null) => {
        // Solo probar si aún no sabemos el estado
        if (speciesEndpointAvailable !== null) return;

        try {
            // Usar el ID proporcionado o el primer sector disponible
            const sectorId = testSectorId || (sectors.length > 0 ? sectors[0].id : 1);

            // Hacer petición silenciosamente - el apiRequest ya maneja el 405
            const res = await apiRequest(`${API}/sectors/staff/${sectorId}/species`, {}, accessToken);

            if (res.ok) {
                setSpeciesEndpointAvailable(true);
            } else if (res.status === 405) {
                // Endpoint no disponible, marcar inmediatamente para evitar más intentos
                setSpeciesEndpointAvailable(false);
            }
        } catch (err) {
            // Si es 405, el endpoint no está disponible (aunque no debería llegar aquí)
            if (err.message && err.message.includes('405')) {
                setSpeciesEndpointAvailable(false);
            }
        }
    };

    const fetchSectors = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await apiRequest(`${API}/sectors/staff`, {}, accessToken);
            if (!res.ok) {
                if (res.status === 401 && !BYPASS_AUTH) {
                    setError("Sesión expirada");
                    setTimeout(() => router.replace("/login"), 1500);
                    return;
                }
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error al cargar sectores (${res.status})`);
            }
            const data = await res.json();
            setSectors(data);

            // Después de cargar sectores, probar el endpoint de especies si aún no lo hemos hecho
            if (speciesEndpointAvailable === null && data.length > 0) {
                checkSpeciesEndpointAvailability(data[0].id);
            }
        } catch (err) {
            // Manejar errores de red sin mostrar en consola
            const errorMessage = err.message || "Error al cargar sectores";
            if (!errorMessage.includes('Network error') && !errorMessage.includes('Load failed')) {
                setError(errorMessage);
            } else {
                setError("Error de conexión. Por favor, verifica tu conexión a internet.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (checkedAuth && (user || BYPASS_AUTH)) {
            fetchSpecies();
            fetchSectors();
        }
    }, [user, checkedAuth]);

    // Cargar todas las especies para el selector (solo una vez)
    useEffect(() => {
        if (user || BYPASS_AUTH) {
            const fetchAllSpecies = async () => {
                try {
                    const requestWithToken = (url, options = {}) => apiRequest(url, options, accessToken);
                    const data = await fetchAllStaffSpecies(requestWithToken);
                    setAllSpeciesList(data.sort((a, b) =>
                        (a.scientific_name || "").toLowerCase().localeCompare((b.scientific_name || "").toLowerCase())
                    ));
                } catch (err) {
                    // Error silencioso al cargar todas las especies
                }
            };
            fetchAllSpecies();
        }
    }, [user]);

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
            const nameA = a.scientific_name.toLowerCase();
            const nameB = b.scientific_name.toLowerCase();
            if (sortOrder === "asc") {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });

        setFilteredSpecies(filtered);
    }, [species, searchQuery, filterMorfologia, filterCategoria, sortOrder]);

    useEffect(() => {
        setCurrentEditorSpeciesPage(1);
    }, [searchQuery, filterMorfologia, filterCategoria, sortOrder, editorMode]);

    const totalEditorSpeciesPages = Math.max(1, Math.ceil(filteredSpecies.length / EDITOR_SPECIES_PAGE_SIZE));
    const normalizedEditorSpeciesPage = Math.min(currentEditorSpeciesPage, totalEditorSpeciesPages);
    const editorSpeciesPageStart = (normalizedEditorSpeciesPage - 1) * EDITOR_SPECIES_PAGE_SIZE;
    const paginatedEditorSpecies = filteredSpecies.slice(
        editorSpeciesPageStart,
        editorSpeciesPageStart + EDITOR_SPECIES_PAGE_SIZE
    );
    const firstVisibleEditorSpecies = filteredSpecies.length === 0 ? 0 : editorSpeciesPageStart + 1;
    const lastVisibleEditorSpecies = Math.min(
        editorSpeciesPageStart + paginatedEditorSpecies.length,
        filteredSpecies.length
    );

    useEffect(() => {
        if (currentEditorSpeciesPage > totalEditorSpeciesPages) {
            setCurrentEditorSpeciesPage(totalEditorSpeciesPages);
        }
    }, [currentEditorSpeciesPage, totalEditorSpeciesPages]);

    const scrollSpeciesSidebarToTop = () => {
        window.requestAnimationFrame(() => {
            speciesSidebarRef.current?.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    };

    const handleEditorSpeciesPageChange = (page) => {
        const nextPage = Number(page);
        if (!Number.isFinite(nextPage)) return;

        setCurrentEditorSpeciesPage(Math.min(totalEditorSpeciesPages, Math.max(1, nextPage)));
        scrollSpeciesSidebarToTop();
    };

    const scrollPageToTop = () => {
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    const handleModeChange = (mode) => {
        setEditorMode(mode);
        setSelectedSpecies(null);
        setSelectedSector(null);
        setShowPhotoUploader(false);
        setSidebarCollapsed(false);
        setMobileEditorView("list");
        setError("");
        setSuccess("");
        scrollPageToTop();
    };

    const handleMobileDetailBack = () => {
        setMobileEditorView("list");
        setError("");
        scrollPageToTop();
    };

    // Efecto para filtrar sectores
    useEffect(() => {
        let filtered = [...sectors];
        if (sectorSearchQuery) {
            const query = sectorSearchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.name?.toLowerCase().includes(query) ||
                s.description?.toLowerCase().includes(query) ||
                s.qr_code?.toLowerCase().includes(query)
            );
        }
        // Ordenar por nombre de sector según sectorSortOrder
        filtered.sort((a, b) => {
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();
            return sectorSortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        setFilteredSectors(filtered);
    }, [sectors, sectorSearchQuery, sectorSortOrder]);

    const fetchSpeciesPhotos = async (speciesId) => {
        if (!speciesId) return;
        setLoadingPhotos(true);
        try {
            const token = getAccessTokenFromContext(accessToken);
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await apiRequest(`${API}/photos/especie/${speciesId}`, {
                method: 'GET',
                headers
            }, accessToken);
            if (res.ok) {
                const data = await res.json();
                const photos = data.photos || [];
                const coverPhoto = photos.find(photo => photo.is_cover) || photos[0] || null;

                setSpeciesPhotos(photos);
                setSelectedSpecies(current => {
                    if (!current || current.id !== speciesId) return current;
                    return { ...current, cover_photo: coverPhoto };
                });
                setSpecies(current => current.map(sp =>
                    sp.id === speciesId ? { ...sp, cover_photo: coverPhoto } : sp
                ));
                setAllSpeciesList(current => current.map(sp =>
                    sp.id === speciesId ? { ...sp, cover_photo: coverPhoto } : sp
                ));
            } else {
                setSpeciesPhotos([]);
            }
        } catch (err) {
            console.error('[SpeciesEditor] Error fetching photos:', err);
            setSpeciesPhotos([]);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleSelect = (sp) => {
        setSelectedSpecies(sp);
        setShowPhotoUploader(false);
        setSidebarCollapsed(false);
        setMobileEditorView("detail");
        fetchSpeciesPhotos(sp.id);

        // Usar tipo_morfología tal cual viene de la base de datos
        let tipoMorfologia = sp.tipo_morfología || "";

        // Normalizar categoría de conservación
        const categoriaOptions = ["No amenazado", "Preocupación menor", "Protegido", "En peligro de extinción"];
        // Obtener el valor desde cualquier campo posible (con y sin tilde)
        let categoriaConservacion = sp.categoría_de_conservación || sp.categoria_conservacion || "";

        // Normalizar y mapear el valor
        if (categoriaConservacion) {
            const normalized = categoriaConservacion.trim();

            // Normalizar espacios múltiples
            const normalizedSpaces = normalized.replace(/\s+/g, ' ');

            // Buscar coincidencia exacta (case-insensitive, ignorando espacios extra)
            let matched = categoriaOptions.find(opt => {
                const optTrimmed = opt.trim();
                const valTrimmed = normalizedSpaces.trim();
                return optTrimmed.toLowerCase() === valTrimmed.toLowerCase();
            });

            if (matched) {
                categoriaConservacion = matched;
            } else {
                // Buscar coincidencia sin tildes/acentos
                matched = categoriaOptions.find(opt => {
                    const optNorm = opt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    const valNorm = normalizedSpaces.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    return optNorm === valNorm;
                });

                if (matched) {
                    categoriaConservacion = matched;
                } else {
                    // Si no hay coincidencia, usar el valor normalizado (sin espacios extra)
                    categoriaConservacion = normalizedSpaces;
                }
            }
        } else {
            categoriaConservacion = "";
        }

        setFormData({
            scientific_name: sp.scientific_name || "",
            nombre_común: sp.nombre_común || "",
            nombres_comunes: sp.nombres_comunes || "",
            tipo_planta: sp.tipo_planta || "",
            tipo_morfología: tipoMorfologia,
            habitat: sp.habitat || "",
            distribución: sp.distribución || "",
            estado_conservación: sp.estado_conservación || "",
            categoria_conservacion: categoriaConservacion,
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
        scrollPageToTop();
    };

    const fetchSectorSpecies = async (sectorId) => {
        // Si ya sabemos que el endpoint no está disponible, NO limpiar las selecciones
        // Solo hacer la petición si no sabemos el estado o si está disponible
        if (speciesEndpointAvailable === false) {
            // No hacer petición y mantener las selecciones actuales
            // Esto evita que se deseleccionen las especies cuando el endpoint no está disponible
            return;
        }

        try {
            setLoadingSectorSpecies(true);
            const res = await apiRequest(`${API}/sectors/staff/${sectorId}/species`, {}, accessToken);
            if (res.ok) {
                // Endpoint disponible y funcionando
                setSpeciesEndpointAvailable(true);
                const data = await res.json();
                setSectorSpeciesIds(data.map(s => s.id));
            } else {
                // Si el error es 405, el backend aún no tiene la ruta actualizada
                if (res.status === 405) {
                    setSpeciesEndpointAvailable(false);
                    // NO limpiar las selecciones - mantener las que el usuario tenía
                    // Esto evita que se deseleccionen después de guardar
                } else {
                    // Para otros errores, sí limpiar
                    setSectorSpeciesIds([]);
                }
            }
        } catch (err) {
            // Si es 405, marcar endpoint como no disponible pero NO limpiar selecciones
            if (err.message && err.message.includes('405')) {
                setSpeciesEndpointAvailable(false);
                // Mantener las selecciones actuales
            } else {
                // Para otros errores, limpiar
                setSectorSpeciesIds([]);
            }
        } finally {
            setLoadingSectorSpecies(false);
        }
    };

    const handleSelectSector = (sector) => {
        setSelectedSector(sector);
        setSidebarCollapsed(false);
        setMobileEditorView("detail");
        setSectorFormData({
            name: sector.name || "",
            description: sector.description || "",
            qr_code: sector.qr_code || ""
        });
        setSectorSpeciesIds([]);
        setError("");
        // Solo intentar cargar especies si el endpoint está disponible o no sabemos su estado
        // Esto evita errores en consola después de la primera vez
        if (speciesEndpointAvailable !== false) {
            fetchSectorSpecies(sector.id);
        }
        scrollPageToTop();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            if (editorMode === "species" && selectedSpecies) {
                const scientificName = formData.scientific_name.trim();
                if (!scientificName) {
                    throw new Error("El nombre científico es obligatorio");
                }
                const slug = scientificName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
                // Construir payload y mapear campos al nombre correcto de Supabase
                // IMPORTANTE: Crear payload solo con los campos permitidos, NO usar spread de formData
                // para evitar copiar campos no deseados como morfología_cactus
                const payload = {
                    scientific_name: scientificName,
                    nombre_común: formData.nombre_común,
                    nombres_comunes: formData.nombres_comunes,
                    tipo_planta: formData.tipo_planta,
                    tipo_morfología: formData.tipo_morfología,
                    habitat: formData.habitat,
                    distribución: formData.distribución,
                    estado_conservación: formData.estado_conservación,
                    categoria_conservacion: formData.categoria_conservacion,
                    Endémica: formData.Endémica,
                    expectativa_vida: formData.expectativa_vida,
                    floración: formData.floración,
                    cuidado: formData.cuidado,
                    usos: formData.usos,
                    historia_nombre: formData.historia_nombre,
                    historia_y_leyendas: formData.historia_y_leyendas,
                    slug: slug
                };

                // Mapear categoria_conservacion → categoría_de_conservación (nombre real en Supabase)
                // Solo enviar si tiene un valor (no vacío ni null)
                if (payload.categoria_conservacion && payload.categoria_conservacion.trim() !== "") {
                    payload.categoría_de_conservación = payload.categoria_conservacion.trim();
                } else {
                    // Si está vacío, enviar como null o eliminar el campo
                    payload.categoría_de_conservación = null;
                }
                delete payload.categoria_conservacion;

                // Omitir image_url si no existe en la tabla
                if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) delete payload.image_url;

                // Remover morfología_cactus si existe (es un enum con valores limitados, no debe enviarse desde el frontend)
                // El frontend solo usa tipo_morfología
                if (Object.prototype.hasOwnProperty.call(payload, 'morfología_cactus')) {
                    delete payload.morfología_cactus;
                }

                // Remover campos calculados que no existen en la tabla
                const calculatedFields = ['cover_photo', 'photos'];
                calculatedFields.forEach(field => {
                    if (Object.prototype.hasOwnProperty.call(payload, field)) {
                        delete payload[field];
                    }
                });

                // Remover campos de timestamp que deben ser generados automáticamente
                const autoFields = ['created_at', 'updated_at'];
                autoFields.forEach(field => {
                    if (Object.prototype.hasOwnProperty.call(payload, field)) {
                        delete payload[field];
                    }
                });

                // Validar que el payload no tenga campos undefined
                const cleanPayload = Object.fromEntries(
                    Object.entries(payload).filter(([_, v]) => v !== undefined)
                );


                const res = await apiRequest(`${API}/species/staff/${selectedSpecies.id}`, {
                    method: "PUT",
                    body: JSON.stringify(cleanPayload)
                }, accessToken);


                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    console.error('[SpeciesEditor] Error al guardar:', {
                        status: res.status,
                        errorData: errorData
                    });
                    throw new Error(errorData.detail || errorData.message || `Error al guardar (${res.status})`);
                }

                const updatedSpecies = await res.json();
                const mergeUpdatedSpecies = (sp) => (
                    sp.id === updatedSpecies.id ? { ...sp, ...updatedSpecies } : sp
                );
                setSelectedSpecies(current => (
                    current?.id === updatedSpecies.id ? { ...current, ...updatedSpecies } : current
                ));
                setSpecies(current => current.map(mergeUpdatedSpecies));
                setAllSpeciesList(current => current
                    .map(mergeUpdatedSpecies)
                    .sort((a, b) => (a.scientific_name || "").toLowerCase().localeCompare((b.scientific_name || "").toLowerCase()))
                );
                invalidateSpeciesDependentQueries(selectedSpecies.id);
                setSuccess("Cambios guardados correctamente");
                fetchSpecies();
            } else if (editorMode === "sectors" && selectedSector) {
                // Preparar payload: convertir strings vacíos a null para qr_code
                const payload = { ...sectorFormData };
                if (payload.qr_code === "") {
                    payload.qr_code = null;
                }

                // Guardar información del sector
                const res = await apiRequest(`${API}/sectors/staff/${selectedSector.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }, accessToken);

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Error al guardar");
                }

                // Guardar especies asociadas al sector en la tabla sectores_especies
                // Siempre intentar guardar, incluso si antes falló (por si el backend ya se actualizó)
                let speciesSaved = false;
                try {
                    const speciesRes = await apiRequest(`${API}/sectors/staff/${selectedSector.id}/species`, {
                        method: "PUT",
                        body: JSON.stringify({ especie_ids: sectorSpeciesIds })
                    }, accessToken);

                    if (!speciesRes.ok) {
                        // Si es 405, el backend aún no tiene la ruta desplegada
                        if (speciesRes.status === 405) {
                            setSpeciesEndpointAvailable(false);
                            // No es crítico, el sector se guardó correctamente
                            // Las especies NO se guardaron en Supabase, pero mantenemos las selecciones localmente
                        } else {
                            // Otros errores son críticos
                            const errorData = await speciesRes.json().catch(() => ({}));
                            throw new Error(errorData.detail || "Error al guardar especies del sector");
                        }
                    } else {
                        // Si funciona, marcar como disponible y confirmar guardado
                        setSpeciesEndpointAvailable(true);
                        speciesSaved = true;
                        // Verificar que se guardaron correctamente
                        const savedSpecies = await speciesRes.json().catch(() => []);
                    }
                } catch (speciesErr) {
                    // Si es un 405, no es crítico - el sector se guardó correctamente
                    if (speciesErr.message && speciesErr.message.includes('405')) {
                        setSpeciesEndpointAvailable(false);
                        // No lanzar error, solo marcar que el endpoint no está disponible
                        // Mantener las selecciones localmente
                    } else {
                        // Otros errores sí son críticos
                        throw speciesErr;
                    }
                }

                // Mensaje de éxito según si se guardaron las especies
                if (speciesSaved) {
                    setSuccess("Cambios guardados correctamente. Especies asociadas al sector guardadas en Supabase.");
                } else if (!speciesSaved && speciesEndpointAvailable === false) {
                    // El sector se guardó, pero las especies NO se guardaron en BD
                    setSuccess("Información del sector guardada. Las especies seleccionadas se mantendrán localmente hasta que el backend esté actualizado.");
                } else {
                    setSuccess("Cambios guardados correctamente");
                }

                // Solo recargar especies desde el backend si el endpoint está disponible
                // Si no está disponible, mantener las selecciones actuales (no limpiar)
                if (speciesEndpointAvailable === true) {
                    fetchSectorSpecies(selectedSector.id);
                }
                // Si no está disponible, NO llamar fetchSectorSpecies para mantener las selecciones

                fetchSectors();
            }

            // Limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Error al guardar");
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

    const sidebarResizeHandle = (
        <div
            className={`editor-sidebar-resize-handle${isResizingSidebar ? " is-resizing" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar ancho del panel"
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            title="Arrastrar para ajustar ancho"
            onPointerDown={handleSidebarResizeStart}
            onKeyDown={handleSidebarResizeKeyDown}
        />
    );

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
                
                /* Scrollbar personalizado para lista de especies */
                .species-selector::-webkit-scrollbar {
                    width: 8px;
                }
                .species-selector::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .species-selector::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .species-selector::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                /* Estilos para los checkboxes de especies */
                .species-checkbox-item {
                    transition: all 0.2s ease;
                }
                .species-checkbox-item:hover {
                    transform: translateX(4px);
                }
                .species-checkbox-item input[type="checkbox"]:checked + div {
                    color: #059669;
                }
                
                .editor-layout {
                    --editor-sidebar-width: 480px;
                    --editor-header-height: 76px;
                    --species-card-media-size: clamp(96px, calc((var(--editor-sidebar-width) - 86px) / 3), 148px);
                    min-height: 100dvh;
                    position: relative;
                }

                .editor-sidebar {
                    position: fixed !important;
                    top: var(--editor-header-height) !important;
                    left: 0 !important;
                    bottom: 0 !important;
                    width: var(--editor-sidebar-width) !important;
                    max-height: none !important;
                    min-height: auto !important;
                    border-radius: 0 !important;
                    border-right: 1px solid #e5e7eb !important;
                    z-index: 8;
                    transition: border-color 0.15s ease;
                }

                .editor-sidebar:hover,
                .editor-sidebar-resizing,
                .editor-sidebar:has(.editor-sidebar-resize-handle:focus-visible) {
                    border-right-color: #3b82f6 !important;
                }

                .editor-sidebar-resize-handle {
                    position: fixed;
                    top: var(--editor-header-height);
                    bottom: 0;
                    left: calc(var(--editor-sidebar-width) + 17px);
                    width: 38px;
                    transform: translateX(-50%);
                    cursor: col-resize;
                    z-index: 20;
                    touch-action: none;
                    background: transparent;
                }

                .editor-sidebar-resize-handle::after {
                    display: none;
                }

                .editor-sidebar-resize-handle:focus-visible {
                    outline: 3px solid #93c5fd;
                    outline-offset: -3px;
                }

                .editor-main {
                    margin-left: var(--editor-sidebar-width);
                    min-height: calc(100dvh - var(--editor-header-height));
                    padding: clamp(16px, 4vw, 32px) clamp(16px, 4vw, 40px);
                }

                .editor-main .editor-content {
                    max-width: 1120px;
                    margin: 0 auto;
                }

                .mobile-detail-back {
                    display: none;
                }

                .mobile-module-picker {
                    display: none;
                }

                .mobile-home-arrow {
                    display: none;
                }

                .species-list-item {
                    overflow: hidden;
                }

                .species-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
                    gap: 8px;
                    align-items: start;
                }

                .species-list-item:focus-visible {
                    outline: 3px solid #93c5fd;
                    outline-offset: 2px;
                }

                .species-card-cover {
                    width: var(--species-card-media-size);
                    height: var(--species-card-media-size);
                    align-self: center;
                    object-fit: cover;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
                    background: #f3f4f6;
                    flex-shrink: 0;
                }

                .species-card-copy {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    text-align: center;
                }

                .species-card-scientific,
                .species-card-common {
                    overflow-wrap: anywhere;
                    word-break: normal;
                }

                .species-card-scientific {
                    color: #111827;
                    font-size: 13px;
                    font-style: italic;
                    font-weight: 700;
                    line-height: 1.25;
                }

                .species-card-common {
                    color: #4b5563;
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 1.35;
                }

                @media (max-width: 1024px) {
                    .editor-layout {
                        display: block !important;
                        padding: calc(var(--editor-header-height) + clamp(16px, 4vw, 32px)) clamp(12px, 3vw, 24px) clamp(16px, 4vw, 32px) !important;
                    }

                    .editor-sidebar {
                        position: static !important;
                        width: 100% !important;
                        max-height: 600px !important;
                        min-height: 500px !important;
                        border-radius: 12px !important;
                        border-right: none !important;
                        margin-bottom: 24px;
                    }

                    .editor-main {
                        margin-left: 0 !important;
                        min-height: auto !important;
                        padding: 0 !important;
                    }
                    
                    .species-list {
                        max-height: 600px !important;
                        min-height: 500px !important;
                        margin-bottom: 24px;
                    }
                    
                    .editor-content {
                        padding: 20px !important;
                    }

                    .species-card-cover {
                        width: var(--species-card-media-size);
                        height: var(--species-card-media-size);
                    }

                    .editor-layout {
                        --species-card-media-size: 132px;
                    }

                    .editor-sidebar-resize-handle {
                        display: none;
                    }
                }
                
                @media (max-width: 768px) {
                    .species-editor-shell.mobile-editor-view-modules header {
                        display: none !important;
                    }

                    .species-editor-shell.mobile-editor-view-modules .editor-layout {
                        min-height: 100dvh;
                        padding: max(24px, env(safe-area-inset-top)) clamp(20px, 6vw, 32px) max(24px, env(safe-area-inset-bottom)) !important;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }

                    .mobile-module-picker {
                        width: min(100%, 420px);
                        display: none;
                        flex-direction: column;
                        align-items: stretch;
                        gap: 16px;
                    }

                    .mobile-editor-view-modules .mobile-module-picker {
                        display: flex !important;
                    }

                    .mobile-home-arrow {
                        position: fixed;
                        top: max(16px, env(safe-area-inset-top));
                        left: max(16px, env(safe-area-inset-left));
                        z-index: 35;
                        width: 46px;
                        height: 46px;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid #d1d5db;
                        border-radius: 999px;
                        background: white;
                        color: #111827;
                        text-decoration: none;
                        font-size: 22px;
                        font-weight: 800;
                        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
                    }

                    .mobile-editor-view-modules .mobile-home-arrow {
                        display: inline-flex !important;
                    }

                    .mobile-home-arrow:focus-visible {
                        outline: 3px solid #93c5fd;
                        outline-offset: 3px;
                    }

                    .mobile-module-question {
                        margin: 0;
                        color: #111827;
                        font-size: 24px;
                        line-height: 1.2;
                        font-weight: 800;
                        text-align: center;
                    }

                    .mobile-module-actions {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .mobile-module-button {
                        min-height: 64px;
                        width: 100%;
                        padding: 14px 18px;
                        border: 1px solid #d1d5db;
                        border-radius: 10px;
                        background: white;
                        color: #111827;
                        font-size: 17px;
                        font-weight: 800;
                        cursor: pointer;
                        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
                    }

                    .mobile-module-button:focus-visible {
                        outline: 3px solid #93c5fd;
                        outline-offset: 3px;
                    }

                    .editor-header-inner {
                        display: grid !important;
                        grid-template-columns: 46px minmax(0, 1fr);
                        align-items: center !important;
                        justify-content: stretch !important;
                        gap: 8px !important;
                        flex-wrap: nowrap !important;
                    }

                    .editor-header-title {
                        display: flex !important;
                        min-width: 0 !important;
                        flex: 0 0 46px !important;
                     }

                    .editor-header-copy {
                        display: none !important;
                    }

                    .editor-header-back {
                        width: 44px !important;
                        height: 44px !important;
                        padding: 0 !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 999px !important;
                        font-size: 20px !important;
                        font-weight: 800 !important;
                        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
                    }

                    .header-buttons {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        width: 100% !important;
                        gap: 8px !important;
                        flex-shrink: 1 !important;
                    }

                    .header-buttons button {
                        width: 100% !important;
                        min-height: 44px !important;
                        padding: 8px 12px !important;
                        font-size: 14px !important;
                        white-space: nowrap;
                    }

                    .mobile-editor-view-modules .editor-sidebar,
                    .mobile-editor-view-modules .editor-main,
                    .mobile-editor-view-list .editor-main,
                    .mobile-editor-view-detail .editor-sidebar {
                        display: none !important;
                    }

                    .mobile-editor-view-list .editor-sidebar {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        min-height: auto !important;
                        max-height: none !important;
                        margin-bottom: 0 !important;
                        overflow: visible !important;
                    }

                    .mobile-editor-view-detail .editor-main {
                        display: block !important;
                        margin-left: 0 !important;
                        min-height: auto !important;
                        padding: 0 !important;
                    }

                    .mobile-detail-back {
                        display: inline-flex !important;
                        align-items: center;
                        justify-content: center;
                        min-height: 44px;
                        padding: 10px 14px;
                        margin-bottom: 16px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        background: white;
                        color: #374151;
                        font-size: 14px;
                        font-weight: 700;
                        cursor: pointer;
                    }

                    .sidebar-collapse-control {
                        display: none !important;
                    }

                    .editor-sidebar,
                    .species-list {
                        min-height: auto !important;
                        max-height: none !important;
                    }

                    .grid-2-cols {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .editor-content {
                        padding: 16px !important;
                    }

                    .species-list {
                        max-height: 500px !important;
                        min-height: 400px !important;
                    }

                    .mobile-editor-view-list .editor-sidebar,
                    .mobile-editor-view-list .species-list {
                        max-height: none !important;
                        min-height: auto !important;
                    }

                    .species-selector {
                        max-height: 250px !important;
                    }

                    .species-card-cover {
                        width: var(--species-card-media-size);
                        height: var(--species-card-media-size);
                    }

                    .editor-layout {
                        --species-card-media-size: 124px;
                    }

                }
                
                @media (max-width: 480px) {
                    .species-list-item {
                        padding: 10px !important;
                        font-size: 13px !important;
                    }

                    .species-card-cover {
                        width: var(--species-card-media-size);
                        height: var(--species-card-media-size);
                    }

                    .editor-layout {
                        --species-card-media-size: 112px;
                    }
                    
                    .editor-content {
                        padding: 12px !important;
                    }

                    .species-list {
                        max-height: 400px !important;
                        min-height: 350px !important;
                    }

                    .species-selector {
                        max-height: 200px !important;
                    }

                    .species-checkbox-item {
                        padding: 10px 8px !important;
                    }

                    .header-buttons {
                        flex-direction: column !important;
                        width: 100% !important;
                    }

                    .header-buttons button {
                        width: 100% !important;
                    }
                }
            `}</style>

            <div className={`species-editor-shell mobile-editor-view-${mobileEditorView}`} style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
                <header ref={editorHeaderRef} style={{
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px clamp(12px, 4vw, 24px)",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    <div className="editor-header-inner" style={{
                        maxWidth: "1400px", margin: "0 auto",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: "clamp(8px, 2vw, 16px)",
                        flexWrap: "wrap"
                    }}>
                        <div className="editor-header-title" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "clamp(8px, 2vw, 12px)",
                            flex: 1,
                            minWidth: "200px"
                        }}>
                            <Link href="/staff" className="editor-header-back" style={{
                                padding: "8px", borderRadius: "6px",
                                border: "1px solid #e5e7eb", backgroundColor: "white",
                                color: "#374151", textDecoration: "none",
                                fontSize: "14px", transition: "all 0.2s", flexShrink: 0
                            }}>
                                ←
                            </Link>
                            <div className="editor-header-copy" style={{ minWidth: 0 }}>
                                <h1 style={{
                                    fontSize: "clamp(16px, 4vw, 20px)",
                                    fontWeight: "700", color: "#111827", margin: 0
                                }}>
                                    Editor de la información
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
                                    color: "#6b7280", margin: 0
                                }}>
                                    Edita información para la App de Escaneo QR
                                </p>
                            </div>
                        </div>
                        <div className="header-buttons" style={{
                            display: "flex",
                            gap: "8px",
                            flexShrink: 0,
                            flexWrap: "wrap"
                        }}>
                            <button
                                onClick={() => handleModeChange("species")}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: editorMode === "species" ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                                    backgroundColor: editorMode === "species" ? "#eff6ff" : "white",
                                    color: editorMode === "species" ? "#1e40af" : "#374151",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: editorMode === "species" ? "0 2px 4px rgba(59, 130, 246, 0.15)" : "none"
                                }}
                                onMouseEnter={(e) => {
                                    if (editorMode !== "species") {
                                        e.target.style.backgroundColor = "#f9fafb";
                                        e.target.style.borderColor = "#d1d5db";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editorMode !== "species") {
                                        e.target.style.backgroundColor = "white";
                                        e.target.style.borderColor = "#e5e7eb";
                                    }
                                }}
                            >
                                🌵 Especies
                            </button>
                            <button
                                onClick={() => handleModeChange("sectors")}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: editorMode === "sectors" ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                                    backgroundColor: editorMode === "sectors" ? "#eff6ff" : "white",
                                    color: editorMode === "sectors" ? "#1e40af" : "#374151",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: editorMode === "sectors" ? "0 2px 4px rgba(59, 130, 246, 0.15)" : "none"
                                }}
                                onMouseEnter={(e) => {
                                    if (editorMode !== "sectors") {
                                        e.target.style.backgroundColor = "#f9fafb";
                                        e.target.style.borderColor = "#d1d5db";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editorMode !== "sectors") {
                                        e.target.style.backgroundColor = "white";
                                        e.target.style.borderColor = "#e5e7eb";
                                    }
                                }}
                            >
                                📍 Sectores
                            </button>
                        </div>
                    </div>
                </header>

                <Link href="/staff" className="mobile-home-arrow" aria-label="Volver al home">
                    ←
                </Link>

                <div className={`editor-layout mobile-editor-view-${mobileEditorView}`} style={{
                    "--editor-sidebar-width": sidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${sidebarWidth}px`,
                    "--editor-header-height": `${editorHeaderHeight}px`,
                    maxWidth: "none",
                    margin: 0,
                    paddingTop: `${editorHeaderHeight}px`,
                    display: "block"
                }}>
                    <section className="mobile-module-picker" aria-label="Elegir submódulo para editar">
                        <h2 className="mobile-module-question">¿Qué quieres editar?</h2>
                        <div className="mobile-module-actions">
                            <button
                                type="button"
                                className="mobile-module-button"
                                onClick={() => handleModeChange("species")}
                            >
                                🌵 Especies
                            </button>
                            <button
                                type="button"
                                className="mobile-module-button"
                                onClick={() => handleModeChange("sectors")}
                            >
                                📍 Sectores
                            </button>
                        </div>
                    </section>

                    {/* Lista de especies o sectores */}
                    {sidebarCollapsed ? (
                        <div className="editor-sidebar" style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "16px 8px",
                            gap: "16px",
                            overflow: "hidden",
                            position: "sticky",
                            top: "80px",
                            alignSelf: "start",
                            minHeight: "120px"
                        }}>
                            <button
                                onClick={() => setSidebarCollapsed(false)}
                                title="Expandir panel"
                                style={{
                                    width: "36px", height: "36px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    backgroundColor: "#f9fafb",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    flexShrink: 0,
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
                            >
                                ▶
                            </button>
                            <div style={{
                                writingMode: "vertical-rl",
                                transform: "rotate(180deg)",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#9ca3af",
                                userSelect: "none",
                                letterSpacing: "0.5px",
                                whiteSpace: "nowrap"
                            }}>
                                {editorMode === "species" ? "🌵 Especies" : "📍 Sectores"}
                            </div>
                        </div>
                    ) : editorMode === "species" ? (
                        <div ref={speciesSidebarRef} className={`editor-sidebar species-list${isResizingSidebar ? " editor-sidebar-resizing" : ""}`} style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            padding: "clamp(12px, 2vw, 16px)",
                            maxHeight: "calc(100vh - 150px)",
                            overflowY: "auto"
                        }}>
                            {sidebarResizeHandle}
                            <div className="sidebar-collapse-control" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                                <button
                                    onClick={() => setSidebarCollapsed(true)}
                                    title="Ocultar panel"
                                    style={{
                                        padding: "4px 10px",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        backgroundColor: "#f9fafb",
                                        color: "#6b7280",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                                >
                                    ◀ Ocultar
                                </button>
                            </div>
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

                            {/* Controles de ordenamiento y filtros */}
                            <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                {/* Ordenamiento */}
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#374151", minWidth: "80px" }}>
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

                                {/* Búsqueda general */}
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre científico o nombre común..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        outline: "none"
                                    }}
                                />

                                {/* Filtro por morfología */}
                                <select
                                    value={filterMorfologia}
                                    onChange={(e) => setFilterMorfologia(e.target.value)}
                                    style={{
                                        width: "100%",
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

                                {/* Filtro por categoría de conservación */}
                                <select
                                    value={filterCategoria}
                                    onChange={(e) => setFilterCategoria(e.target.value)}
                                    style={{
                                        width: "100%",
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
                                            cursor: "pointer"
                                        }}
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>

                            <div className="species-card-grid">
                                {filteredSpecies.length === 0 ? (
                                    <div style={{
                                        padding: "32px 16px",
                                        textAlign: "center",
                                        color: "#9ca3af",
                                        gridColumn: "1 / -1"
                                    }}>
                                        No hay especies que coincidan con la búsqueda
                                    </div>
                                ) : (
                                    paginatedEditorSpecies.map((sp) => (
                                        <button
                                            key={sp.id}
                                            className="species-list-item"
                                            onClick={() => handleSelect(sp)}
                                            aria-label={`Editar ${sp.scientific_name || sp.nombre_común || "especie"}`}
                                            style={{
                                                padding: "10px",
                                                border: selectedSpecies?.id === sp.id
                                                    ? "2px solid #ec4899"
                                                    : "1px solid #e5e7eb",
                                                borderRadius: "10px",
                                                backgroundColor: selectedSpecies?.id === sp.id
                                                    ? "#fdf2f8"
                                                    : "white",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                width: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "10px"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedSpecies?.id !== sp.id) {
                                                    e.currentTarget.style.backgroundColor = "#f9fafb";
                                                    e.currentTarget.style.borderColor = "#d1d5db";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedSpecies?.id !== sp.id) {
                                                    e.currentTarget.style.backgroundColor = "white";
                                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                                }
                                            }}
                                        >
                                            {(sp.cover_photo || sp.image_url) ? (
                                                <AuthenticatedImage
                                                    className="species-card-cover"
                                                    src={resolvePhotoUrl(sp.cover_photo || sp.image_url, { variant: "w=800" })}
                                                    fallbackSrc={resolvePhotoUrl(sp.cover_photo || sp.image_url)}
                                                    alt={sp.scientific_name || sp.nombre_común || "Portada de especie"}
                                                    loading="lazy"
                                                    style={{
                                                        width: "var(--species-card-media-size)",
                                                        height: "var(--species-card-media-size)",
                                                        alignSelf: "center",
                                                        objectFit: "cover",
                                                        borderRadius: "8px",
                                                        border: "1px solid #e5e7eb",
                                                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
                                                        backgroundColor: "#f3f4f6",
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="species-card-cover"
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        alignSelf: "center",
                                                        color: "#9ca3af",
                                                        fontSize: "28px"
                                                    }}
                                                >
                                                    🌵
                                                </div>
                                            )}
                                            <div className="species-card-copy">
                                                <div className="species-card-scientific">
                                                    {sp.scientific_name || "Sin nombre científico"}
                                                </div>
                                                <div
                                                    className="species-card-common"
                                                    style={!sp.nombre_común && !sp.nombres_comunes ? {
                                                        fontStyle: "italic",
                                                        color: "#9ca3af",
                                                        fontWeight: "500"
                                                    } : undefined}
                                                >
                                                    {sp.nombre_común || sp.nombres_comunes || "Sin nombre común"}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            {filteredSpecies.length > 0 && (
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                    marginTop: "14px",
                                    paddingTop: "14px",
                                    borderTop: "1px solid #e5e7eb"
                                }}>
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        fontWeight: "600"
                                    }}>
                                        Mostrando {firstVisibleEditorSpecies}-{lastVisibleEditorSpecies} de {filteredSpecies.length}
                                    </div>
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr auto 1fr",
                                        gap: "8px",
                                        alignItems: "center"
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => handleEditorSpeciesPageChange(normalizedEditorSpeciesPage - 1)}
                                            disabled={normalizedEditorSpeciesPage === 1}
                                            style={{
                                                padding: "8px 10px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                backgroundColor: normalizedEditorSpeciesPage === 1 ? "#f3f4f6" : "white",
                                                color: normalizedEditorSpeciesPage === 1 ? "#9ca3af" : "#374151",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: normalizedEditorSpeciesPage === 1 ? "not-allowed" : "pointer"
                                            }}
                                        >
                                            Anterior
                                        </button>
                                        <select
                                            value={normalizedEditorSpeciesPage}
                                            onChange={(event) => handleEditorSpeciesPageChange(event.target.value)}
                                            style={{
                                                padding: "8px 10px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                backgroundColor: "white",
                                                color: "#111827",
                                                fontSize: "12px",
                                                fontWeight: "600"
                                            }}
                                        >
                                            {Array.from({ length: totalEditorSpeciesPages }, (_, index) => index + 1).map(page => (
                                                <option key={page} value={page}>
                                                    {page}/{totalEditorSpeciesPages}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => handleEditorSpeciesPageChange(normalizedEditorSpeciesPage + 1)}
                                            disabled={normalizedEditorSpeciesPage === totalEditorSpeciesPages}
                                            style={{
                                                padding: "8px 10px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                backgroundColor: normalizedEditorSpeciesPage === totalEditorSpeciesPages ? "#f3f4f6" : "white",
                                                color: normalizedEditorSpeciesPage === totalEditorSpeciesPages ? "#9ca3af" : "#374151",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: normalizedEditorSpeciesPage === totalEditorSpeciesPages ? "not-allowed" : "pointer"
                                            }}
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`editor-sidebar species-list${isResizingSidebar ? " editor-sidebar-resizing" : ""}`} style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            padding: "clamp(12px, 2vw, 16px)",
                            maxHeight: "calc(100vh - 100px)",
                            overflowY: "auto",
                            minHeight: "600px"
                        }}>
                            {sidebarResizeHandle}
                            <div className="sidebar-collapse-control" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                                <button
                                    onClick={() => setSidebarCollapsed(true)}
                                    title="Ocultar panel"
                                    style={{
                                        padding: "4px 10px",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        backgroundColor: "#f9fafb",
                                        color: "#6b7280",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                                >
                                    ◀ Ocultar
                                </button>
                            </div>
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
                                    Elige un sector para editar su información que aparecerá cuando se escanee el código QR.
                                </p>
                            </div>

                            {/* Búsqueda de sectores */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        placeholder="Buscar sector..."
                                        value={sectorSearchQuery}
                                        onChange={(e) => setSectorSearchQuery(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: "8px 10px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            outline: "none"
                                        }}
                                    />
                                    {/* Ordenamiento (mismo estilo que especies) */}
                                    <button
                                        onClick={() => setSectorSortOrder(sectorSortOrder === "asc" ? "desc" : "asc")}
                                        title="Orden alfabético"
                                        style={{
                                            padding: "6px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            backgroundColor: sectorSortOrder === "asc" ? "#ecfdf5" : "#fef3c7",
                                            color: sectorSortOrder === "asc" ? "#065f46" : "#92400e",
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            cursor: "pointer"
                                        }}
                                    >
                                        {sectorSortOrder === "asc" ? "A-Z ↑" : "Z-A ↓"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {filteredSectors.length === 0 ? (
                                    <div style={{
                                        padding: "32px 16px",
                                        textAlign: "center",
                                        color: "#9ca3af"
                                    }}>
                                        No hay sectores que coincidan con la búsqueda
                                    </div>
                                ) : (
                                    filteredSectors.map((sector) => (
                                        <button
                                            key={sector.id}
                                            className="species-list-item"
                                            onClick={() => handleSelectSector(sector)}
                                            style={{
                                                padding: "12px 16px",
                                                border: selectedSector?.id === sector.id
                                                    ? "2px solid #ec4899"
                                                    : "1px solid #e5e7eb",
                                                borderRadius: "8px",
                                                backgroundColor: selectedSector?.id === sector.id
                                                    ? "#fce7f3"
                                                    : "white",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                width: "100%"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedSector?.id !== sector.id) {
                                                    e.currentTarget.style.backgroundColor = "#f9fafb";
                                                    e.currentTarget.style.borderColor = "#d1d5db";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedSector?.id !== sector.id) {
                                                    e.currentTarget.style.backgroundColor = "white";
                                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                                }
                                            }}
                                        >
                                            <div style={{
                                                fontSize: "14px", fontWeight: "600",
                                                color: "#111827", marginBottom: "4px"
                                            }}>
                                                {sector.name}
                                            </div>
                                            {sector.qr_code && (
                                                <div style={{
                                                    fontSize: "11px",
                                                    color: "#9ca3af",
                                                    fontFamily: "monospace",
                                                    marginTop: "4px"
                                                }}>
                                                    QR: {sector.qr_code}
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Editor */}
                    {(editorMode === "species" ? selectedSpecies : selectedSector) && (
                        <main className="editor-main">
                            <div className="editor-content" style={{
                                backgroundColor: "transparent",
                                borderRadius: 0,
                                boxShadow: "none",
                                padding: 0
                            }}>
                                <button
                                    type="button"
                                    className="mobile-detail-back"
                                    onClick={handleMobileDetailBack}
                                >
                                    {editorMode === "species" ? "Volver a especies" : "Volver a sectores"}
                                </button>
                        {editorMode === "species" ? (
                            !selectedSpecies ? (
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

                                    {success && (
                                        <div style={{
                                            padding: "12px", backgroundColor: "#ecfdf5",
                                            border: "1px solid #a7f3d0", borderRadius: "6px",
                                            color: "#065f46", fontSize: "14px", marginBottom: "16px"
                                        }}>
                                            ✅ {success}
                                        </div>
                                    )}

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
                                            {/* Imagen de Portada y Galería */}
                                            <div>
                                                <label style={{
                                                    display: "block", fontSize: "12px",
                                                    fontWeight: "500", color: "#111827", marginBottom: "6px"
                                                }}>
                                                    Imagen de Portada
                                                </label>
                                                {(selectedSpecies?.cover_photo || selectedSpecies?.image_url) ? (
                                                    <AuthenticatedImage
                                                        src={resolvePhotoUrl(selectedSpecies.cover_photo || selectedSpecies.image_url, { variant: "w=800" })}
                                                        fallbackSrc={resolvePhotoUrl(selectedSpecies.cover_photo || selectedSpecies.image_url)}
                                                        alt={selectedSpecies.scientific_name || "Portada"}
                                                        style={{
                                                            width: "100%",
                                                            maxHeight: "clamp(220px, 30vh, 420px)",
                                                            borderRadius: "10px",
                                                            objectFit: "cover",
                                                            border: "1px solid #e5e7eb",
                                                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                                            marginBottom: "12px",
                                                            display: "block"
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        height: "clamp(160px, 22vh, 260px)",
                                                        backgroundColor: "#f3f4f6",
                                                        border: "1px dashed #d1d5db",
                                                        borderRadius: "10px",
                                                        color: "#9ca3af",
                                                        fontSize: "14px",
                                                        marginBottom: "12px"
                                                    }}>
                                                        Sin portada disponible
                                                    </div>
                                                )}

                                                {/* Galería de Fotos */}
                                                <div style={{ marginTop: "12px" }}>
                                                    <label style={{
                                                        display: "block", fontSize: "12px",
                                                        fontWeight: "500", color: "#111827", marginBottom: "6px"
                                                    }}>
                                                        Galería de Fotos
                                                    </label>
                                                    <div style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                        overflowX: "auto",
                                                        paddingBottom: "4px",
                                                        scrollbarWidth: "thin"
                                                    }}>
                                                        {/* Fotos existentes */}
                                                        {loadingPhotos ? (
                                                            <div style={{
                                                                width: "clamp(100px, 12vw, 160px)",
                                                                height: "clamp(100px, 12vw, 160px)",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                backgroundColor: "#f3f4f6",
                                                                borderRadius: "8px",
                                                                border: "1px solid #e5e7eb",
                                                                color: "#9ca3af",
                                                                fontSize: "13px",
                                                                flexShrink: 0
                                                            }}>
                                                                Cargando...
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {speciesPhotos
                                                                    .filter(photo => !photo.is_cover)
                                                                    .map((photo) => (
                                                                        <div
                                                                            key={photo.id}
                                                                            style={{
                                                                                width: "clamp(100px, 12vw, 160px)",
                                                                                height: "clamp(100px, 12vw, 160px)",
                                                                                flexShrink: 0,
                                                                                position: "relative",
                                                                                borderRadius: "10px",
                                                                                overflow: "hidden",
                                                                                border: "1px solid #e5e7eb",
                                                                                boxShadow: "0 1px 3px rgba(0,0,0,0.07)"
                                                                            }}
                                                                        >
                                                                            <AuthenticatedImage
                                                                                src={resolvePhotoUrl(photo, { variant: "w=400" })}
                                                                                fallbackSrc={resolvePhotoUrl(photo)}
                                                                                alt={`Foto ${photo.id}`}
                                                                                style={{
                                                                                    width: "100%",
                                                                                    height: "100%",
                                                                                    objectFit: "cover"
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}

                                                                {/* Botón para subir más fotos */}
                                                                <div
                                                                    onClick={() => {
                                                                        if (fileInputRef.current) {
                                                                            fileInputRef.current.click();
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        width: "clamp(100px, 12vw, 160px)",
                                                                        height: "clamp(100px, 12vw, 160px)",
                                                                        flexShrink: 0,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        backgroundColor: "#f9fafb",
                                                                        border: "2px dashed #d1d5db",
                                                                        borderRadius: "10px",
                                                                        cursor: "pointer",
                                                                        transition: "all 0.2s",
                                                                        color: "#6b7280",
                                                                        fontSize: "36px",
                                                                        fontWeight: "300"
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                                                        e.currentTarget.style.borderColor = "#9ca3af";
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                                                        e.currentTarget.style.borderColor = "#d1d5db";
                                                                    }}
                                                                >
                                                                    +
                                                                </div>
                                                                {/* Input file oculto */}
                                                                <input
                                                                    ref={fileInputRef}
                                                                    type="file"
                                                                    multiple
                                                                    accept="image/*"
                                                                    style={{ display: "none" }}
                                                                    onChange={async (e) => {
                                                                        if (e.target.files && e.target.files.length > 0) {
                                                                            setShowPhotoUploader(true);
                                                                            // Los archivos se manejarán en el PhotoUploader
                                                                        }
                                                                    }}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Información Básica */}
                                            <div style={{
                                                padding: "16px", backgroundColor: "#f9fafb",
                                                borderRadius: "10px", border: "1px solid #e5e7eb"
                                            }}>
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: "700",
                                                    color: "#111827", margin: "0 0 12px 0"
                                                }}>
                                                    Información Básica
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Nombre Científico *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.scientific_name}
                                                            onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                                                            placeholder="Ej: Echinopsis chiloensis"
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px",
                                                                fontStyle: "italic"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Nombre Común
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.nombre_común}
                                                            onChange={(e) => setFormData({ ...formData, nombre_común: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Estado de Conservación (Descripción Libre)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.estado_conservación}
                                                            onChange={(e) => setFormData({ ...formData, estado_conservación: e.target.value })}
                                                            placeholder="Ej: Endémica de Chile central"
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Categoría de Conservación
                                                        </label>
                                                        <select
                                                            value={formData.categoria_conservacion || ""}
                                                            onChange={(e) => setFormData({ ...formData, categoria_conservacion: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                            }}
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            <option value="No amenazado">No amenazado</option>
                                                            <option value="Preocupación menor">Preocupación menor</option>
                                                            <option value="Protegido">Protegido</option>
                                                            <option value="En peligro de extinción">En peligro de extinción</option>
                                                            {/* Mostrar valor de BD si no está en las opciones estándar */}
                                                            {formData.categoria_conservacion &&
                                                                !["No amenazado", "Preocupación menor", "Protegido", "En peligro de extinción", ""].includes(formData.categoria_conservacion) && (
                                                                    <option value={formData.categoria_conservacion}>{formData.categoria_conservacion}</option>
                                                                )}
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
                                                borderRadius: "10px", border: "1px solid #e5e7eb"
                                            }}>
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: "700",
                                                    color: "#111827", margin: "0 0 12px 0"
                                                }}>
                                                    Descripciones
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Hábitat
                                                        </label>
                                                        <textarea
                                                            value={formData.habitat}
                                                            onChange={(e) => setFormData({ ...formData, habitat: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Cuidado y Recomendaciones
                                                        </label>
                                                        <textarea
                                                            value={formData.cuidado}
                                                            onChange={(e) => setFormData({ ...formData, cuidado: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Usos
                                                        </label>
                                                        <textarea
                                                            value={formData.usos}
                                                            onChange={(e) => setFormData({ ...formData, usos: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Información Taxonómica */}
                                            <div style={{
                                                padding: "16px", backgroundColor: "#f9fafb",
                                                borderRadius: "10px", border: "1px solid #e5e7eb"
                                            }}>
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: "700",
                                                    color: "#111827", margin: "0 0 12px 0"
                                                }}>
                                                    Información Taxonómica
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Nombres Comunes (separados por comas)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.nombres_comunes}
                                                            onChange={(e) => setFormData({ ...formData, nombres_comunes: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                        <div>
                                                            <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                                Tipo de Planta
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.tipo_planta}
                                                                onChange={(e) => setFormData({ ...formData, tipo_planta: e.target.value })}
                                                                style={{
                                                                    width: "100%", padding: "8px 12px",
                                                                    border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                                Tipo de Morfología
                                                            </label>
                                                            <select
                                                                value={formData.tipo_morfología || ""}
                                                                onChange={(e) => setFormData({ ...formData, tipo_morfología: e.target.value || null })}
                                                                style={{
                                                                    width: "100%", padding: "8px 12px",
                                                                    border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px",
                                                                    backgroundColor: "white"
                                                                }}
                                                            >
                                                                <option value="">Seleccionar...</option>
                                                                <option value="Columnar">Columnar</option>
                                                                <option value="Redondo">Redondo</option>
                                                                <option value="Agave">Agave</option>
                                                                <option value="Tallo plano">Tallo plano</option>
                                                                <option value="Otro">Otro</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Distribución
                                                        </label>
                                                        <textarea
                                                            value={formData.distribución}
                                                            onChange={(e) => setFormData({ ...formData, distribución: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="grid-2-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                        <div>
                                                            <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                                Expectativa de Vida
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.expectativa_vida}
                                                                onChange={(e) => setFormData({ ...formData, expectativa_vida: e.target.value })}
                                                                style={{
                                                                    width: "100%", padding: "8px 12px",
                                                                    border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                                Floración
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={formData.floración}
                                                                onChange={(e) => setFormData({ ...formData, floración: e.target.value })}
                                                                style={{
                                                                    width: "100%", padding: "8px 12px",
                                                                    border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Historia y Leyendas */}
                                            <div style={{
                                                padding: "16px", backgroundColor: "#f9fafb",
                                                borderRadius: "10px", border: "1px solid #e5e7eb"
                                            }}>
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: "700",
                                                    color: "#111827", margin: "0 0 12px 0"
                                                }}>
                                                    Historia y Cultura
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Historia del Nombre
                                                        </label>
                                                        <textarea
                                                            value={formData.historia_nombre}
                                                            onChange={(e) => setFormData({ ...formData, historia_nombre: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Historia y Leyendas
                                                        </label>
                                                        <textarea
                                                            value={formData.historia_y_leyendas}
                                                            onChange={(e) => setFormData({ ...formData, historia_y_leyendas: e.target.value })}
                                                            rows={3}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Botones */}
                                            <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    style={{
                                                        flex: 1, padding: "12px 20px",
                                                        backgroundColor: "#10b981", color: "white",
                                                        border: "none", borderRadius: "8px",
                                                        fontSize: "14px", fontWeight: "600",
                                                        cursor: submitting ? "not-allowed" : "pointer",
                                                        opacity: submitting ? 0.6 : 1,
                                                        minWidth: "200px"
                                                    }}
                                                >
                                                    {submitting ? "Guardando..." : "💾 Guardar Cambios"}
                                                </button>
                                            </div>

                                            {/* PhotoUploader */}
                                            {showPhotoUploader && selectedSpecies && (
                                                <div style={{ marginTop: "16px" }}>
                                                    <PhotoUploader
                                                        entityType="especie"
                                                        entityId={selectedSpecies.id}
                                                        onUploadComplete={() => {
                                                            setSuccess("Fotos subidas exitosamente");
                                                            fetchSpecies();
                                                            fetchSpeciesPhotos(selectedSpecies.id);
                                                            setTimeout(() => {
                                                                setSuccess("");
                                                                setShowPhotoUploader(false);
                                                            }, 3000);
                                                        }}
                                                        maxPhotos={20}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                </>
                            )
                        ) : (
                            !selectedSector ? (
                                <div style={{
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center",
                                    padding: "60px 20px", textAlign: "center"
                                }}>
                                    <div style={{ fontSize: "64px", marginBottom: "16px" }}>📍</div>
                                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>
                                        Selecciona un sector
                                    </h3>
                                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                                        Elige un sector de la lista para comenzar a editar su información que se mostrará en la app móvil.
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
                                                color: "#111827", margin: "0 0 4px 0"
                                            }}>
                                                {selectedSector.name}
                                            </h2>
                                        </div>
                                        <span style={{
                                            padding: "4px 12px", borderRadius: "12px",
                                            fontSize: "12px", fontWeight: "600",
                                            backgroundColor: "#eff6ff", color: "#1e40af"
                                        }}>
                                            CONTENIDO APP QR
                                        </span>
                                    </div>

                                    {success && (
                                        <div style={{
                                            padding: "12px", backgroundColor: "#ecfdf5",
                                            border: "1px solid #a7f3d0", borderRadius: "6px",
                                            color: "#065f46", fontSize: "14px", marginBottom: "16px"
                                        }}>
                                            ✅ {success}
                                        </div>
                                    )}

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
                                            {/* Información Básica del Sector */}
                                            <div style={{
                                                padding: "16px", backgroundColor: "#f9fafb",
                                                borderRadius: "10px", border: "1px solid #e5e7eb"
                                            }}>
                                                <h3 style={{
                                                    fontSize: "14px", fontWeight: "700",
                                                    color: "#111827", margin: "0 0 12px 0"
                                                }}>
                                                    Información Básica
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Nombre del Sector *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={sectorFormData.name}
                                                            onChange={(e) => setSectorFormData({ ...sectorFormData, name: e.target.value })}
                                                            required
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Descripción
                                                        </label>
                                                        <textarea
                                                            value={sectorFormData.description}
                                                            onChange={(e) => setSectorFormData({ ...sectorFormData, description: e.target.value })}
                                                            rows={4}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "inherit", resize: "vertical"
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "5px", display: "block" }}>
                                                            Código QR
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={sectorFormData.qr_code}
                                                            onChange={(e) => setSectorFormData({ ...sectorFormData, qr_code: e.target.value })}
                                                            style={{
                                                                width: "100%", padding: "8px 12px",
                                                                border: "1px solid #d1d5db", borderRadius: "6px",
                                                                fontSize: "14px", fontFamily: "monospace"
                                                            }}
                                                            placeholder="Código QR del sector"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selección de Especies */}
                                            <div style={{
                                                padding: "20px",
                                                backgroundColor: "white",
                                                borderRadius: "12px",
                                                border: "2px solid #e5e7eb"
                                            }}>
                                                <div style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "12px",
                                                    alignItems: "center",
                                                    marginBottom: "14px"
                                                }}>
                                                    <h3 style={{
                                                        fontSize: "16px",
                                                        fontWeight: "700",
                                                        color: "#111827",
                                                        margin: 0,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px"
                                                    }}>
                                                        <span>🌵</span>
                                                        Especies en este Sector
                                                    </h3>
                                                    <div style={{
                                                        marginLeft: "auto",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        flexWrap: "wrap"
                                                    }}>
                                                        <span style={{
                                                            fontSize: "13px",
                                                            fontWeight: "600",
                                                            color: "#6b7280"
                                                        }}>
                                                            {sectorSpeciesIds.length} seleccionada{sectorSpeciesIds.length !== 1 ? "s" : ""}
                                                        </span>
                                                        <button type="button" onClick={() => setSectorSpeciesIds(allSpeciesList.map(s => s.id))} style={{
                                                            padding: "6px 10px",
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            border: "1px solid #d1d5db",
                                                            borderRadius: "8px",
                                                            background: "#f9fafb",
                                                            color: "#111827",
                                                            cursor: "pointer"
                                                        }}>Seleccionar todo</button>
                                                        <button type="button" onClick={() => setSectorSpeciesIds([])} style={{
                                                            padding: "6px 10px",
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            border: "1px solid #d1d5db",
                                                            borderRadius: "8px",
                                                            background: "#fff",
                                                            color: "#374151",
                                                            cursor: "pointer"
                                                        }}>Limpiar</button>
                                                        <div style={{
                                                            position: "relative",
                                                            minWidth: "220px",
                                                            flex: "1 1 220px"
                                                        }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar por nombre..."
                                                                value={sectorSpeciesQuery}
                                                                onChange={(e) => setSectorSpeciesQuery(e.target.value)}
                                                                style={{
                                                                    width: "100%",
                                                                    padding: "8px 10px",
                                                                    border: "1px solid #d1d5db",
                                                                    borderRadius: "8px",
                                                                    fontSize: "13px"
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {loadingSectorSpecies ? (
                                                    <div style={{ padding: "40px", textAlign: "center" }}>
                                                        <div style={{
                                                            width: "32px",
                                                            height: "32px",
                                                            border: "3px solid #e5e7eb",
                                                            borderTop: "3px solid #10b981",
                                                            borderRadius: "50%",
                                                            animation: "spin 0.8s linear infinite",
                                                            margin: "0 auto 12px"
                                                        }} />
                                                        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Cargando especies...</p>
                                                    </div>
                                                ) : allSpeciesList.length === 0 ? (
                                                    <div style={{
                                                        padding: "40px",
                                                        textAlign: "center",
                                                        backgroundColor: "#f9fafb",
                                                        borderRadius: "8px",
                                                        border: "1px dashed #d1d5db"
                                                    }}>
                                                        <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>🌵</span>
                                                        <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>No hay especies disponibles</p>
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const normalizedQuery = (sectorSpeciesQuery || "").trim().toLowerCase();
                                                        const visibleSpecies = normalizedQuery
                                                            ? allSpeciesList.filter((s) =>
                                                                (s.scientific_name || "").toLowerCase().includes(normalizedQuery) ||
                                                                (s.nombre_común || "").toLowerCase().includes(normalizedQuery)
                                                            )
                                                            : allSpeciesList;
                                                        return (
                                                            <div style={{
                                                                maxHeight: "420px",
                                                                overflowY: "auto",
                                                                paddingRight: "4px"
                                                            }}>
                                                                <div style={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                                                    gap: "10px"
                                                                }}>
                                                                    {visibleSpecies.map((specie) => {
                                                                        const isChecked = sectorSpeciesIds.includes(specie.id);
                                                                        return (
                                                                            <label key={specie.id} style={{
                                                                                display: "grid",
                                                                                gridTemplateColumns: "18px 72px minmax(0, 1fr)",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                                padding: "12px",
                                                                                borderRadius: "10px",
                                                                                border: isChecked ? "1.5px solid #10b981" : "1px solid #e5e7eb",
                                                                                background: isChecked ? "#f0fdf4" : "#fff",
                                                                                cursor: "pointer",
                                                                                transition: "border-color 120ms, background 120ms"
                                                                            }}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) {
                                                                                            setSectorSpeciesIds([...sectorSpeciesIds, specie.id]);
                                                                                        } else {
                                                                                            setSectorSpeciesIds(sectorSpeciesIds.filter(id => id !== specie.id));
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        width: "16px",
                                                                                        height: "16px",
                                                                                        accentColor: "#10b981",
                                                                                        marginTop: "2px"
                                                                                    }}
                                                                                />
                                                                                {(specie.cover_photo || specie.image_url) ? (
                                                                                    <AuthenticatedImage
                                                                                        src={resolvePhotoUrl(specie.cover_photo || specie.image_url, { variant: "w=400" })}
                                                                                        fallbackSrc={resolvePhotoUrl(specie.cover_photo || specie.image_url)}
                                                                                        alt={specie.scientific_name || "Portada de especie"}
                                                                                        style={{
                                                                                            width: "72px",
                                                                                            height: "72px",
                                                                                            objectFit: "cover",
                                                                                            borderRadius: "8px",
                                                                                            border: "1px solid #e5e7eb"
                                                                                        }}
                                                                                    />
                                                                                ) : (
                                                                                    <div style={{
                                                                                        width: "72px",
                                                                                        height: "72px",
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center",
                                                                                        textAlign: "center",
                                                                                        borderRadius: "8px",
                                                                                        backgroundColor: "#f3f4f6",
                                                                                        border: "1px dashed #d1d5db",
                                                                                        color: "#9ca3af",
                                                                                        fontSize: "11px"
                                                                                    }}>
                                                                                        Sin foto
                                                                                    </div>
                                                                                )}
                                                                                <div style={{ minWidth: 0 }}>
                                                                                    <div style={{
                                                                                        fontSize: "clamp(14px, 2vw, 17px)",
                                                                                        fontWeight: 700,
                                                                                        fontStyle: "italic",
                                                                                        color: isChecked ? "#065f46" : "#111827",
                                                                                        lineHeight: 1.25,
                                                                                        marginBottom: "4px",
                                                                                        overflowWrap: "anywhere"
                                                                                    }}>
                                                                                        {specie.scientific_name || "Sin nombre científico"}
                                                                                    </div>
                                                                                    {specie.nombre_común && (
                                                                                        <div style={{
                                                                                            fontSize: "clamp(12px, 1.8vw, 14px)",
                                                                                            color: isChecked ? "#047857" : "#6b7280",
                                                                                            fontWeight: 500,
                                                                                            lineHeight: 1.3,
                                                                                            overflowWrap: "anywhere"
                                                                                        }}>
                                                                                            {specie.nombre_común}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                )}
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
                            )
                        )}
                            </div>
                        </main>
                    )}
                </div>
            </div>
        </>
    );
}
