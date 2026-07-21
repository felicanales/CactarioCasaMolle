"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "../../utils/api-config";
import Modal from "../../components/inventory/InventoryModal";
import InventoryTable from "../../components/inventory/InventoryTable";
import AuthenticatedImage from "../../components/AuthenticatedImage";
import CollapsibleFilters from "../../components/CollapsibleFilters";
import { resolvePhotoUrl } from "../../utils/images";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEjemplaresList, useNurseryList } from "../../hooks/useEjemplares";
import { useSpeciesList } from "../../hooks/useSpecies";
import { useSectorsList } from "../../hooks/useSectors";
import { AUTH_BYPASS_ENABLED as BYPASS_AUTH } from "../../utils/auth-config";

const API = getApiUrl();

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const HEALTH_STATUS_OPTIONS = ["muy bien", "estable", "leve enfermo", "enfermo", "crítico"];

const createEmptyFormData = () => ({
    species_id: "",
    sector_id: "",
    purchase_date: "",
    sale_date: "",
    nursery: "",
    invoice_number: "",
    age_months: "",
    age_unit: "months",
    tamaño: "",
    health_status: "",
    location: "",
    purchase_price: "",
    sale_price: "",
    has_offshoots: 0,
    cantidad: 1
});

const createEmptyPurchaseItems = () => ([
    { id: 1, species_id: "", quantity: 1, price: "", lot_size: "", age_value: "", age_unit: "months", health_status: "" }
]);

