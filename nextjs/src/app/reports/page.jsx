"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { getApiUrl } from "../../utils/api-config";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
const API = getApiUrl();

const formatCLP = (v) => {
    try { return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0 }).format(Number(v) || 0); }
    catch { return String(v ?? 0); }
};

const SALUD_CONFIG = {
    "muy bien":     { label: "Muy bien",      color: "#10b981", bg: "#d1fae5" },
    "estable":      { label: "Estable",        color: "#3b82f6", bg: "#dbeafe" },
    "leve enfermo": { label: "Leve enfermo",   color: "#f59e0b", bg: "#fef3c7" },
    "enfermo":      { label: "Enfermo",        color: "#ef4444", bg: "#fee2e2" },
    "crítico":      { label: "Crítico",        color: "#991b1b", bg: "#fee2e2" },
};

const TAMAÑO_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
const TAMAÑO_COLORS = { XS: "#a78bfa", S: "#818cf8", M: "#3b82f6", L: "#06b6d4", XL: "#10b981", XXL: "#f59e0b" };

function KpiCard({ label, value, sub, color = "#111827", accent }) {
    return (
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderTop: `3px solid ${accent || "#e5e7eb"}` }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", fontWeight: 700, marginBottom: "8px" }}>{label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px" }}>{sub}</div>}
        </div>
    );
}

