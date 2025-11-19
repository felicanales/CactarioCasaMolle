"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "../../utils/api-config";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const API = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export default function AuditLogsPage() {
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
        limit: 100,
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

            const url = `${API}/audit/logs?${params.toString()}`;
            const res = await authApiRequest(url, { method: 'GET' });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error al cargar logs (${res.status})`);
            }

            const data = await res.json();
            setLogs(data.logs || []);
        } catch (err) {
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

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleString('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return '#10b981'; // verde
            case 'UPDATE': return '#3b82f6'; // azul
            case 'DELETE': return '#ef4444'; // rojo
            default: return '#6b7280';
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case 'CREATE': return 'Crear';
            case 'UPDATE': return 'Actualizar';
            case 'DELETE': return 'Eliminar';
            default: return action;
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
                            <div style={{ minWidth: 0 }}>
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
                                    Historial de cambios realizados en el sistema
                                </p>
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
                        <h3 style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "16px"
                        }}>
                            🔍 Filtros
                        </h3>
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
                                    onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        backgroundColor: "white"
                                    }}
                                >
                                    <option value="">Todas las tablas</option>
                                    <option value="especies">Especies</option>
                                    <option value="sectores">Sectores</option>
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
                                    onChange={(e) => setFilters({ ...filters, record_id: e.target.value })}
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
                                    onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
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
                            <div style={{
                                display: "flex",
                                alignItems: "flex-end"
                            }}>
                                <button
                                    onClick={() => {
                                        setFilters({ table_name: "", record_id: "", user_id: "" });
                                        setPagination({ limit: 100, offset: 0 });
                                    }}
                                    style={{
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
                                    Limpiar
                                </button>
                            </div>
                        </div>
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
                            {error}
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
                                    width: "48px", height: "48px", border: "4px solid #e5e7eb",
                                    borderTop: "4px solid #10b981", borderRadius: "50%",
                                    animation: "spin 1s linear infinite", margin: "0 auto 16px"
                                }}></div>
                                Cargando logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div style={{
                                padding: "60px 20px",
                                textAlign: "center",
                                color: "#6b7280"
                            }}>
                                No hay logs de auditoría que coincidan con los filtros
                            </div>
                        ) : (
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
                                                ID Registro
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
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        backgroundColor: getActionColor(log.accion) + "20",
                                                        color: getActionColor(log.accion),
                                                        fontWeight: "600",
                                                        fontSize: "12px"
                                                    }}>
                                                        {getActionLabel(log.accion)}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    padding: "12px 16px",
                                                    fontSize: "13px",
                                                    color: "#111827",
                                                    fontWeight: "500"
                                                }}>
                                                    {log.tabla_afectada}
                                                </td>
                                                <td style={{
                                                    padding: "12px 16px",
                                                    fontSize: "13px",
                                                    color: "#6b7280"
                                                }}>
                                                    {log.registro_id}
                                                </td>
                                                <td style={{
                                                    padding: "12px 16px",
                                                    fontSize: "13px"
                                                }}>
                                                    <div>
                                                        <div style={{
                                                            color: "#111827",
                                                            fontWeight: "500"
                                                        }}>
                                                            {log.usuario_nombre || log.usuario_email || `Usuario ${log.usuario_id || 'N/A'}`}
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
                                                    fontSize: "13px"
                                                }}>
                                                    {log.cambios_detectados ? (
                                                        <div style={{
                                                            color: "#3b82f6",
                                                            fontWeight: "500"
                                                        }}>
                                                            {Object.keys(log.cambios_detectados).length} campo(s)
                                                        </div>
                                                    ) : log.accion === 'CREATE' ? (
                                                        <span style={{ color: "#10b981" }}>Registro creado</span>
                                                    ) : (
                                                        <span style={{ color: "#6b7280" }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Paginación */}
                    {!loading && logs.length > 0 && (
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "16px",
                            padding: "12px",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "13px", color: "#6b7280" }}>
                                Mostrando {logs.length} resultado(s)
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    onClick={() => setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })}
                                    disabled={pagination.offset === 0}
                                    style={{
                                        padding: "6px 12px",
                                        backgroundColor: pagination.offset === 0 ? "#f3f4f6" : "white",
                                        color: pagination.offset === 0 ? "#9ca3af" : "#374151",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: pagination.offset === 0 ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPagination({ ...pagination, offset: pagination.offset + pagination.limit })}
                                    disabled={logs.length < pagination.limit}
                                    style={{
                                        padding: "6px 12px",
                                        backgroundColor: logs.length < pagination.limit ? "#f3f4f6" : "white",
                                        color: logs.length < pagination.limit ? "#9ca3af" : "#374151",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: logs.length < pagination.limit ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

