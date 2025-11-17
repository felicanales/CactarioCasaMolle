"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiUrl } from "../../utils/api-config";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

export default function ReportsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [ejemplares, setEjemplares] = useState([]);
    const [species, setSpecies] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (BYPASS_AUTH) return;
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (BYPASS_AUTH || user) {
            fetchAllData();
        }
    }, [user]);

    // Usar configuración centralizada de API URL

    const apiRequest = async (url, options = {}) => {
        const API = getApiUrl();
        const fullUrl = url.startsWith("http") ? url : `${API}${url}`;

        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };

        if (user?.access_token) {
            headers.Authorization = `Bearer ${user.access_token}`;
        }

        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers
            });
            return response;
        } catch (err) {
            throw new Error(`Error de red: ${err.message}`);
        }
    };

    const fetchAllData = async () => {
        try {
            setLoadingData(true);
            setError("");

            const [ejemplaresRes, speciesRes, sectorsRes] = await Promise.all([
                apiRequest("/ejemplar/staff"),
                apiRequest("/species/staff"),
                apiRequest("/sectors/staff")
            ]);

            if (!ejemplaresRes.ok || !speciesRes.ok || !sectorsRes.ok) {
                throw new Error("Error al cargar datos");
            }

            const ejemplaresData = await ejemplaresRes.json();
            const speciesData = await speciesRes.json();
            const sectorsData = await sectorsRes.json();

            setEjemplares(Array.isArray(ejemplaresData) ? ejemplaresData : []);
            setSpecies(Array.isArray(speciesData) ? speciesData : []);
            setSectors(Array.isArray(sectorsData) ? sectorsData : []);
        } catch (err) {
            setError(err.message || "Error al cargar datos");
        } finally {
            setLoadingData(false);
        }
    };

    // Cálculos de estadísticas
    const stats = {
        totalEjemplares: ejemplares.length,
        totalCompras: ejemplares.filter(e => e.purchase_date).length,
        totalVentas: ejemplares.filter(e => e.sale_date).length,
        totalCompraValue: ejemplares.reduce((sum, e) => sum + (e.purchase_price || 0), 0),
        totalVentaValue: ejemplares.reduce((sum, e) => sum + (e.sale_price || 0), 0),
        rentabilidad: 0,
        porSalud: {},
        porEspecie: {},
        porSector: {},
        saludCritica: ejemplares.filter(e => e.health_status === "crítico" || e.health_status === "enfermo").length
    };

    stats.rentabilidad = stats.totalVentaValue - stats.totalCompraValue;

    ejemplares.forEach(ej => {
        const salud = ej.health_status || "Sin especificar";
        stats.porSalud[salud] = (stats.porSalud[salud] || 0) + 1;

        const especieId = ej.species_id;
        if (especieId) {
            const especie = species.find(s => s.id === especieId);
            const nombreEspecie = especie?.scientific_name || `Especie ${especieId}`;
            stats.porEspecie[nombreEspecie] = (stats.porEspecie[nombreEspecie] || 0) + 1;
        }

        const sectorId = ej.sector_id;
        if (sectorId) {
            const sector = sectors.find(s => s.id === sectorId);
            const nombreSector = sector?.name || `Sector ${sectorId}`;
            stats.porSector[nombreSector] = (stats.porSector[nombreSector] || 0) + 1;
        }
    });

    const formatCLP = (value) => {
        try {
            const num = Number(value) || 0;
            return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
        } catch {
            return String(value ?? 0);
        }
    };

    if (loading || loadingData) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: "48px", height: "48px", border: "4px solid #e5e7eb", borderTop: "4px solid #8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                    <p style={{ color: "#6b7280" }}>Cargando reportes...</p>
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
                <header style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "12px clamp(12px, 4vw, 24px)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                            <Link href="/staff" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #e5e7eb", backgroundColor: "white", color: "#374151", textDecoration: "none", fontSize: "14px", transition: "all 0.2s", flexShrink: 0 }}>
                                ←
                            </Link>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: "700", color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    Reportes y Estadísticas
                                </h1>
                            </div>
                        </div>
                        <button onClick={logout} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #e5e7eb", backgroundColor: "white", color: "#374151", fontSize: "14px", cursor: "pointer", transition: "all 0.2s" }}>
                            Cerrar Sesión
                        </button>
                    </div>
                </header>

                <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px clamp(12px, 4vw, 24px)" }}>
                    {error && (
                        <div style={{ padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", marginBottom: "24px" }}>
                            {error}
                        </div>
                    )}

                    {/* Tarjetas de Resumen */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700, marginBottom: "8px" }}>Total Ejemplares</div>
                            <div style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>{stats.totalEjemplares}</div>
                        </div>
                        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700, marginBottom: "8px" }}>Compras</div>
                            <div style={{ fontSize: "32px", fontWeight: 800, color: "#059669" }}>{stats.totalCompras}</div>
                            <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>CLP {formatCLP(stats.totalCompraValue)}</div>
                        </div>
                        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700, marginBottom: "8px" }}>Ventas</div>
                            <div style={{ fontSize: "32px", fontWeight: 800, color: "#dc2626" }}>{stats.totalVentas}</div>
                            <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>CLP {formatCLP(stats.totalVentaValue)}</div>
                        </div>
                        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700, marginBottom: "8px" }}>Rentabilidad</div>
                            <div style={{ fontSize: "32px", fontWeight: 800, color: stats.rentabilidad >= 0 ? "#059669" : "#dc2626" }}>
                                {stats.rentabilidad >= 0 ? "+" : ""}CLP {formatCLP(stats.rentabilidad)}
                            </div>
                        </div>
                        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", fontWeight: 700, marginBottom: "8px" }}>Salud Crítica</div>
                            <div style={{ fontSize: "32px", fontWeight: 800, color: stats.saludCritica > 0 ? "#dc2626" : "#059669" }}>{stats.saludCritica}</div>
                            <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>requieren atención</div>
                        </div>
                    </div>

                    {/* Distribución por Estado de Salud */}
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "20px" }}>Distribución por Estado de Salud</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {Object.entries(stats.porSalud).sort((a, b) => b[1] - a[1]).map(([salud, count]) => {
                                const porcentaje = stats.totalEjemplares > 0 ? (count / stats.totalEjemplares * 100).toFixed(1) : 0;
                                const saludLabels = {
                                    "muy bien": "Muy bien",
                                    "estable": "Estable",
                                    "leve enfermo": "Leve enfermo",
                                    "enfermo": "Enfermo",
                                    "crítico": "Crítico",
                                    "Sin especificar": "Sin especificar"
                                };
                                return (
                                    <div key={salud}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>{saludLabels[salud] || salud}</span>
                                            <span style={{ fontSize: "14px", color: "#6b7280" }}>{count} ({porcentaje}%)</span>
                                        </div>
                                        <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                                            <div style={{ width: `${porcentaje}%`, height: "100%", backgroundColor: salud === "muy bien" ? "#10b981" : salud === "estable" ? "#3b82f6" : salud === "leve enfermo" ? "#f59e0b" : "#ef4444", transition: "width 0.3s" }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Distribución por Especie */}
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "20px" }}>Top 10 Especies</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {Object.entries(stats.porEspecie).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([especie, count]) => {
                                const porcentaje = stats.totalEjemplares > 0 ? (count / stats.totalEjemplares * 100).toFixed(1) : 0;
                                return (
                                    <div key={especie} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: "14px", color: "#374151", fontStyle: "italic" }}>{especie}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "120px", height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                                                <div style={{ width: `${porcentaje}%`, height: "100%", backgroundColor: "#8b5cf6" }}></div>
                                            </div>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", minWidth: "60px", textAlign: "right" }}>{count}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Distribución por Sector */}
                    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "20px" }}>Distribución por Sector</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {Object.entries(stats.porSector).sort((a, b) => b[1] - a[1]).map(([sector, count]) => {
                                const porcentaje = stats.totalEjemplares > 0 ? (count / stats.totalEjemplares * 100).toFixed(1) : 0;
                                return (
                                    <div key={sector} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                                        <span style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>{sector}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "120px", height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                                                <div style={{ width: `${porcentaje}%`, height: "100%", backgroundColor: "#f59e0b" }}></div>
                                            </div>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280", minWidth: "60px", textAlign: "right" }}>{count}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