function BarRow({ label, count, total, color, subtitle }) {
    const pct = total > 0 ? (count / total * 100) : 0;
    return (
        <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{label}
                    {subtitle && <span style={{ color: "#9ca3af", fontWeight: 400 }}> — {subtitle}</span>}
                </span>
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>{count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pct.toFixed(1)}%)</span></span>
            </div>
            <div style={{ height: "7px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "4px", transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
}

function MonthlyChart({ data }) {
    if (!data.length) return null;
    const maxVal = Math.max(...data.map(d => Math.max(d.compras, d.ventas)), 1);
    return (
        <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", minWidth: `${data.length * 52}px`, height: "140px", paddingBottom: "4px" }}>
                {data.map(d => (
                    <div key={d.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "100px" }}>
                            <div title={`Compras: ${d.compras}`} style={{ width: "14px", height: `${(d.compras / maxVal) * 100}%`, minHeight: d.compras ? "3px" : 0, backgroundColor: "#10b981", borderRadius: "2px 2px 0 0", transition: "height 0.4s" }} />
                            <div title={`Ventas: ${d.ventas}`} style={{ width: "14px", height: `${(d.ventas / maxVal) * 100}%`, minHeight: d.ventas ? "3px" : 0, backgroundColor: "#ef4444", borderRadius: "2px 2px 0 0", transition: "height 0.4s" }} />
                        </div>
                        <span style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap" }}>{d.mes}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}><span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "#10b981", borderRadius: "2px", marginRight: "4px", verticalAlign: "middle" }} />Compras</span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}><span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "#ef4444", borderRadius: "2px", marginRight: "4px", verticalAlign: "middle" }} />Ventas</span>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const { user, loading, apiRequest: authApiRequest } = useAuth();
    const router = useRouter();
    const [ejemplares, setEjemplares] = useState([]);
    const [species, setSpecies] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!BYPASS_AUTH && !loading && !user) router.replace("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (BYPASS_AUTH || user) fetchAllData();
    }, [user]);

    const fetchAllData = async () => {
        try {
            setLoadingData(true);
            setError("");
            const [ejRes, spRes, secRes] = await Promise.all([
                authApiRequest(`${API}/ejemplar/staff?limit=2000`),
                authApiRequest(`${API}/species/staff`),
                authApiRequest(`${API}/sectors/staff`),
            ]);
            if (!ejRes.ok) throw new Error("Error al cargar ejemplares");

            const ejRaw = await ejRes.json();
            const spRaw = spRes.ok ? await spRes.json() : [];
            const secRaw = secRes.ok ? await secRes.json() : [];

            // El endpoint de ejemplares devuelve { data: [...], total: N }
            setEjemplares(Array.isArray(ejRaw) ? ejRaw : (ejRaw.data || []));
            setSpecies(Array.isArray(spRaw) ? spRaw : (spRaw.data || []));
            setSectors(Array.isArray(secRaw) ? secRaw : (secRaw.data || []));
        } catch (err) {
            setError(err.message || "Error al cargar datos");
        } finally {
            setLoadingData(false);
        }
    };

    const stats = useMemo(() => {
        const activos = ejemplares.filter(e => !e.sale_date);
        const vendidos = ejemplares.filter(e => e.sale_date);
        const conCompra = ejemplares.filter(e => e.purchase_date);

        const totalCompraValue = conCompra.reduce((s, e) => s + (Number(e.purchase_price) || 0), 0);
        const totalVentaValue = vendidos.reduce((s, e) => s + (Number(e.sale_price) || 0), 0);
        const comprasDeVendidos = vendidos.reduce((s, e) => s + (Number(e.purchase_price) || 0), 0);
        const margenBruto = totalVentaValue - comprasDeVendidos;
        const margenPct = comprasDeVendidos > 0 ? ((margenBruto / comprasDeVendidos) * 100).toFixed(1) : null;

        const precioPromCompra = conCompra.length ? totalCompraValue / conCompra.length : 0;
        const precioPromVenta = vendidos.length ? totalVentaValue / vendidos.length : 0;

        // Salud
        const porSalud = {};
        activos.forEach(e => {
            const k = e.health_status || "Sin especificar";
            porSalud[k] = (porSalud[k] || 0) + 1;
        });

        // Tamaño
        const porTamaño = {};
        activos.forEach(e => {
            if (e.tamaño) porTamaño[e.tamaño] = (porTamaño[e.tamaño] || 0) + 1;
        });

        // Vivero
        const porVivero = {};
        conCompra.forEach(e => {
            if (e.nursery) porVivero[e.nursery] = (porVivero[e.nursery] || 0) + 1;
        });

        // Especie
        const porEspecie = {};
        activos.forEach(e => {
            const sp = species.find(s => s.id === e.species_id);
            const nombre = sp?.scientific_name || `Especie ${e.species_id}`;
            porEspecie[nombre] = (porEspecie[nombre] || 0) + 1;
        });

        // Sector
        const porSector = {};
        activos.forEach(e => {
            if (e.sector_id) {
                const sec = sectors.find(s => s.id === e.sector_id);
                const nombre = sec?.name || `Sector ${e.sector_id}`;
                porSector[nombre] = (porSector[nombre] || 0) + 1;
            }
        });
        const enStandby = activos.filter(e => !e.sector_id).length;

        // Actividad mensual (últimos 12 meses)
        const ahora = new Date();
        const meses = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
            meses.push({
                mes: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                compras: 0,
                ventas: 0,
            });
        }
        ejemplares.forEach(e => {
            if (e.purchase_date) {
                const k = e.purchase_date.slice(0, 7);
                const m = meses.find(m => m.key === k);
                if (m) m.compras++;
            }
            if (e.sale_date) {
                const k = e.sale_date.slice(0, 7);
                const m = meses.find(m => m.key === k);
                if (m) m.ventas++;
            }
        });

        const saludCritica = (porSalud["crítico"] || 0) + (porSalud["enfermo"] || 0);

        return {
            total: ejemplares.length,
            activos: activos.length,
            vendidos: vendidos.length,
            totalCompraValue, totalVentaValue,
            margenBruto, margenPct,
            precioPromCompra, precioPromVenta,
            porSalud, porTamaño, porVivero, porEspecie, porSector,
            enStandby, saludCritica,
            meses,
        };
    }, [ejemplares, species, sectors]);

    if (loading || loadingData) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: "40px", height: "40px", border: "4px solid #e5e7eb", borderTop: "4px solid #8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                    <p style={{ color: "#9ca3af", fontSize: "14px" }}>Cargando estadísticas...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user && !BYPASS_AUTH) return null;

    const sectionStyle = { backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px" };
    const sectionTitle = { fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "16px", margin: "0 0 16px 0" };

    return (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>

                {/* Header */}
                <header style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Link href="/staff" style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e5e7eb", color: "#374151", textDecoration: "none", fontSize: "14px" }}>←</Link>
                            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Reportes y Estadísticas</h1>
                        </div>
                    </div>
                </header>

                <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>

                    {error && (
                        <div style={{ padding: "14px 16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", marginBottom: "20px", fontSize: "14px" }}>
                            {error}
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                        <KpiCard label="En inventario" value={stats.activos} sub={`de ${stats.total} históricos`} accent="#3b82f6" />
                        <KpiCard label="Vendidos" value={stats.vendidos} sub={`${stats.total > 0 ? ((stats.vendidos / stats.total) * 100).toFixed(0) : 0}% del total`} accent="#8b5cf6" />
                        <KpiCard label="Invertido en compras" value={`$${formatCLP(stats.totalCompraValue)}`} accent="#059669" color="#059669" />
                        <KpiCard label="Ingresos por ventas" value={`$${formatCLP(stats.totalVentaValue)}`} accent="#0284c7" color="#0284c7" />
                        <KpiCard
                            label="Margen bruto"
                            value={`${stats.margenBruto >= 0 ? "+" : ""}$${formatCLP(stats.margenBruto)}`}
                            sub={stats.margenPct !== null ? `${stats.margenPct}% sobre costo` : "Sin ventas aún"}
                            color={stats.margenBruto >= 0 ? "#059669" : "#dc2626"}
                            accent={stats.margenBruto >= 0 ? "#059669" : "#dc2626"}
                        />
                        <KpiCard
                            label="Alertas de salud"
                            value={stats.saludCritica}
                            sub={stats.saludCritica > 0 ? "crítico + enfermo" : "Todo en buen estado"}
                            color={stats.saludCritica > 0 ? "#dc2626" : "#059669"}
                            accent={stats.saludCritica > 0 ? "#dc2626" : "#059669"}
                        />
                    </div>

                    {/* Precios promedio */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                        <div style={{ ...sectionStyle, marginBottom: 0 }}>
                            <div style={{ fontSize: "12px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Precio promedio compra</div>
                            <div style={{ fontSize: "24px", fontWeight: 800, color: "#059669", margin: "4px 0" }}>${formatCLP(stats.precioPromCompra)}</div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>por ejemplar</div>
                        </div>
                        <div style={{ ...sectionStyle, marginBottom: 0 }}>
                            <div style={{ fontSize: "12px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Precio promedio venta</div>
                            <div style={{ fontSize: "24px", fontWeight: 800, color: "#0284c7", margin: "4px 0" }}>${formatCLP(stats.precioPromVenta)}</div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>por ejemplar</div>
                        </div>
                    </div>

                    {/* Actividad mensual */}
                    <div style={sectionStyle}>
                        <h2 style={sectionTitle}>Actividad mensual — últimos 12 meses</h2>
                        <MonthlyChart data={stats.meses} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>

                        {/* Salud del inventario activo */}
                        <div style={sectionStyle}>
                            <h2 style={sectionTitle}>Estado de salud — inventario activo</h2>
                            {Object.entries(stats.porSalud).length === 0
                                ? <p style={{ color: "#9ca3af", fontSize: "13px" }}>Sin datos</p>
                                : Object.entries(stats.porSalud)
                                    .sort((a, b) => {
                                        const order = ["muy bien", "estable", "leve enfermo", "enfermo", "crítico"];
                                        return order.indexOf(a[0]) - order.indexOf(b[0]);
                                    })
                                    .map(([k, v]) => (
                                        <BarRow key={k} label={SALUD_CONFIG[k]?.label || k} count={v} total={stats.activos} color={SALUD_CONFIG[k]?.color || "#9ca3af"} />
                                    ))
                            }
                        </div>

                        {/* Tamaño */}
                        <div style={sectionStyle}>
                            <h2 style={sectionTitle}>Distribución por tamaño</h2>
                            {Object.keys(stats.porTamaño).length === 0
                                ? <p style={{ color: "#9ca3af", fontSize: "13px" }}>Sin datos de tamaño</p>
                                : TAMAÑO_ORDER.filter(t => stats.porTamaño[t]).map(t => (
                                    <BarRow key={t} label={t} count={stats.porTamaño[t]} total={stats.activos} color={TAMAÑO_COLORS[t] || "#6b7280"} />
                                ))
                            }
                            {stats.enStandby > 0 && (
                                <div style={{ marginTop: "12px", padding: "8px 12px", backgroundColor: "#fef9c3", borderRadius: "6px", fontSize: "13px", color: "#92400e" }}>
                                    {stats.enStandby} ejemplar{stats.enStandby !== 1 ? "es" : ""} en Standby (sin sector asignado)
                                </div>
                            )}
                        </div>

                        {/* Top viveros */}
                        {Object.keys(stats.porVivero).length > 0 && (
                            <div style={sectionStyle}>
                                <h2 style={sectionTitle}>Viveros de origen</h2>
                                {Object.entries(stats.porVivero)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 8)
                                    .map(([v, c]) => (
                                        <BarRow key={v} label={v} count={c} total={ejemplares.filter(e => e.purchase_date).length} color="#06b6d4" />
                                    ))
                                }
                            </div>
                        )}

                        {/* Sectores */}
                        <div style={sectionStyle}>
                            <h2 style={sectionTitle}>Distribución por sector</h2>
                            {Object.entries(stats.porSector).length === 0
                                ? <p style={{ color: "#9ca3af", fontSize: "13px" }}>Sin datos de sectores</p>
                                : Object.entries(stats.porSector)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([s, c]) => (
                                        <BarRow key={s} label={s} count={c} total={stats.activos} color="#f59e0b" />
                                    ))
                            }
                        </div>

                        {/* Top 10 especies */}
                        <div style={{ ...sectionStyle, gridColumn: "1 / -1" }}>
                            <h2 style={sectionTitle}>Top especies en inventario activo</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 32px" }}>
                                {Object.entries(stats.porEspecie)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 14)
                                    .map(([e, c]) => (
                                        <BarRow key={e} label={e} count={c} total={stats.activos} color="#8b5cf6" />
                                    ))
                                }
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </>
    );
}
