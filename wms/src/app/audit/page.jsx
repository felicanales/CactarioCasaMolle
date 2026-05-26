"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "../../utils/api-config";

// BYPASS AUTH EN DESARROLLO LOCAL
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const API = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export default function AuditPage() {
    const { user, loading: authLoading, apiRequest: authApiRequest } = useAuth();
    const router = useRouter();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({
        table_name: "",
        record_id: "",
        user_id: ""
    });
    const [pagination, setPagination] = useState({
        limit: 200,
        offset: 0
    });

    const [checkedAuth, setCheckedAuth] = useState(false);

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

    const fetchLogs = async () => {
        if (!checkedAuth && !BYPASS_AUTH) return;

        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams();
            if (filters.table_name) params.append("table_name", filters.table_name);
            if (filters.record_id) params.append("record_id", filters.record_id);
            if (filters.user_id) params.append("user_id", filters.user_id);
            params.append("limit", pagination.limit.toString());
            params.append("offset", pagination.offset.toString());

            const url = `${API}/audit?${params.toString()}`;
            
            const res = await authApiRequest(url, { method: "GET" });
            

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("[AuditPage] Error en respuesta:", errorData);
                throw new Error(errorData.detail || `Error al cargar logs (${res.status})`);
            }

            const data = await res.json();
            
            setLogs(data.logs || []);
        } catch (err) {
            console.error("[AuditPage] Error:", err);
            setError(err.message || "Error al cargar logs de auditoría");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (checkedAuth || BYPASS_AUTH) {
            fetchLogs();
        }
    }, [checkedAuth, filters, pagination]);
    
    // Refrescar automáticamente cada 30 segundos
    useEffect(() => {
        if (!checkedAuth && !BYPASS_AUTH) return;
        
        const interval = setInterval(() => {
            fetchLogs();
        }, 30000); // 30 segundos
        
        return () => clearInterval(interval);
    }, [checkedAuth, filters, pagination]);

    // Función para refrescar manualmente
    const handleRefresh = () => {
        fetchLogs();
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleString("es-CL", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        } catch {
            return dateString;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case "CREATE":
                return "#10b981"; // verde
            case "UPDATE":
                return "#3b82f6"; // azul
            case "DELETE":
                return "#ef4444"; // rojo
            case "LOGIN":
                return "#f59e0b"; // amarillo
            case "PURCHASE":
                return "#14b8a6"; // teal
            case "SALE":
                return "#f97316"; // naranja
            default:
                return "#6b7280"; // gris
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case "CREATE":
                return "Crear";
            case "UPDATE":
                return "Actualizar";
            case "DELETE":
                return "Eliminar";
            case "LOGIN":
                return "Login";
            case "PURCHASE":
                return "Compra";
            case "SALE":
                return "Venta";
            default:
                return action;
        }
    };

    const formatValue = (value) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (Array.isArray(value)) return value.join(", ");
        return "[obj]";
    };

    const shortenText = (value, maxLength = 60) => {
        if (!value || typeof value !== "string") return value || "-";
        if (value.length <= maxLength) return value;
        return `${value.slice(0, maxLength - 3)}...`;
    };

    const isLoginEvent = (log) => {
        if (!log) return false;
        if (log.accion === "LOGIN") return true;
        if (log.tabla_afectada !== "usuarios" || log.accion !== "UPDATE") return false;
        const eventFromChanges = log.cambios_detectados?.evento?.nuevo;
        const eventFromNewValues = log.campos_nuevos?.evento;
        return eventFromChanges === "LOGIN" || eventFromNewValues === "LOGIN";
    };

    const getChangedFields = (log) => {
        if (!log) return [];
        if (isLoginEvent(log)) return ["login"];
        if (log.accion === "PURCHASE") {
            const data = log.campos_nuevos || {};
            const fields = ["purchase_date", "purchase_price", "invoice_number", "nursery"];
            return fields.filter((key) => data[key] !== undefined && data[key] !== null);
        }
        if (log.accion === "SALE") {
            const data = log.campos_nuevos || {};
            const fields = ["sale_date", "sale_price"];
            return fields.filter((key) => data[key] !== undefined && data[key] !== null);
        }
        if (log.cambios_detectados) return Object.keys(log.cambios_detectados);
        return [];
    };

    const getChangeSummary = (log) => {
        if (!log) return "-";
        if (isLoginEvent(log)) {
            const ip = log.ip_address;
            const agent = log.user_agent;
            if (ip && agent) return `IP ${ip} - ${shortenText(agent)}`;
            if (ip) return `IP ${ip}`;
            return "Inicio de sesion";
        }
        if (log.accion === "PURCHASE") {
            const data = log.campos_nuevos || {};
            const parts = [];
            if (data.purchase_date) parts.push(`Fecha ${data.purchase_date}`);
            if (data.purchase_price !== undefined && data.purchase_price !== null) parts.push(`Precio ${data.purchase_price}`);
            if (data.invoice_number) parts.push(`Factura ${data.invoice_number}`);
            if (data.nursery) parts.push(`Vivero ${data.nursery}`);
            return parts.join(" - ") || "Compra registrada";
        }
        if (log.accion === "SALE") {
            const data = log.campos_nuevos || {};
            const parts = [];
            if (data.sale_date) parts.push(`Fecha ${data.sale_date}`);
            if (data.sale_price !== undefined && data.sale_price !== null) parts.push(`Precio ${data.sale_price}`);
            return parts.join(" - ") || "Venta registrada";
        }
        if (log.cambios_detectados) {
            const entries = Object.entries(log.cambios_detectados);
            if (entries.length === 0) return "-";
            const summaries = entries.slice(0, 2).map(([field, diff]) => {
                const before = diff?.anterior;
                const after = diff?.nuevo;
                return `${field}: ${formatValue(before)} -> ${formatValue(after)}`;
            });
            const extra = entries.length > 2 ? ` (+${entries.length - 2} mas)` : "";
            return `${summaries.join(" | ")}${extra}`;
        }
        return "-";
    };

    const renderFieldList = (log) => {
        const fields = getChangedFields(log);
        if (!fields.length) return "-";
        const shown = fields.slice(0, 3);
        const extra = fields.length > 3 ? ` +${fields.length - 3} mas` : "";
        return `${shown.join(", ")}${extra}`;
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
                        alignItems: "center", gap: "clamp(8px, 2vw, 16px)",
                        flexWrap: "wrap"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "clamp(8px, 2vw, 12px)",
                            flex: 1,
                            minWidth: "200px"
                        }}>
                            <Link href="/staff" style={{
                                padding: "8px", borderRadius: "6px",
                                border: "1px solid #e5e7eb", backgroundColor: "white",
                                color: "#374151", textDecoration: "none",
                                fontSize: "14px", transition: "all 0.2s", flexShrink: 0
                            }}>
                                ←
                            </Link>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <h1 style={{
                                    fontSize: "clamp(16px, 4vw, 20px)",
                                    fontWeight: "700", color: "#111827", margin: 0
                                }}>
                                    📋 Logs de Auditoría
                                </h1>
                                <p style={{
                                    fontSize: "clamp(11px, 3vw, 13px)",
                                    color: "#6b7280", margin: 0
                                }}>
                                    Historial de cambios y accesos al sistema
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        border: "1px solid #d1d5db",
                                        backgroundColor: loading ? "#f3f4f6" : "white",
                                        color: loading ? "#9ca3af" : "#374151",
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) {
                                            e.target.style.backgroundColor = "#f9fafb";
                                            e.target.style.borderColor = "#9ca3af";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading) {
                                            e.target.style.backgroundColor = "white";
                                            e.target.style.borderColor = "#d1d5db";
                                        }
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <span style={{
                                                display: "inline-block",
                                                width: "12px",
                                                height: "12px",
                                                border: "2px solid #9ca3af",
                                                borderTop: "2px solid transparent",
                                                borderRadius: "50%",
                                                animation: "spin 1s linear infinite"
                                            }}></span>
                                            Cargando...
                                        </>
                                    ) : (
                                        <>
                                            🔄 Refrescar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "clamp(16px, 3vw, 24px)"
                }}>
                    {/* Filtros */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        padding: "20px",
                        marginBottom: "24px"
                    }}>
                        <h2 style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "16px"
                        }}>
                            🔍 Filtros
                        </h2>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px"
                        }}>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "4px"
                                }}>
                                    Tabla
                                </label>
                                <select
                                    value={filters.table_name}
                                    onChange={(e) => {
                                        setFilters({ ...filters, table_name: e.target.value });
                                        setPagination({ ...pagination, offset: 0 });
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px"
                                    }}
                                >
                                    <option value="">Todas las tablas</option>
                                    <option value="especies">Especies</option>
                                    <option value="sectores">Sectores</option>
                                    <option value="ejemplar">Ejemplares</option>
                                    <option value="fotos">Fotos</option>
                                    <option value="sectores_especies">Relaciones Sector-Especie</option>
                                    <option value="usuarios">Usuarios / Accesos</option>
                                    <option value="home_content">Contenido Home</option>
                                </select>
                            </div>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "4px"
                                }}>
                                    ID de Registro
                                </label>
                                <input
                                    type="number"
                                    value={filters.record_id}
                                    onChange={(e) => {
                                        setFilters({ ...filters, record_id: e.target.value });
                                        setPagination({ ...pagination, offset: 0 });
                                    }}
                                    placeholder="Ej: 1010"
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px"
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "4px"
                                }}>
                                    ID de Usuario
                                </label>
                                <input
                                    type="number"
                                    value={filters.user_id}
                                    onChange={(e) => {
                                        setFilters({ ...filters, user_id: e.target.value });
                                        setPagination({ ...pagination, offset: 0 });
                                    }}
                                    placeholder="Ej: 1"
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px"
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    color: "#374151",
                                    marginBottom: "4px"
                                }}>
                                    Resultados por página
                                </label>
                                <select
                                    value={pagination.limit}
                                    onChange={(e) => {
                                        setPagination({ ...pagination, limit: parseInt(e.target.value), offset: 0 });
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px"
                                    }}
                                >
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                            </div>
                        </div>
                        {(filters.table_name || filters.record_id || filters.user_id) && (
                            <button
                                onClick={() => {
                                    setFilters({ table_name: "", record_id: "", user_id: "" });
                                    setPagination({ ...pagination, offset: 0 });
                                }}
                                style={{
                                    marginTop: "12px",
                                    padding: "8px 16px",
                                    backgroundColor: "#f3f4f6",
                                    color: "#374151",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer"
                                }}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: "12px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            color: "#dc2626",
                            fontSize: "14px",
                            marginBottom: "16px"
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    {/* Tabla de logs */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        overflow: "hidden"
                    }}>
                        {loading ? (
                            <div style={{
                                padding: "60px 20px",
                                textAlign: "center",
                                color: "#6b7280"
                            }}>
                                <div style={{
                                    width: "32px", height: "32px", border: "3px solid #e5e7eb",
                                    borderTop: "3px solid #10b981", borderRadius: "50%",
                                    animation: "spin 1s linear infinite", margin: "0 auto 16px"
                                }}></div>
                                Cargando logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div style={{
                                padding: "60px 20px",
                                textAlign: "center",
                                color: "#9ca3af"
                            }}>
                                No hay logs de auditoría que coincidan con los filtros
                            </div>
                        ) : (
                            <>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{
                                        width: "100%",
                                        borderCollapse: "collapse"
                                    }}>
                                        <thead>
                                            <tr style={{
                                                backgroundColor: "#f9fafb",
                                                borderBottom: "2px solid #e5e7eb"
                                            }}>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Fecha
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Acción
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Tabla
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Usuario
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Campos
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Detalle
                                                </th>
                                                <th style={{
                                                    padding: "12px 16px",
                                                    textAlign: "left",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151"
                                                }}>
                                                    Cambios
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log) => (
                                                <tr
                                                    key={log.id}
                                                    style={{
                                                        borderBottom: "1px solid #e5e7eb",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "white";
                                                    }}
                                                >
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "13px",
                                                        color: "#6b7280"
                                                    }}>
                                                        {formatDate(log.created_at)}
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "13px"
                                                    }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            backgroundColor: getActionColor(isLoginEvent(log) ? "LOGIN" : log.accion) + "20",
                                                            color: getActionColor(isLoginEvent(log) ? "LOGIN" : log.accion),
                                                            fontWeight: "600",
                                                            fontSize: "12px"
                                                        }}>
                                                            {getActionLabel(isLoginEvent(log) ? "LOGIN" : log.accion)}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "13px",
                                                        color: "#374151",
                                                        fontWeight: "500"
                                                    }}>
                                                        {log.tabla_afectada}
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "13px",
                                                        color: "#374151"
                                                    }}>
                                                        <div>
                                                            <div style={{ fontWeight: "500" }}>
                                                                {log.usuario_nombre || log.usuario_email || `Usuario #${log.usuario_id}`}
                                                            </div>
                                                            {log.usuario_email && (
                                                                <div style={{
                                                                    fontSize: "11px",
                                                                    color: "#9ca3af"
                                                                }}>
                                                                    {log.usuario_email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "12px",
                                                        color: "#374151"
                                                    }}>
                                                        {renderFieldList(log)}
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "12px",
                                                        color: "#374151",
                                                        maxWidth: "320px"
                                                    }}>
                                                        {getChangeSummary(log)}
                                                    </td>
                                                    <td style={{
                                                        padding: "12px 16px",
                                                        fontSize: "13px",
                                                        color: "#374151"
                                                    }}>
                                                        {log.cambios_detectados && Object.keys(log.cambios_detectados).length > 0 ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 8px",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#eff6ff",
                                                                color: "#1e40af",
                                                                fontSize: "12px",
                                                                fontWeight: "500"
                                                            }}>
                                                                {Object.keys(log.cambios_detectados).length} campo(s)
                                                            </span>
                                                        ) : log.accion === "CREATE" ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 8px",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#ecfdf5",
                                                                color: "#065f46",
                                                                fontSize: "12px",
                                                                fontWeight: "500"
                                                            }}>
                                                                Nuevo registro
                                                            </span>
                                                        ) : isLoginEvent(log) ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 8px",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#fff7ed",
                                                                color: "#9a3412",
                                                                fontSize: "12px",
                                                                fontWeight: "500"
                                                            }}>
                                                                Inicio de sesion
                                                            </span>
                                                        ) : log.accion === "PURCHASE" ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 8px",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#f0fdfa",
                                                                color: "#115e59",
                                                                fontSize: "12px",
                                                                fontWeight: "500"
                                                            }}>
                                                                Compra registrada
                                                            </span>
                                                        ) : log.accion === "SALE" ? (
                                                            <span style={{
                                                                display: "inline-block",
                                                                padding: "4px 8px",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#fff7ed",
                                                                color: "#9a3412",
                                                                fontSize: "12px",
                                                                fontWeight: "500"
                                                            }}>
                                                                Venta registrada
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#9ca3af" }}>-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                <div style={{
                                    padding: "16px",
                                    borderTop: "1px solid #e5e7eb",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: "12px"
                                }}>
                                    <div style={{
                                        fontSize: "13px",
                                        color: "#6b7280"
                                    }}>
                                        Mostrando {logs.length} resultado(s)
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        gap: "8px",
                                        alignItems: "center"
                                    }}>
                                        <button
                                            onClick={() => {
                                                if (pagination.offset > 0) {
                                                    setPagination({
                                                        ...pagination,
                                                        offset: Math.max(0, pagination.offset - pagination.limit)
                                                    });
                                                }
                                            }}
                                            disabled={pagination.offset === 0}
                                            style={{
                                                padding: "6px 12px",
                                                backgroundColor: pagination.offset === 0 ? "#f3f4f6" : "white",
                                                color: pagination.offset === 0 ? "#9ca3af" : "#374151",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "13px",
                                                cursor: pagination.offset === 0 ? "not-allowed" : "pointer",
                                                opacity: pagination.offset === 0 ? 0.5 : 1
                                            }}
                                        >
                                            ← Anterior
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPagination({
                                                    ...pagination,
                                                    offset: pagination.offset + pagination.limit
                                                });
                                            }}
                                            disabled={logs.length < pagination.limit}
                                            style={{
                                                padding: "6px 12px",
                                                backgroundColor: logs.length < pagination.limit ? "#f3f4f6" : "white",
                                                color: logs.length < pagination.limit ? "#9ca3af" : "#374151",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "13px",
                                                cursor: logs.length < pagination.limit ? "not-allowed" : "pointer",
                                                opacity: logs.length < pagination.limit ? 0.5 : 1
                                            }}
                                        >
                                            Siguiente →
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