export default function InventoryPage() {
    const { user, loading: authLoading, apiRequest: authApiRequest } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Funciones helper para formatear números con separadores de miles (1.000.000)
    const formatNumber = (value) => {
        if (!value && value !== 0) return "";
        // Remover puntos y comas existentes, luego formatear
        const numStr = String(value).replace(/\./g, "").replace(/,/g, "");
        const num = parseFloat(numStr);
        if (isNaN(num)) return "";
        // Separar parte entera y decimal
        const parts = num.toString().split(".");
        const integerPart = parts[0];
        const decimalPart = parts[1];
        // Agregar puntos cada 3 dígitos desde la derecha en la parte entera
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        // Si hay decimales, agregarlos con punto
        if (decimalPart) {
            return `${formattedInteger}.${decimalPart}`;
        }
        return formattedInteger;
    };

    const parseNumber = (value) => {
        if (!value) return "";
        // Contar puntos: si hay más de uno, el último es decimal, los demás son separadores de miles
        const pointCount = (value.match(/\./g) || []).length;
        if (pointCount > 1) {
            // Hay separadores de miles y decimales
            // Remover todos los puntos excepto el último
            const lastPointIndex = value.lastIndexOf(".");
            const beforeLastPoint = value.substring(0, lastPointIndex).replace(/\./g, "");
            const afterLastPoint = value.substring(lastPointIndex + 1);
            return `${beforeLastPoint}.${afterLastPoint}`;
        } else if (pointCount === 1) {
            // Solo un punto: verificar si es decimal o separador de miles
            const pointIndex = value.indexOf(".");
            const afterPoint = value.substring(pointIndex + 1);
            // Si después del punto hay más de 2 dígitos, es separador de miles
            if (afterPoint.length > 2) {
                return value.replace(/\./g, "");
            }
            // Si hay 1-2 dígitos después, es decimal
            return value;
        }
        // Sin puntos, solo números
        return value;
    };

    const [error, setError] = useState("");
    const [checkedAuth, setCheckedAuth] = useState(false);

    // Filtros
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSpecies, setFilterSpecies] = useState("");
    const [filterMorfologia, setFilterMorfologia] = useState("");
    const [filterNombreComun, setFilterNombreComun] = useState("");
    const [filterTamaño, setFilterTamaño] = useState("");
    const [filterSector, setFilterSector] = useState("");
    const [filterHealth, setFilterHealth] = useState("");
    const [filterNursery, setFilterNursery] = useState("");
    const [filterInvoice, setFilterInvoice] = useState("");
    const [filterPurchaseDateFrom, setFilterPurchaseDateFrom] = useState("");
    const [filterPurchaseDateTo, setFilterPurchaseDateTo] = useState("");
    const [sortBy, setSortBy] = useState("scientific_name");
    const [sortOrder, setSortOrder] = useState("asc");

    // Lista principal de ejemplares via React Query
    const { data: ejemplaresResult, isLoading: loading } = useEjemplaresList(
        {
            q: searchQuery,
            species_id: filterSpecies || undefined,
            morfologia: filterMorfologia || undefined,
            nombre_comun: filterNombreComun || undefined,
            tamaño: filterTamaño || undefined,
            sector_id: filterSector || undefined,
            health_status: filterHealth || undefined,
            nursery: filterNursery || undefined,
            invoice_number: filterInvoice || undefined,
            purchase_date_from: filterPurchaseDateFrom || undefined,
            purchase_date_to: filterPurchaseDateTo || undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
        },
        { enabled: !!(user || BYPASS_AUTH) }
    );

    // Listas para filtros (via React Query)
    const { data: speciesList = [] } = useSpeciesList({}, { enabled: !!checkedAuth });
    const { data: sectorsList = [] } = useSectorsList({}, { enabled: !!checkedAuth });
    const { data: nurseryList = [] } = useNurseryList();
    const { data: purchaseGroups = [] } = useQuery({
        queryKey: ["transactions", "purchases", "invoice-options"],
        queryFn: async () => {
            const res = await authApiRequest(`${API}/transactions/purchases?limit=2000`);
            if (!res.ok) throw new Error("Error al cargar facturas existentes");
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!checkedAuth,
        staleTime: 5 * 60 * 1000,
    });
    const { data: inventorySummary = { total: 0, healthCounts: {} } } = useQuery({
        queryKey: ["ejemplares", "inventory-summary"],
        queryFn: async () => {
            const pageSize = 200;
            let offset = 0;
            let total = 0;
            const allEjemplares = [];

            while (true) {
                const search = new URLSearchParams({
                    limit: String(pageSize),
                    offset: String(offset),
                    sort_by: "scientific_name",
                    sort_order: "asc",
                });
                const res = await authApiRequest(`${API}/ejemplar/staff?${search}`);
                if (!res.ok) throw new Error("Error al cargar resumen de inventario");
                const data = await res.json();
                const page = Array.isArray(data.data) ? data.data : [];

                if (offset === 0) {
                    total = Number(data.total) || page.length;
                }

                allEjemplares.push(...page);

                if (page.length < pageSize || allEjemplares.length >= total) {
                    break;
                }

                offset += pageSize;
            }

            const healthCounts = allEjemplares.reduce((acc, ej) => {
                const status = (ej.health_status || "Sin estado").trim() || "Sin estado";
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            return { total, healthCounts };
        },
        enabled: !!checkedAuth,
        staleTime: 5 * 60 * 1000,
    });

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view"); // "view" | "ingreso" | "compra" | "venta"
    const [selectedEjemplar, setSelectedEjemplar] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [speciesSearch, setSpeciesSearch] = useState("");
    const [selectedInvoiceKey, setSelectedInvoiceKey] = useState("");

    // Estados para modal de venta (selección de ejemplares)
    const [availableEjemplares, setAvailableEjemplares] = useState([]); // Ejemplares disponibles para venta
    const [saleSelectedIds, setSaleSelectedIds] = useState(new Set()); // IDs seleccionados para venta
    const [saleFilters, setSaleFilters] = useState({
        species: "",
        sector: "",
        search: ""
    });

    // Función para cargar ejemplares disponibles para venta (sin sale_date)
    const fetchAvailableEjemplares = async () => {
        try {
            const params = new URLSearchParams();
            // Filtrar solo ejemplares sin fecha de venta
            // El backend debería soportar esto, pero por ahora filtramos en el frontend
            const res = await authApiRequest(`${API}/ejemplar/staff?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data.data) ? data.data : [];
                setAvailableEjemplares(list.filter(ej => !ej.sale_date));
            }
        } catch (err) {
            console.error('Error loading available ejemplares:', err);
            setAvailableEjemplares([]);
        }
    };

    // Selección masiva para eliminación
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Función para filtrar ejemplares disponibles según los filtros
    const getFilteredEjemplares = () => {
        let filtered = [...availableEjemplares];

        if (saleFilters.species) {
            filtered = filtered.filter(ej => ej.species_id === parseInt(saleFilters.species));
        }

        if (saleFilters.sector) {
            if (saleFilters.sector === "standby") {
                filtered = filtered.filter(ej => ej.sector_id === null || ej.sector_id === undefined);
            } else {
                filtered = filtered.filter(ej => ej.sector_id === parseInt(saleFilters.sector));
            }
        }

        if (saleFilters.search) {
            const searchLower = saleFilters.search.toLowerCase();
            filtered = filtered.filter(ej => {
                const especie = ej.especies || {};
                const sector = ej.sectores || {};
                const searchText = (
                    `${ej.id} ` +
                    `${especie.scientific_name || ''} ` +
                    `${especie.nombre_común || ''} ` +
                    `${sector.name || ''}`
                ).toLowerCase();
                return searchText.includes(searchLower);
            });
        }

        return filtered;
    };

    // Función para procesar la venta de ejemplares seleccionados
    const handleSaleSubmit = async () => {
        if (saleSelectedIds.size === 0) {
            setError("Debes seleccionar al menos un ejemplar");
            return;
        }

        if (!formData.sale_date) {
            setError("La fecha de venta es obligatoria");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const saleDate = formData.sale_date;
            const salePrice = formData.sale_price ? parseFloat(formData.sale_price) : null;

            let updated = 0;
            let failed = 0;
            const errors = [];

            for (const id of saleSelectedIds) {
                try {
                    const payload = {
                        sale_date: saleDate,
                        sale_price: salePrice
                    };

                    const res = await authApiRequest(`${API}/ejemplar/staff/${id}`, {
                        method: "PUT",
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.detail || "Error al actualizar el ejemplar");
                    }

                    updated++;
                } catch (err) {
                    failed++;
                    errors.push(`Ejemplar ${id}: ${err.message}`);
                }
            }

            if (updated > 0) {
                await invalidateEjemplares();
                await fetchAvailableEjemplares(); // Recargar lista de disponibles

                if (failed === 0) {
                    setShowModal(false);
                    setSaleSelectedIds(new Set());
                    setSaleFilters({ species: "", sector: "", search: "" });
                    setFormData({
                        ...formData,
                        sale_date: "",
                        sale_price: ""
                    });
                } else {
                    setError(`Se actualizaron ${updated} de ${saleSelectedIds.size} ejemplares. Errores: ${errors.join('; ')}`);
                }
            } else {
                throw new Error(`No se pudo actualizar ningún ejemplar. Errores: ${errors.join('; ')}`);
            }
        } catch (err) {
            console.error('[InventoryPage] Error processing sale:', err);
            setError(err.message || "Error al procesar la venta");
        } finally {
            setSubmitting(false);
        }
    };

    // Form data para crear nuevo ejemplar
    const [formData, setFormData] = useState(createEmptyFormData);

    // Items de compra (múltiples especies)
    const [purchaseItems, setPurchaseItems] = useState(createEmptyPurchaseItems);

    const sortedSpeciesList = useMemo(() => {
        return [...speciesList].sort((a, b) => {
            const scientificCompare = (a.scientific_name || "").localeCompare(
                b.scientific_name || "",
                "es",
                { sensitivity: "base" }
            );
            if (scientificCompare !== 0) return scientificCompare;
            return (a.nombre_común || "").localeCompare(
                b.nombre_común || "",
                "es",
                { sensitivity: "base" }
            );
        });
    }, [speciesList]);

    const filteredEntrySpecies = useMemo(() => {
        const term = speciesSearch.trim().toLowerCase();
        if (!term) return sortedSpeciesList;
        return sortedSpeciesList.filter((species) => {
            const searchable = `${species.scientific_name || ""} ${species.nombre_común || ""} ${species.nombres_comunes || ""}`.toLowerCase();
            return searchable.includes(term);
        });
    }, [sortedSpeciesList, speciesSearch]);

    const invoiceOptions = useMemo(() => {
        const seen = new Set();
        return purchaseGroups
            .filter((purchase) => purchase.invoice_number)
            .map((purchase) => {
                const key = [
                    purchase.purchase_date || "",
                    purchase.invoice_number || "",
                    purchase.nursery || ""
                ].join("|");
                return {
                    key,
                    invoice_number: purchase.invoice_number || "",
                    purchase_date: purchase.purchase_date || "",
                    nursery: purchase.nursery || "",
                    total_quantity: purchase.total_quantity || 0,
                    total_amount: purchase.total_amount || 0,
                };
            })
            .filter((purchase) => {
                if (seen.has(purchase.key)) return false;
                seen.add(purchase.key);
                return true;
            });
    }, [purchaseGroups]);

    const selectedEntrySpecies = useMemo(() => {
        if (!formData.species_id) return null;
        return sortedSpeciesList.find((species) => String(species.id) === String(formData.species_id)) || null;
    }, [formData.species_id, sortedSpeciesList]);

    const selectedInvoice = useMemo(() => {
        if (!selectedInvoiceKey) return null;
        return invoiceOptions.find((invoice) => invoice.key === selectedInvoiceKey) || null;
    }, [invoiceOptions, selectedInvoiceKey]);

    const resetEntryState = () => {
        setFormData(createEmptyFormData());
        setPurchaseItems(createEmptyPurchaseItems());
        setSpeciesSearch("");
        setSelectedInvoiceKey("");
    };

    const applyExistingInvoice = (invoiceKey) => {
        setSelectedInvoiceKey(invoiceKey);
        const invoice = invoiceOptions.find((option) => option.key === invoiceKey);

        if (!invoice) {
            setFormData((current) => ({
                ...current,
                invoice_number: "",
                purchase_date: "",
            }));
            return;
        }

        setFormData((current) => ({
            ...current,
            invoice_number: invoice.invoice_number,
            purchase_date: invoice.purchase_date,
            nursery: invoice.nursery || current.nursery,
        }));
    };

    // Funciones para manejar items de compra
    const addPurchaseItem = () => {
        setPurchaseItems([...purchaseItems, {
            id: purchaseItems.length > 0 ? Math.max(...purchaseItems.map(i => i.id)) + 1 : 1,
            species_id: "",
            quantity: 1,
            price: "",
            lot_size: "",
            age_value: "",
            age_unit: "months",
            health_status: ""
        }]);
    };

    const removePurchaseItem = (id) => {
        if (purchaseItems.length > 1) {
            setPurchaseItems(purchaseItems.filter(item => item.id !== id));
        }
    };

    const updatePurchaseItem = (id, field, value) => {
        setPurchaseItems(purchaseItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

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

    // Filtro de fecha de compra aplicado client-side (rango)
    const getPurchaseDateOnly = (value) => {
        if (!value) return "";
        return String(value).split("T")[0];
    };

    const applyPurchaseDateFilter = (items) => {
        const hasFrom = Boolean(filterPurchaseDateFrom);
        const hasTo = Boolean(filterPurchaseDateTo);
        if (!hasFrom && !hasTo) return items;
        return items.filter((ej) => {
            const purchaseDate = getPurchaseDateOnly(ej.purchase_date);
            if (!purchaseDate) return false;
            if (hasFrom && !hasTo) return purchaseDate === filterPurchaseDateFrom;
            if (!hasFrom && hasTo) return purchaseDate === filterPurchaseDateTo;
            if (filterPurchaseDateFrom && purchaseDate < filterPurchaseDateFrom) return false;
            if (filterPurchaseDateTo && purchaseDate > filterPurchaseDateTo) return false;
            return true;
        });
    };

    const ejemplares = applyPurchaseDateFilter(ejemplaresResult?.data || []);

    const invalidateEjemplares = () =>
        queryClient.invalidateQueries({ queryKey: ["ejemplares"] });

    const handleView = (ej) => {
        setModalMode("view");
        setSelectedEjemplar(ej);
        setShowModal(true);
    };

    const handleEdit = (ej, mode) => {
        setSelectedEjemplar(ej);
        setModalMode(mode === "venta" ? "venta" : "compra");
        setFormData({
            species_id: String(ej.species_id || ""),
            sector_id: ej.sector_id === null || ej.sector_id === undefined ? "standby" : String(ej.sector_id),
            purchase_date: ej.purchase_date || "",
            sale_date: ej.sale_date || "",
            nursery: ej.nursery || "",
            invoice_number: ej.invoice_number || "",
            age_months: ej.age_months != null ? String(ej.age_months) : "",
            age_unit: "months",
            tamaño: ej.tamaño || "",
            health_status: ej.health_status || "",
            location: ej.location || "",
            purchase_price: ej.purchase_price != null ? String(ej.purchase_price) : "",
            sale_price: ej.sale_price != null ? String(ej.sale_price) : "",
            has_offshoots: ej.has_offshoots != null ? ej.has_offshoots : 0,
            cantidad: 1
        });
        // Pre-rellenar el item del formulario con los datos del ejemplar
        setPurchaseItems([{
            id: 1,
            species_id: String(ej.species_id || ""),
            quantity: 1,
            price: ej.purchase_price != null ? String(ej.purchase_price) : "",
            lot_size: ej.tamaño || "",
            age_value: ej.age_months != null ? String(ej.age_months) : "",
            age_unit: "months",
            health_status: ej.health_status || ""
        }]);
        setShowModal(true);
    };

    const handleDelete = async (ej) => {
        try {
            const ok = typeof window !== "undefined" ? window.confirm("¿Eliminar este registro? Esta acción no se puede deshacer.") : true;
            if (!ok) return;
            const res = await authApiRequest(`${API}/ejemplar/staff/${ej.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || "No se pudo eliminar el ejemplar");
            }
            await invalidateEjemplares();
            setSelectedIds(new Set());
        } catch (err) {
            setError(err.message || String(err));
        }
    };

    const handleDeleteMultiple = async () => {
        if (selectedIds.size === 0) return;

        const ok = typeof window !== "undefined"
            ? window.confirm(`¿Eliminar ${selectedIds.size} registro(s) seleccionado(s)? Esta acción no se puede deshacer.`)
            : true;
        if (!ok) return;

        try {
            setSubmitting(true);
            setError("");

            const idsArray = Array.from(selectedIds);
            let deleted = 0;
            let failed = 0;
            const errors = [];

            for (const id of idsArray) {
                try {
                    const res = await authApiRequest(`${API}/ejemplar/staff/${id}`, { method: "DELETE" });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.detail || "Error al eliminar");
                    }
                    deleted++;
                } catch (err) {
                    failed++;
                    errors.push(`ID ${id}: ${err.message}`);
                }
            }

            if (deleted > 0) {
                await invalidateEjemplares();
                setSelectedIds(new Set());

                if (failed > 0) {
                    setError(`Se eliminaron ${deleted} registro(s). ${failed} fallaron: ${errors.join(", ")}`);
                }
            } else {
                setError(`No se pudo eliminar ningún registro. Errores: ${errors.join(", ")}`);
            }
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === ejemplares.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(ejemplares.map(ej => ej.id)));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedEjemplar) return;
        try {
            setSubmitting(true);
            setError("");
            const payload = { ...formData };
            delete payload.cantidad;
            delete payload.age_unit;

            // En modo compra, leer los campos del item desde purchaseItems[0]
            if (modalMode === "compra" && purchaseItems.length > 0) {
                const item = purchaseItems[0];
                if (item.species_id) payload.species_id = item.species_id;
                if (item.price !== "") payload.purchase_price = item.price;
                payload["tamaño"] = item.lot_size || null;
                payload.health_status = item.health_status || null;
                if (item.age_value !== "") {
                    let ageVal = parseInt(item.age_value);
                    if (item.age_unit === "years") ageVal *= 12;
                    payload.age_months = ageVal;
                } else {
                    payload.age_months = null;
                }
            } else {
                delete payload["tamaño"];
            }

            // Limpiar según modo
            if (modalMode === "compra") {
                payload.sale_date = null;
                payload.sale_price = null;
            } else if (modalMode === "venta") {
                payload.purchase_date = null;
                payload.purchase_price = null;
                payload.nursery = null;
                delete payload["tamaño"];
            }

            // Tipos
            payload.species_id = parseInt(payload.species_id);
            payload.sector_id = payload.sector_id === "standby" ? null : parseInt(payload.sector_id);
            if (payload.purchase_price) payload.purchase_price = parseFloat(payload.purchase_price);
            if (payload.sale_price) payload.sale_price = parseFloat(payload.sale_price);
            if (payload.has_offshoots !== undefined && payload.has_offshoots !== null) payload.has_offshoots = parseInt(payload.has_offshoots) || 0;

            const res = await authApiRequest(`${API}/ejemplar/staff/${selectedEjemplar.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || "No se pudo actualizar el ejemplar");
            }
            await invalidateEjemplares();
            setShowModal(false);
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios comunes
        // sector_id puede estar vacío o ser "standby" para ejemplares sin asignar
        // No es obligatorio, así que no validamos aquí

        // Validar campos según el modo
        if (modalMode === "ingreso") {
            if (!formData.species_id) {
                setError("La especie es obligatoria");
                return;
            }
            const cantidad = parseInt(formData.cantidad, 10) || 0;
            if (cantidad < 1) {
                setError("La cantidad debe ser al menos 1");
                return;
            }
            if (cantidad > 100) {
                setError("La cantidad máxima permitida es 100 ejemplares por operación");
                return;
            }
        } else if (modalMode === "compra") {
            if (!formData.purchase_date) {
                setError("La fecha de compra es obligatoria");
                return;
            }

            // Validar items de compra
            const validItems = purchaseItems.filter(item => item.species_id && item.quantity > 0);
            if (validItems.length === 0) {
                setError("Debes agregar al menos una especie con cantidad mayor a 0");
                return;
            }

            // Validar que no haya más de 100 ejemplares en total
            const totalQuantity = validItems.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
            if (totalQuantity > 100) {
                setError("La cantidad máxima total permitida es 100 ejemplares por operación");
                return;
            }
        } else if (modalMode === "venta") {
            if (!formData.sale_date) {
                setError("La fecha de venta es obligatoria");
                return;
            }
            if (!formData.species_id) {
                setError("La especie es obligatoria");
                return;
            }
        }

        try {
            setSubmitting(true);
            setError("");

            let created = 0;
            let failed = 0;
            const errors = [];

            if (modalMode === "compra") {
                // Procesar múltiples items de compra
                const validItems = purchaseItems.filter(item => item.species_id && item.quantity > 0);

                for (const item of validItems) {
                    const quantity = parseInt(item.quantity) || 1;
                    const price = item.price ? parseFloat(parseNumber(item.price)) : null;
                    const hasAgeValue = String(item.age_value ?? "").trim() !== "";
                    const parsedAgeValue = hasAgeValue ? parseInt(item.age_value, 10) : null;
                    const ageMonths = !hasAgeValue || Number.isNaN(parsedAgeValue)
                        ? null
                        : (item.age_unit === "years" ? parsedAgeValue * 12 : parsedAgeValue);

                    // Preparar payload base para este item
                    const basePayload = {
                        species_id: parseInt(item.species_id),
                        sector_id: formData.sector_id === "standby" || formData.sector_id === "" ? null : parseInt(formData.sector_id),
                        purchase_date: formData.purchase_date,
                        sale_date: null,
                        nursery: formData.nursery || null,
                        invoice_number: formData.invoice_number || null,
                        tamaño: item.lot_size || null,
                        health_status: item.health_status || null,
                        location: formData.location || null,
                        purchase_price: price,
                        sale_price: null,
                        has_offshoots: formData.has_offshoots || 0
                    };
                    if (ageMonths !== null) {
                        basePayload.age_months = ageMonths;
                    }

                    // Crear la cantidad de ejemplares para este item
                    for (let i = 0; i < quantity; i++) {
                        try {
                            const res = await authApiRequest(`${API}/ejemplar/staff`, {
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
                            const speciesName = speciesList.find(s => s.id === parseInt(item.species_id))?.scientific_name || "especie";
                            errors.push(`${speciesName} (${i + 1}/${quantity}): ${err.message}`);
                        }
                    }
                }
            } else if (modalMode === "ingreso") {
                const hasAgeValue = String(formData.age_months ?? "").trim() !== "";
                const parsedAgeValue = hasAgeValue ? parseInt(formData.age_months, 10) : null;
                const ageMonths = !hasAgeValue || Number.isNaN(parsedAgeValue)
                    ? null
                    : (formData.age_unit === "years" ? parsedAgeValue * 12 : parsedAgeValue);

                const basePayload = {
                    species_id: parseInt(formData.species_id),
                    sector_id: formData.sector_id === "standby" || formData.sector_id === "" ? null : parseInt(formData.sector_id),
                    purchase_date: formData.purchase_date || null,
                    sale_date: null,
                    nursery: formData.nursery || null,
                    invoice_number: formData.invoice_number || null,
                    tamaño: formData.tamaño || null,
                    health_status: formData.health_status || null,
                    location: formData.location || null,
                    purchase_price: formData.purchase_price ? parseFloat(parseNumber(formData.purchase_price)) : null,
                    sale_price: null,
                    has_offshoots: parseInt(formData.has_offshoots, 10) || 0
                };
                if (ageMonths !== null) {
                    basePayload.age_months = ageMonths;
                }
                const quantity = parseInt(formData.cantidad, 10) || 1;

                for (let i = 0; i < quantity; i++) {
                    try {
                        const res = await authApiRequest(`${API}/ejemplar/staff`, {
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
                        const speciesName = selectedEntrySpecies?.scientific_name || "especie";
                        errors.push(`${speciesName} (${i + 1}/${quantity}): ${err.message}`);
                    }
                }
            } else {
                // Modo venta: usar el formulario tradicional (una especie)
                const cantidad = parseInt(formData.cantidad) || 1;

                // Preparar payload base (sin cantidad y sin age_unit)
                const basePayload = { ...formData };
                delete basePayload.cantidad;
                delete basePayload.age_unit;

                // Limpiar campos de compra
                basePayload.purchase_date = null;
                basePayload.purchase_price = null;
                basePayload.nursery = null;

                // Convertir IDs a números
                basePayload.species_id = parseInt(formData.species_id);
                basePayload.sector_id = formData.sector_id === "standby" || formData.sector_id === "" ? null : parseInt(formData.sector_id);

                // Convertir age_months a número si existe
                if (basePayload.age_months) {
                    let ageValue = parseInt(basePayload.age_months);
                    if (formData.age_unit === "years") {
                        ageValue = ageValue * 12;
                    }
                    basePayload.age_months = ageValue;
                }

                // Convertir precios a números
                if (basePayload.sale_price) {
                    basePayload.sale_price = parseFloat(parseNumber(basePayload.sale_price));
                }

                // Convertir has_offshoots
                if (basePayload.has_offshoots !== undefined && basePayload.has_offshoots !== null) {
                    basePayload.has_offshoots = parseInt(basePayload.has_offshoots) || 0;
                }

                // Eliminar campo 'tamaño'
                if ("tamaño" in basePayload) {
                    delete basePayload.tamaño;
                }

                // Crear múltiples ejemplares
                for (let i = 0; i < cantidad; i++) {
                    try {
                        const res = await authApiRequest(`${API}/ejemplar/staff`, {
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
                    }
                }
            }

            // Mostrar resultado
            if (created > 0) {
                await invalidateEjemplares();

                if (failed === 0) {
                    setShowModal(false);
                    resetEntryState();
                } else {
                    setError(`Se crearon ${created} ejemplares. ${failed} fallaron: ${errors.join('; ')}`);
                }
            } else {
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
            const dateOnlyMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
            const date = dateOnlyMatch
                ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
                : new Date(dateString);
            return date.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return dateString;
        }
    };

    const calculateAge = (ageMonths, purchaseDate) => {
        // Siempre calcular desde purchase_date si está disponible (edad automática que crece cada mes)
        if (purchaseDate) {
            const purchase = new Date(purchaseDate);
            const now = new Date();
            // Calcular diferencia en meses considerando el día del mes
            let diffMonths = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());

            // Si el día actual es menor que el día de compra, no ha pasado un mes completo todavía
            if (now.getDate() < purchase.getDate()) {
                diffMonths = Math.max(0, diffMonths);
            }

            // Asegurar que la edad no sea negativa
            diffMonths = Math.max(0, diffMonths);

            if (diffMonths >= 12) {
                const years = Math.floor(diffMonths / 12);
                const months = diffMonths % 12;
                return months > 0 ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}` : `${years} año${years !== 1 ? 's' : ''}`;
            }
            return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
        }
        // Si no hay purchase_date, usar age_months como fallback
        if (ageMonths) {
            if (ageMonths >= 12) {
                const years = Math.floor(ageMonths / 12);
                const months = ageMonths % 12;
                return months > 0 ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}` : `${years} año${years !== 1 ? 's' : ''}`;
            }
            return `${ageMonths} mes${ageMonths !== 1 ? 'es' : ''}`;
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
            .map(s => s.tipo_morfología)
            .filter(Boolean)
    )].sort();

    const inventoryTotal = inventorySummary.total || 0;
    const healthStatusEntries = [
        ...HEALTH_STATUS_OPTIONS.map((status) => ({
            label: status,
            count: inventorySummary.healthCounts[status] || 0,
        })),
        ...Object.entries(inventorySummary.healthCounts)
            .filter(([status]) => status === "Sin estado" || !HEALTH_STATUS_OPTIONS.includes(status))
            .map(([status, count]) => ({ label: status, count })),
    ];

    // Formato CLP sin símbolo: 12.000
    const formatCLP = (value) => {
        try {
            const num = Number(value) || 0;
            return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
        } catch {
            return String(value ?? 0);
        }
    };

    const renderEntryForm = () => (
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
                <section>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                                Especie <span style={{ color: "#dc2626" }}>*</span>
                            </h3>
                            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
                                Ordenado por nombre científico.
                            </p>
                        </div>
                        <input
                            type="search"
                            value={speciesSearch}
                            onChange={(e) => setSpeciesSearch(e.target.value)}
                            placeholder="Buscar especie..."
                            style={{
                                width: "min(100%, 280px)",
                                minHeight: "44px",
                                padding: "10px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <div className="entry-species-grid">
                        {filteredEntrySpecies.length === 0 ? (
                            <div style={{
                                padding: "24px",
                                border: "1px dashed #d1d5db",
                                borderRadius: "8px",
                                color: "#6b7280",
                                backgroundColor: "#f9fafb"
                            }}>
                                No hay especies que coincidan con la búsqueda.
                            </div>
                        ) : filteredEntrySpecies.map((species) => {
                            const selected = String(formData.species_id) === String(species.id);
                            const photo = species.cover_photo || species.image_url;

                            return (
                                <button
                                    key={species.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setFormData({ ...formData, species_id: String(species.id) })}
                                    style={{
                                        minHeight: "132px",
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: selected ? "2px solid #059669" : "1px solid #d1d5db",
                                        backgroundColor: selected ? "#ecfdf5" : "white",
                                        cursor: "pointer",
                                        display: "flex",
                                        gap: "12px",
                                        alignItems: "stretch",
                                        textAlign: "left",
                                        boxShadow: selected ? "0 0 0 3px rgba(5, 150, 105, 0.12)" : "none",
                                        transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s"
                                    }}
                                >
                                    {photo ? (
                                        <AuthenticatedImage
                                            src={resolvePhotoUrl(photo, { variant: "w=400" })}
                                            fallbackSrc={resolvePhotoUrl(photo)}
                                            alt={species.nombre_común || species.scientific_name}
                                            style={{
                                                width: "112px",
                                                height: "112px",
                                                minWidth: "112px",
                                                objectFit: "cover",
                                                borderRadius: "8px",
                                                border: "1px solid #e5e7eb",
                                                backgroundColor: "#f3f4f6"
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: "112px",
                                            height: "112px",
                                            minWidth: "112px",
                                            borderRadius: "8px",
                                            border: "1px dashed #d1d5db",
                                            backgroundColor: "#f3f4f6",
                                            color: "#9ca3af",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: "600"
                                        }}>
                                            Sin foto
                                        </div>
                                    )}
                                    <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                                        <span style={{
                                            fontSize: "15px",
                                            fontWeight: "700",
                                            color: "#111827",
                                            fontStyle: "italic",
                                            lineHeight: 1.3,
                                            overflowWrap: "anywhere"
                                        }}>
                                            {species.scientific_name || "Sin nombre científico"}
                                        </span>
                                        <span style={{
                                            marginTop: "6px",
                                            fontSize: "13px",
                                            color: "#4b5563",
                                            lineHeight: 1.35,
                                            overflowWrap: "anywhere"
                                        }}>
                                            {species.nombre_común || "Sin nombre común"}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section style={{
                    padding: "16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "#f9fafb"
                }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                        Datos del ejemplar
                    </h3>
                    <div className="entry-two-column-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Cantidad <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={formData.cantidad}
                                onChange={(e) => setFormData({ ...formData, cantidad: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Sector
                            </label>
                            <select
                                value={formData.sector_id}
                                onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            >
                                <option value="">Seleccionar sector...</option>
                                <option value="standby">Sin Asignar (Standby)</option>
                                {sectorsList.map((sector) => (
                                    <option key={sector.id} value={sector.id}>
                                        {sector.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Tamaño
                            </label>
                            <select
                                value={formData.tamaño}
                                onChange={(e) => setFormData({ ...formData, tamaño: e.target.value })}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            >
                                <option value="">Seleccionar tamaño...</option>
                                {SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Estado
                            </label>
                            <select
                                value={formData.health_status}
                                onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            >
                                <option value="">Seleccionar estado...</option>
                                {HEALTH_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Edad
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px", gap: "8px" }}>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.age_months}
                                    onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
                                    placeholder="0"
                                    style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                                />
                                <select
                                    value={formData.age_unit}
                                    onChange={(e) => setFormData({ ...formData, age_unit: e.target.value })}
                                    style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                                >
                                    <option value="months">Meses</option>
                                    <option value="years">Años</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Vivero
                            </label>
                            <input
                                type="text"
                                list="nursery-options-entry"
                                value={formData.nursery}
                                onChange={(e) => setFormData({ ...formData, nursery: e.target.value })}
                                placeholder="Seleccionar o escribir vivero"
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                            <datalist id="nursery-options-entry">
                                {nurseryList.map((nursery) => (
                                    <option key={nursery} value={nursery} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Factura existente
                            </label>
                            <select
                                value={selectedInvoiceKey}
                                onChange={(e) => applyExistingInvoice(e.target.value)}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            >
                                <option value="">Sin factura asociada</option>
                                {invoiceOptions.map((invoice) => (
                                    <option key={invoice.key} value={invoice.key}>
                                        {invoice.invoice_number} · {formatDate(invoice.purchase_date)}{invoice.nursery ? ` · ${invoice.nursery}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Número de factura
                            </label>
                            <input
                                type="text"
                                value={formData.invoice_number}
                                onChange={(e) => {
                                    setSelectedInvoiceKey("");
                                    setFormData({ ...formData, invoice_number: e.target.value });
                                }}
                                placeholder="Ej: FAC-001234"
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", marginBottom: "6px", display: "block", letterSpacing: 0 }}>
                                Fecha de compra
                            </label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                style={{ width: "100%", minHeight: "44px", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    {selectedInvoice && (
                        <div style={{
                            marginTop: "12px",
                            padding: "10px 12px",
                            border: "1px solid #bbf7d0",
                            borderRadius: "8px",
                            backgroundColor: "#f0fdf4",
                            color: "#166534",
                            fontSize: "13px",
                            lineHeight: 1.45
                        }}>
                            Asociado a factura {selectedInvoice.invoice_number}: {selectedInvoice.total_quantity} ejemplar{selectedInvoice.total_quantity === 1 ? "" : "es"} registrado{selectedInvoice.total_quantity === 1 ? "" : "s"} por CLP {formatCLP(selectedInvoice.total_amount)}.
                        </div>
                    )}
                </section>

                <div className="entry-form-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "4px" }}>
                    <button
                        type="button"
                        onClick={() => {
                            setShowModal(false);
                            setError("");
                            resetEntryState();
                        }}
                        style={{
                            minHeight: "44px",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "white",
                            color: "#374151",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: submitting ? "not-allowed" : "pointer"
                        }}
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        style={{
                            minHeight: "44px",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: submitting ? "#9ca3af" : "#10b981",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "700",
                            cursor: submitting ? "not-allowed" : "pointer"
                        }}
                        disabled={submitting}
                    >
                        {submitting
                            ? "Guardando..."
                            : `Ingresar ${parseInt(formData.cantidad, 10) || 1} ejemplar${(parseInt(formData.cantidad, 10) || 1) === 1 ? "" : "es"}`}
                    </button>
                </div>
            </div>
        </form>
    );

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
                    .entry-species-grid {
                        grid-template-columns: 1fr !important;
                        max-height: 340px !important;
                    }
                    .entry-two-column-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .entry-form-actions {
                        flex-direction: column-reverse;
                    }
                    .entry-form-actions button {
                        width: 100%;
                    }
                }
                .entry-species-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                    gap: 12px;
                    max-height: 420px;
                    overflow-y: auto;
                    padding: 2px;
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
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleDeleteMultiple}
                                    disabled={submitting}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        border: "none",
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        fontSize: "clamp(12px, 3vw, 14px)",
                                        fontWeight: "600",
                                        cursor: submitting ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        whiteSpace: "nowrap",
                                        opacity: submitting ? 0.6 : 1
                                    }}
                                >
                                    <span>🗑️</span>
                                    <span>Eliminar {selectedIds.size}</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setSelectedEjemplar(null);
                                    setModalMode("ingreso");
                                    resetEntryState();
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
                                    gap: "6px",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                <span>+</span>
                                <span>Ingresar especie</span>
                            </button>
                            <Link
                                href="/transactions"
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: "#6366f1",
                                    color: "white",
                                    fontSize: "clamp(12px, 3vw, 14px)",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    whiteSpace: "nowrap",
                                    textDecoration: "none"
                                }}
                            >
                                <span>📊</span>
                                <span>Compras y Ventas</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Resumen de Inventario */}
                <section style={{
                    maxWidth: "1400px",
                    margin: "8px auto 0",
                    padding: "0 clamp(12px, 4vw, 24px) 8px",
                }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                        gap: "8px"
                    }}>
                        <div style={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            minHeight: "54px"
                        }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    color: "#6b7280",
                                    fontWeight: 700
                                }}>
                                    Especies registradas
                                </div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px", minWidth: 0 }}>
                                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                                        {inventoryTotal}
                                    </div>
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        fontWeight: 600,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                    }}>
                                        ejemplar{inventoryTotal === 1 ? "" : "es"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            minHeight: "54px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                <div style={{
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    color: "#6b7280",
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}>
                                    Estados sanitarios
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                    minWidth: 0,
                                    flex: 1
                                }}>
                                    {healthStatusEntries.map(({ label, count }) => (
                                        <div
                                            key={label}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "3px 7px",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "999px",
                                                backgroundColor: "#f9fafb",
                                                maxWidth: "180px"
                                            }}
                                        >
                                            <span style={{
                                                fontSize: "11px",
                                                color: "#4b5563",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {label}
                                            </span>
                                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                                                {count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <main style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "clamp(24px, 5vw, 32px) 24px"
                }}>
                    {/* Filtros */}
                    <CollapsibleFilters>
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

                            <select
                                value={filterSector}
                                onChange={(e) => setFilterSector(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todos los sectores</option>
                                <option value="standby">🔴 Sin Asignar (Standby)</option>
                                {sectorsList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filterHealth}
                                onChange={(e) => setFilterHealth(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todos los estados de salud</option>
                                <option value="muy bien">Muy bien</option>
                                <option value="estable">Estable</option>
                                <option value="leve enfermo">Leve enfermo</option>
                                <option value="enfermo">Enfermo</option>
                                <option value="crítico">Crítico</option>
                            </select>

                            <select
                                value={filterNursery}
                                onChange={(e) => setFilterNursery(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            >
                                <option value="">Todos los viveros</option>
                                {nurseryList.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="N° factura..."
                                value={filterInvoice}
                                onChange={(e) => setFilterInvoice(e.target.value)}
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Compra desde
                                </span>
                                <input
                                    type="date"
                                    value={filterPurchaseDateFrom}
                                    onChange={(e) => setFilterPurchaseDateFrom(e.target.value)}
                                    style={{
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        width: "100%",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Compra hasta
                                </span>
                                <input
                                    type="date"
                                    value={filterPurchaseDateTo}
                                    onChange={(e) => setFilterPurchaseDateTo(e.target.value)}
                                    style={{
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none",
                                        width: "100%",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

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

                        {(searchQuery || filterSpecies || filterMorfologia || filterNombreComun || filterTamaño || filterSector || filterHealth || filterNursery || filterInvoice || filterPurchaseDateFrom || filterPurchaseDateTo) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterSpecies("");
                                    setFilterMorfologia("");
                                    setFilterNombreComun("");
                                    setFilterTamaño("");
                                    setFilterSector("");
                                    setFilterHealth("");
                                    setFilterNursery("");
                                    setFilterInvoice("");
                                    setFilterPurchaseDateFrom("");
                                    setFilterPurchaseDateTo("");
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
                    </CollapsibleFilters>

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
                    <InventoryTable
                        ejemplares={ejemplares}
                        loading={loading}
                        selectedIds={selectedIds}
                        onToggleSelectAll={toggleSelectAll}
                        onToggleSelect={toggleSelect}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </main>
            </div>

            {/* Modal de Visualización o Creación */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setError("");
                    if (modalMode === "ingreso" || modalMode === "compra" || modalMode === "venta") {
                        resetEntryState();
                    }
                }}
                title={
                    modalMode === "ingreso" ? "Ingresar Especie" :
                        modalMode === "compra" ? "Ingresar Compra" :
                            modalMode === "venta" ? "Ingresar Venta" :
                                "Detalle del Ejemplar"
                }
            >
                {modalMode === "ingreso" ? renderEntryForm() : modalMode === "compra" ? (
                    <form onSubmit={selectedEjemplar ? handleUpdate : handleCreate}>
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
                            {/* Información común de la compra */}
                            <div style={{
                                padding: "16px",
                                backgroundColor: "#f0f9ff",
                                border: "1px solid #bae6fd",
                                borderRadius: "8px"
                            }}>
                                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#0369a1" }}>
                                    Información de la Compra
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                                    <div style={{ minWidth: "250px" }}>
                                        <label style={{
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            marginBottom: "6px",
                                            display: "block"
                                        }}>
                                            Fecha de Compra <span style={{ color: "#dc2626" }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.purchase_date}
                                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                outline: "none",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                    <div style={{ minWidth: "250px" }}>
                                        <label style={{
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            marginBottom: "6px",
                                            display: "block"
                                        }}>
                                            Sector
                                        </label>
                                        <select
                                            value={formData.sector_id}
                                            onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                outline: "none",
                                                boxSizing: "border-box"
                                            }}
                                        >
                                            <option value="">Seleccionar sector...</option>
                                            <option value="standby">🔴 Sin Asignar (Standby)</option>
                                            {sectorsList.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ minWidth: "250px" }}>
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
                                            list="nursery-options"
                                            value={formData.nursery}
                                            onChange={(e) => setFormData({ ...formData, nursery: e.target.value })}
                                            placeholder="Seleccionar o escribir nuevo vivero"
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                outline: "none",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                        <datalist id="nursery-options">
                                            {nurseryList.map(n => (
                                                <option key={n} value={n} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div style={{ minWidth: "250px" }}>
                                        <label style={{
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            marginBottom: "6px",
                                            display: "block"
                                        }}>
                                            Número de Factura
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                            placeholder="Ej: FAC-001234"
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "8px",
                                                fontSize: "14px",
                                                outline: "none",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Items de compra (múltiples especies) */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#374151" }}>
                                        {selectedEjemplar ? "Datos del Ejemplar" : "Especies de la Compra"}
                                    </h3>
                                    {!selectedEjemplar && (
                                        <button
                                            type="button"
                                            onClick={addPurchaseItem}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: "6px",
                                                border: "none",
                                                backgroundColor: "#10b981",
                                                color: "white",
                                                fontSize: "14px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            <span>+</span>
                                            <span>Agregar Especie</span>
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {purchaseItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                padding: "16px",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "8px",
                                                backgroundColor: "#f9fafb"
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                                                    Item {index + 1}
                                                </span>
                                                {purchaseItems.length > 1 && !selectedEjemplar && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePurchaseItem(item.id)}
                                                        style={{
                                                            padding: "6px 12px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #ef4444",
                                                            backgroundColor: "white",
                                                            color: "#ef4444",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
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
                                                        value={item.species_id}
                                                        onChange={(e) => updatePurchaseItem(item.id, "species_id", e.target.value)}
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
                                                {!selectedEjemplar && (
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
                                                        Cantidad <span style={{ color: "#dc2626" }}>*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updatePurchaseItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
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
                                                )}
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
                                                        Precio Unitario
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formatNumber(item.price)}
                                                        onChange={(e) => {
                                                            const parsed = parseNumber(e.target.value);
                                                            updatePurchaseItem(item.id, "price", parsed);
                                                        }}
                                                        onBlur={(e) => {
                                                            const parsed = parseNumber(e.target.value);
                                                            if (parsed && !isNaN(parseFloat(parsed))) {
                                                                updatePurchaseItem(item.id, "price", parsed);
                                                            }
                                                        }}
                                                        placeholder="0"
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
                                                        Tamaño del Lote (Promedio)
                                                    </label>
                                                    <select
                                                        value={item.lot_size || ""}
                                                        onChange={(e) => updatePurchaseItem(item.id, "lot_size", e.target.value)}
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
                                                        Edad del Lote
                                                    </label>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 95px", gap: "8px" }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.age_value || ""}
                                                            onChange={(e) => updatePurchaseItem(item.id, "age_value", e.target.value)}
                                                            placeholder="0"
                                                            style={{
                                                                width: "100%",
                                                                padding: "10px 12px",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: "8px",
                                                                fontSize: "14px",
                                                                outline: "none",
                                                                boxSizing: "border-box"
                                                            }}
                                                        />
                                                        <select
                                                            value={item.age_unit || "months"}
                                                            onChange={(e) => updatePurchaseItem(item.id, "age_unit", e.target.value)}
                                                            style={{
                                                                width: "100%",
                                                                padding: "10px 12px",
                                                                border: "1px solid #d1d5db",
                                                                borderRadius: "8px",
                                                                fontSize: "14px",
                                                                outline: "none",
                                                                boxSizing: "border-box"
                                                            }}
                                                        >
                                                            <option value="months">Meses</option>
                                                            <option value="years">Años</option>
                                                        </select>
                                                    </div>
                                                </div>
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
                                                        value={item.health_status || ""}
                                                        onChange={(e) => updatePurchaseItem(item.id, "health_status", e.target.value)}
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
                                                        <option value="muy bien">Muy bien</option>
                                                        <option value="estable">Estable</option>
                                                        <option value="leve enfermo">Leve enfermo</option>
                                                        <option value="enfermo">Enfermo</option>
                                                        <option value="crítico">Crítico</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: "12px",
                                    padding: "12px",
                                    backgroundColor: "#f0f9ff",
                                    border: "1px solid #bae6fd",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    color: "#0369a1"
                                }}>
                                    <strong>Total:</strong> {purchaseItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} ejemplar{purchaseItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) !== 1 ? 'es' : ''} en {purchaseItems.filter(item => item.species_id).length} especie{purchaseItems.filter(item => item.species_id).length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {modalMode === "venta" && (
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
                                        Precio de Venta (Unitario)
                                    </label>
                                    <input
                                        type="text"
                                        value={formatNumber(formData.sale_price)}
                                        onChange={(e) => {
                                            const parsed = parseNumber(e.target.value);
                                            setFormData({ ...formData, sale_price: parsed });
                                        }}
                                        onBlur={(e) => {
                                            // Asegurar formato correcto al perder el foco
                                            const parsed = parseNumber(e.target.value);
                                            if (parsed && !isNaN(parseFloat(parsed))) {
                                                setFormData({ ...formData, sale_price: parsed });
                                            }
                                        }}
                                        placeholder="0"
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
                            )}

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
                                            invoice_number: "",
                                            age_months: "",
                                            age_unit: "months",
                                            tamaño: "",
                                            health_status: "",
                                            location: "",
                                            purchase_price: "",
                                            sale_price: "",
                                            has_offshoots: 0,
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
                                        ? "Guardando..."
                                        : selectedEjemplar
                                            ? "Guardar Cambios"
                                            : "Registrar Compra"}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : modalMode === "venta" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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

                        {/* Información de la venta */}
                        <div style={{
                            padding: "16px",
                            backgroundColor: "#fef3c7",
                            border: "1px solid #fcd34d",
                            borderRadius: "8px",
                            marginBottom: "16px"
                        }}>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#92400e" }}>
                                Información de la Venta
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                                        Fecha de Venta *
                                    </label>
                                    <input
                                        type="date"
                                        required
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
                                        Precio de Venta (Unitario)
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
                        </div>

                        {/* Filtros */}
                        <CollapsibleFilters className="collapsible-filters--subtle">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                                <select
                                    value={saleFilters.species}
                                    onChange={(e) => setSaleFilters({ ...saleFilters, species: e.target.value })}
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
                                    value={saleFilters.sector}
                                    onChange={(e) => setSaleFilters({ ...saleFilters, sector: e.target.value })}
                                    style={{
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                >
                                    <option value="">Todos los sectores</option>
                                    <option value="standby">🔴 Sin Asignar (Standby)</option>
                                    {sectorsList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Buscar por nombre científico, común, ID..."
                                    value={saleFilters.search}
                                    onChange={(e) => setSaleFilters({ ...saleFilters, search: e.target.value })}
                                    style={{
                                        padding: "10px 12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>
                        </CollapsibleFilters>

                        {/* Lista de ejemplares disponibles */}
                        <div style={{
                            maxHeight: "400px",
                            overflowY: "auto",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px"
                        }}>
                            {getFilteredEjemplares().length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                                    <p>No hay ejemplares disponibles para venta</p>
                                    <p style={{ fontSize: "12px", marginTop: "8px" }}>
                                        Los ejemplares ya vendidos no aparecen en esta lista
                                    </p>
                                </div>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#f9fafb", zIndex: 10 }}>
                                        <tr>
                                            <th style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                borderBottom: "2px solid #e5e7eb",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#6b7280",
                                                textTransform: "uppercase"
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={getFilteredEjemplares().length > 0 && saleSelectedIds.size === getFilteredEjemplares().length && getFilteredEjemplares().every(ej => saleSelectedIds.has(ej.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const filtered = getFilteredEjemplares();
                                                            const newSelected = new Set(saleSelectedIds);
                                                            filtered.forEach(ej => newSelected.add(ej.id));
                                                            setSaleSelectedIds(newSelected);
                                                        } else {
                                                            const filtered = getFilteredEjemplares();
                                                            const newSelected = new Set(saleSelectedIds);
                                                            filtered.forEach(ej => newSelected.delete(ej.id));
                                                            setSaleSelectedIds(newSelected);
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                borderBottom: "2px solid #e5e7eb",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#6b7280",
                                                textTransform: "uppercase"
                                            }}>ID</th>
                                            <th style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                borderBottom: "2px solid #e5e7eb",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#6b7280",
                                                textTransform: "uppercase"
                                            }}>Especie</th>
                                            <th style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                borderBottom: "2px solid #e5e7eb",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#6b7280",
                                                textTransform: "uppercase"
                                            }}>Sector</th>
                                            <th style={{
                                                padding: "12px",
                                                textAlign: "left",
                                                borderBottom: "2px solid #e5e7eb",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#6b7280",
                                                textTransform: "uppercase"
                                            }}>Salud</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getFilteredEjemplares().map(ej => {
                                            const especie = ej.especies || {};
                                            const sector = ej.sectores || {};
                                            const isSelected = saleSelectedIds.has(ej.id);
                                            return (
                                                <tr
                                                    key={ej.id}
                                                    style={{
                                                        backgroundColor: isSelected ? "#dbeafe" : "white",
                                                        cursor: "pointer",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    onClick={() => {
                                                        const newSelected = new Set(saleSelectedIds);
                                                        if (isSelected) {
                                                            newSelected.delete(ej.id);
                                                        } else {
                                                            newSelected.add(ej.id);
                                                        }
                                                        setSaleSelectedIds(newSelected);
                                                    }}
                                                >
                                                    <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => { }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>
                                                    <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                                        #{ej.id}
                                                    </td>
                                                    <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                                        <div>
                                                            <div style={{ fontWeight: "600", fontStyle: "italic" }}>
                                                                {especie.scientific_name || "-"}
                                                            </div>
                                                            {especie.nombre_común && (
                                                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                                                    {especie.nombre_común}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                                        {ej.sector_id === null || ej.sector_id === undefined ? "🔴 Sin Asignar (Standby)" : (sector.name || "-")}
                                                    </td>
                                                    <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                                        <span style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            backgroundColor: ej.health_status === "muy bien" ? "#d1fae5" :
                                                                ej.health_status === "estable" ? "#dbeafe" :
                                                                    ej.health_status === "leve enfermo" ? "#fef3c7" :
                                                                        ej.health_status === "enfermo" ? "#fee2e2" :
                                                                            ej.health_status === "crítico" ? "#fee2e2" : "#f3f4f6",
                                                            color: ej.health_status === "muy bien" ? "#065f46" :
                                                                ej.health_status === "leve enfermo" ? "#92400e" :
                                                                    ej.health_status === "enfermo" ? "#dc2626" :
                                                                        ej.health_status === "crítico" ? "#991b1b" : "#6b7280"
                                                        }}>
                                                            {ej.health_status || "-"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{
                            padding: "12px",
                            backgroundColor: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: "8px",
                            fontSize: "14px",
                            color: "#0369a1"
                        }}>
                            <strong>{saleSelectedIds.size}</strong> ejemplar{saleSelectedIds.size !== 1 ? 'es' : ''} seleccionado{saleSelectedIds.size !== 1 ? 's' : ''}
                        </div>

                        {/* Botones */}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    setError("");
                                    setSaleSelectedIds(new Set());
                                    setSaleFilters({ species: "", sector: "", search: "" });
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
                                type="button"
                                onClick={handleSaleSubmit}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: submitting ? "#9ca3af" : "#f59e0b",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    transition: "all 0.2s"
                                }}
                                disabled={submitting || saleSelectedIds.size === 0 || !formData.sale_date}
                            >
                                {submitting
                                    ? `Procesando ${saleSelectedIds.size} ejemplar${saleSelectedIds.size > 1 ? 'es' : ''}...`
                                    : `Vender ${saleSelectedIds.size} Ejemplar${saleSelectedIds.size > 1 ? 'es' : ''}`}
                            </button>
                        </div>
                    </div>
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
                                                N° Factura
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", fontFamily: "monospace" }}>
                                                {selectedEjemplar.invoice_number || "-"}
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
                                                Precio de Compra
                                            </label>
                                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                {selectedEjemplar.purchase_price
                                                    ? `$${new Intl.NumberFormat("es-CL").format(selectedEjemplar.purchase_price)}`
                                                    : "-"}
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

                                        {selectedEjemplar.sale_date && (
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
                                                    Precio de Venta
                                                </label>
                                                <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                                                    {selectedEjemplar.sale_price
                                                        ? `$${new Intl.NumberFormat("es-CL").format(selectedEjemplar.sale_price)}`
                                                        : "-"}
                                                </p>
                                            </div>
                                        )}

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
                                            {selectedEjemplar?.sector_id === null || selectedEjemplar?.sector_id === undefined ? "🔴 Sin Asignar (Standby)" : (sector.name || "-")}
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

