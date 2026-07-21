"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "../../utils/api-config";

const API = getApiUrl();
const IVA_RATE = 0.19;

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
                    maxWidth: '900px',
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

function formatCurrency(amount) {
    if (!amount || amount === 0) return "$0";
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

async function getApiErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        if (typeof data?.detail === "string" && data.detail.trim()) {
            return data.detail;
        }
    } catch {
    }
    return fallback;
}

// Estilos reutilizables para inputs de los modales
const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
};
const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151'
};

function primaryButton(disabled) {
    return {
        padding: '10px 18px',
        backgroundColor: disabled ? '#9ca3af' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer'
    };
}
function secondaryButton() {
    return {
        padding: '10px 18px',
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer'
    };
}

// ============================================================
// Modal: Ingreso de compra (factura) — 2 pasos
// ============================================================
function FacturaModal({ isOpen, onClose, onSaved, apiRequest, accessToken, nurseries }) {
    const [step, setStep] = useState(1); // 1 = editar, 2 = revisar
    const [nursery, setNursery] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [net, setNet] = useState("");
    const [iva, setIva] = useState("");
    const [total, setTotal] = useState("");
    const [ivaTouched, setIvaTouched] = useState(false);
    const [totalTouched, setTotalTouched] = useState(false);
    const [doc, setDoc] = useState(null); // { document_path, document_url, document_name, document_content_type }
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const reset = useCallback(() => {
        setStep(1);
        setNursery("");
        setInvoiceNumber("");
        setIssueDate("");
        setNet("");
        setIva("");
        setTotal("");
        setIvaTouched(false);
        setTotalTouched(false);
        setDoc(null);
        setUploading(false);
        setSaving(false);
        setError("");
    }, []);

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen, reset]);

    const recalc = (netValue, ivaValue, ivaWasTouched, totalWasTouched) => {
        const netNum = parseFloat(netValue) || 0;
        let ivaNum = ivaValue;
        if (!ivaWasTouched) {
            ivaNum = netNum ? Math.round(netNum * IVA_RATE) : "";
            setIva(ivaNum === "" ? "" : String(ivaNum));
        }
        if (!totalWasTouched) {
            const ivaForTotal = parseFloat(ivaWasTouched ? ivaValue : ivaNum) || 0;
            const totalNum = netNum + ivaForTotal;
            setTotal(totalNum ? String(totalNum) : "");
        }
    };

    const handleNetChange = (v) => {
        setNet(v);
        recalc(v, iva, ivaTouched, totalTouched);
    };
    const handleIvaChange = (v) => {
        setIva(v);
        setIvaTouched(true);
        if (!totalTouched) {
            const totalNum = (parseFloat(net) || 0) + (parseFloat(v) || 0);
            setTotal(totalNum ? String(totalNum) : "");
        }
    };
    const handleTotalChange = (v) => {
        setTotal(v);
        setTotalTouched(true);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isValid = file.type.startsWith("image/") || file.type === "application/pdf";
        if (!isValid) {
            setError("El documento debe ser una imagen o un PDF");
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setError("El documento es demasiado grande (máx 15MB)");
            return;
        }

        setError("");
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const headers = {};
            if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

            const res = await fetch(`${API}/transactions/purchases/document`, {
                method: "POST",
                headers,
                body: formData,
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error(await getApiErrorMessage(res, "Error al subir el documento"));
            }
            const data = await res.json();
            setDoc(data);
        } catch (err) {
            setError(err.message || "Error al subir el documento");
        } finally {
            setUploading(false);
        }
    };

    const goReview = () => {
        if (!nursery.trim()) {
            setError("El vivero es obligatorio");
            return;
        }
        setError("");
        setStep(2);
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const payload = {
                nursery: nursery.trim(),
                invoice_number: invoiceNumber.trim() || null,
                issue_date: issueDate || null,
                net_amount: net === "" ? null : Number(net),
                tax_amount: iva === "" ? null : Number(iva),
                total_amount: total === "" ? null : Number(total),
                document_path: doc?.document_path || null,
                document_name: doc?.document_name || null,
                document_content_type: doc?.document_content_type || null,
            };

            const res = await apiRequest(`${API}/transactions/purchases`, {
                method: "POST",
                body: JSON.stringify(payload),
            }, accessToken);

            if (!res.ok) {
                throw new Error(await getApiErrorMessage(res, "Error al guardar la factura"));
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Error al guardar la factura");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? "Ingreso de compra — Factura" : "Revisar factura"}>
            {error && (
                <div style={{
                    padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: "8px", color: "#dc2626", marginBottom: "16px", fontSize: "14px"
                }}>
                    {error}
                </div>
            )}

            {step === 1 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label style={labelStyle}>Vivero (quien vende) *</label>
                        <input
                            list="nurseries-list"
                            value={nursery}
                            onChange={(e) => setNursery(e.target.value)}
                            placeholder="Nombre del vivero / proveedor"
                            style={inputStyle}
                        />
                        <datalist id="nurseries-list">
                            {(nurseries || []).map((n) => <option key={n} value={n} />)}
                        </datalist>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={labelStyle}>N° de factura</label>
                            <input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="Ej: 12345"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Fecha de emisión</label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={labelStyle}>Monto neto</label>
                            <input
                                type="number" min="0" step="1"
                                value={net}
                                onChange={(e) => handleNetChange(e.target.value)}
                                placeholder="0"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>IVA (19% auto)</label>
                            <input
                                type="number" min="0" step="1"
                                value={iva}
                                onChange={(e) => handleIvaChange(e.target.value)}
                                placeholder="0"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Monto total</label>
                            <input
                                type="number" min="0" step="1"
                                value={total}
                                onChange={(e) => handleTotalChange(e.target.value)}
                                placeholder="0"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Adjuntar factura (imagen o PDF)</label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            disabled={uploading}
                            style={inputStyle}
                        />
                        {uploading && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#6b7280" }}>⏳ Subiendo documento...</p>}
                        {doc && (
                            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#16a34a" }}>
                                ✓ Documento adjunto:{" "}
                                <a href={doc.document_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 600 }}>
                                    {doc.document_name || "ver documento"}
                                </a>
                            </p>
                        )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                        <button onClick={onClose} style={secondaryButton()}>Cancelar</button>
                        <button onClick={goReview} disabled={uploading} style={primaryButton(uploading)}>
                            Revisar →
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                        Verifica los datos antes de guardar. Puedes volver a corregir.
                    </p>
                    <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                            <div><span style={{ color: "#6b7280" }}>Vivero: </span><strong>{nursery || "-"}</strong></div>
                            <div><span style={{ color: "#6b7280" }}>N° factura: </span><strong>{invoiceNumber || "-"}</strong></div>
                            <div><span style={{ color: "#6b7280" }}>Fecha emisión: </span><strong>{issueDate ? formatDate(issueDate) : "-"}</strong></div>
                            <div><span style={{ color: "#6b7280" }}>Neto: </span><strong>{formatCurrency(Number(net) || 0)}</strong></div>
                            <div><span style={{ color: "#6b7280" }}>IVA: </span><strong>{formatCurrency(Number(iva) || 0)}</strong></div>
                            <div><span style={{ color: "#6b7280" }}>Total: </span><strong style={{ color: "#111827" }}>{formatCurrency(Number(total) || 0)}</strong></div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <span style={{ color: "#6b7280" }}>Documento: </span>
                                {doc ? (
                                    <a href={doc.document_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 600 }}>
                                        {doc.document_name || "ver documento"}
                                    </a>
                                ) : <strong>sin adjuntar</strong>}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "8px" }}>
                        <button onClick={() => setStep(1)} style={secondaryButton()}>← Corregir</button>
                        <button onClick={handleSave} disabled={saving} style={primaryButton(saving)}>
                            {saving ? "Guardando..." : "Guardar factura"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ============================================================
// Modal: Venta de cactus
// ============================================================
function SaleModal({ isOpen, onClose, onSaved, apiRequest, accessToken }) {
    const [search, setSearch] = useState("");
    const [ejemplares, setEjemplares] = useState([]);
    const [selected, setSelected] = useState({}); // { id: true }
    const [saleDate, setSaleDate] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const reset = useCallback(() => {
        setSearch("");
        setEjemplares([]);
        setSelected({});
        setSaleDate("");
        setSalePrice("");
        setLoading(false);
        setSaving(false);
        setError("");
    }, []);

    const loadEjemplares = useCallback(async (q) => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            params.set("limit", "200");
            const res = await apiRequest(`${API}/ejemplar/staff?${params}`, {}, accessToken);
            if (!res.ok) throw new Error(await getApiErrorMessage(res, "Error al cargar ejemplares"));
            const data = await res.json();
            const rows = Array.isArray(data?.data) ? data.data : [];
            // Solo ejemplares disponibles (sin venta registrada)
            setEjemplares(rows.filter((e) => !e.sale_date));
        } catch (err) {
            setError(err.message || "Error al cargar ejemplares");
        } finally {
            setLoading(false);
        }
    }, [apiRequest, accessToken]);

    useEffect(() => {
        if (isOpen) {
            reset();
            loadEjemplares("");
        }
    }, [isOpen, reset, loadEjemplares]);

    const toggle = (id) => {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id]; else next[id] = true;
            return next;
        });
    };

    const selectedIds = Object.keys(selected).map(Number);

    const handleSubmitSearch = (e) => {
        e.preventDefault();
        loadEjemplares(search.trim());
    };

    const handleSave = async () => {
        if (selectedIds.length === 0) {
            setError("Selecciona al menos un ejemplar");
            return;
        }
        if (!saleDate) {
            setError("La fecha de venta es obligatoria");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const payload = {
                ejemplar_ids: selectedIds,
                sale_date: saleDate,
                sale_price: salePrice === "" ? null : Number(salePrice),
            };
            const res = await apiRequest(`${API}/transactions/sales`, {
                method: "POST",
                body: JSON.stringify(payload),
            }, accessToken);
            if (!res.ok) throw new Error(await getApiErrorMessage(res, "Error al registrar la venta"));
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || "Error al registrar la venta");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Venta de cactus">
            {error && (
                <div style={{
                    padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: "8px", color: "#dc2626", marginBottom: "16px", fontSize: "14px"
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                        <label style={labelStyle}>Fecha de venta *</label>
                        <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Precio de venta (por ejemplar)</label>
                        <input type="number" min="0" step="1" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0" style={inputStyle} />
                    </div>
                </div>

                <form onSubmit={handleSubmitSearch} style={{ display: "flex", gap: "8px" }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar ejemplar (especie, sector, vivero, ID...)"
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="submit" style={secondaryButton()}>Buscar</button>
                </form>

                <div>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>
                        {selectedIds.length} seleccionado{selectedIds.length !== 1 ? "s" : ""} · {ejemplares.length} disponible{ejemplares.length !== 1 ? "s" : ""}
                    </p>
                    <div style={{ maxHeight: "320px", overflow: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                        {loading ? (
                            <p style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>Cargando...</p>
                        ) : ejemplares.length === 0 ? (
                            <p style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No hay ejemplares disponibles</p>
                        ) : (
                            ejemplares.map((ej) => {
                                const especie = ej.especies || {};
                                const sector = ej.sectores || {};
                                const isChecked = !!selected[ej.id];
                                return (
                                    <label
                                        key={ej.id}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "12px",
                                            padding: "10px 14px", borderBottom: "1px solid #f3f4f6",
                                            cursor: "pointer", backgroundColor: isChecked ? "#eff6ff" : "white"
                                        }}
                                    >
                                        <input type="checkbox" checked={isChecked} onChange={() => toggle(ej.id)} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                                                {especie.scientific_name || `Ejemplar #${ej.id}`}
                                            </p>
                                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                #{ej.id}
                                                {especie["nombre_común"] ? ` · ${especie["nombre_común"]}` : ""}
                                                {sector.name ? ` · ${sector.name}` : ""}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button onClick={onClose} style={secondaryButton()}>Cancelar</button>
                    <button onClick={handleSave} disabled={saving || selectedIds.length === 0} style={primaryButton(saving || selectedIds.length === 0)}>
                        {saving ? "Registrando..." : `Registrar venta (${selectedIds.length})`}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default function TransactionsPage() {
    const { user, loading: authLoading, accessToken, apiRequest } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("purchases"); // "purchases" o "sales"
    const [purchases, setPurchases] = useState([]); // facturas
    const [sales, setSales] = useState([]);
    const [nurseries, setNurseries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showFacturaModal, setShowFacturaModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [purchasesRes, salesRes] = await Promise.all([
                apiRequest(`${API}/transactions/purchases`, {}, accessToken),
                apiRequest(`${API}/transactions/sales`, {}, accessToken),
            ]);

            if (!purchasesRes.ok) {
                throw new Error(await getApiErrorMessage(purchasesRes, "Error al cargar compras"));
            }
            if (!salesRes.ok) {
                throw new Error(await getApiErrorMessage(salesRes, "Error al cargar ventas"));
            }

            const [purchasesData, salesData] = await Promise.all([
                purchasesRes.json(),
                salesRes.json(),
            ]);

            setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
            setSales(Array.isArray(salesData) ? salesData : []);
        } catch (err) {
            console.error('[TransactionsPage] Error:', err);
            setError(err.message || "Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, [apiRequest, accessToken]);

    const fetchNurseries = useCallback(async () => {
        try {
            const res = await apiRequest(`${API}/ejemplar/staff/nurseries`, {}, accessToken);
            if (res.ok) {
                const data = await res.json();
                setNurseries(Array.isArray(data) ? data : []);
            }
        } catch {
            // silencioso: el autocompletado de viveros es opcional
        }
    }, [apiRequest, accessToken]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        // En producción el token puede vivir solo en cookie HttpOnly.
        // apiRequest ya envía las cookies y agrega el Authorization disponible.
        if (user) {
            fetchData();
            fetchNurseries();
        }
    }, [user, accessToken, fetchData, fetchNurseries]);

    const handleTransactionClick = (transaction) => {
        setSelectedTransaction(transaction);
        setShowModal(true);
    };

    if (authLoading || loading) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const transactions = activeTab === "purchases" ? purchases : sales;
    const purchasesAmount = purchases.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
    const salesAmount = sales.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const salesQuantity = sales.reduce((sum, t) => sum + (t.total_quantity || 0), 0);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
            {/* Header */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "1px solid #e5e7eb",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Link
                        href="/staff"
                        style={{
                            padding: "8px 10px",
                            backgroundColor: "white",
                            color: "#374151",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "700",
                            lineHeight: 1
                        }}
                        title="Volver a módulos"
                    >
                        ←
                    </Link>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                        Compras y Ventas
                    </h1>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <button
                        onClick={() => setShowFacturaModal(true)}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#059669",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        ＋ Ingreso de compra
                    </button>
                    <button
                        onClick={() => setShowSaleModal(true)}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Venta de cactus
                    </button>
                    <Link
                        href="/inventory"
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: "600"
                        }}
                    >
                        Ir a Inventario
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                backgroundColor: "white",
                padding: "0 24px",
                display: "flex",
                gap: "8px"
            }}>
                <button
                    onClick={() => setActiveTab("purchases")}
                    style={{
                        padding: "12px 24px",
                        border: "none",
                        borderBottom: activeTab === "purchases" ? "2px solid #3b82f6" : "2px solid transparent",
                        backgroundColor: "transparent",
                        color: activeTab === "purchases" ? "#3b82f6" : "#6b7280",
                        fontSize: "14px",
                        fontWeight: activeTab === "purchases" ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Compras ({purchases.length})
                </button>
                <button
                    onClick={() => setActiveTab("sales")}
                    style={{
                        padding: "12px 24px",
                        border: "none",
                        borderBottom: activeTab === "sales" ? "2px solid #3b82f6" : "2px solid transparent",
                        backgroundColor: "transparent",
                        color: activeTab === "sales" ? "#3b82f6" : "#6b7280",
                        fontSize: "14px",
                        fontWeight: activeTab === "sales" ? "600" : "500",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Ventas ({sales.length})
                </button>
            </div>

            {/* Content */}
            <div style={{ padding: "24px" }}>
                {error && (
                    <div style={{
                        padding: "12px 16px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        color: "#dc2626",
                        marginBottom: "20px"
                    }}>
                        {error}
                    </div>
                )}

                {/* Marcadores */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px"
                }}>
                    <div style={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: 700 }}>
                                Compras
                            </p>
                            <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "#111827" }}>
                                {formatCurrency(purchasesAmount)}
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#059669", fontWeight: 700 }}>
                                {purchases.length} factura{purchases.length === 1 ? "" : "s"}
                            </p>
                        </div>
                        <div aria-hidden style={{
                            width: 44,
                            height: 44,
                            borderRadius: 9999,
                            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#065f46",
                            fontWeight: 800,
                            flexShrink: 0
                        }}>
                            C
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", textTransform: "uppercase", fontWeight: 700 }}>
                                Ventas
                            </p>
                            <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "#111827" }}>
                                {formatCurrency(salesAmount)}
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#dc2626", fontWeight: 700 }}>
                                {salesQuantity} ejemplar{salesQuantity === 1 ? "" : "es"}
                            </p>
                        </div>
                        <div aria-hidden style={{
                            width: 44,
                            height: 44,
                            borderRadius: 9999,
                            background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#991b1b",
                            fontWeight: 800,
                            flexShrink: 0
                        }}>
                            V
                        </div>
                    </div>
                </div>

                {/* Lista */}
                {transactions.length === 0 ? (
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "40px",
                        textAlign: "center",
                        border: "1px solid #e5e7eb"
                    }}>
                        <p style={{ color: "#6b7280", fontSize: "16px" }}>
                            No hay {activeTab === "purchases" ? "facturas de compra" : "ventas"} registradas
                        </p>
                    </div>
                ) : activeTab === "purchases" ? (
                    /* ---- Lista de FACTURAS ---- */
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {purchases.map((factura) => (
                            <div
                                key={factura.id}
                                onClick={() => handleTransactionClick(factura)}
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: "8px",
                                    padding: "20px",
                                    border: "1px solid #e5e7eb",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "16px"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "#3b82f6";
                                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
                                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>
                                            {factura.nursery || "Sin vivero"}
                                        </h3>
                                        {factura.invoice_number && (
                                            <span style={{
                                                padding: "4px 8px",
                                                backgroundColor: "#eff6ff",
                                                color: "#1e40af",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "600"
                                            }}>
                                                N° {factura.invoice_number}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b7280", flexWrap: "wrap" }}>
                                        <span>{formatDate(factura.issue_date)}</span>
                                        <span>Neto: {formatCurrency(Number(factura.net_amount) || 0)}</span>
                                        <span>IVA: {formatCurrency(Number(factura.tax_amount) || 0)}</span>
                                        {factura.document_url && (
                                            <a
                                                href={factura.document_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                                            >
                                                📄 Abrir documento
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                                        {formatCurrency(Number(factura.total_amount) || 0)}
                                    </p>
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                        Total factura
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ---- Lista de VENTAS (agrupada) ---- */
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {sales.map((transaction, index) => (
                            <div
                                key={index}
                                onClick={() => handleTransactionClick(transaction)}
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: "8px",
                                    padding: "20px",
                                    border: "1px solid #e5e7eb",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "#3b82f6";
                                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "#e5e7eb";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>
                                            {formatDate(transaction.sale_date)}
                                        </h3>
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b7280" }}>
                                        <span>{transaction.total_quantity} ejemplar{transaction.total_quantity !== 1 ? 'es' : ''}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                                        {formatCurrency(transaction.total_amount)}
                                    </p>
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                        {transaction.items?.length || 0} especie{transaction.items?.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de detalle */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedTransaction(null);
                }}
                title={activeTab === "purchases" ? "Detalle de Factura" : "Detalle de Venta"}
            >
                {selectedTransaction && activeTab === "purchases" ? (
                    /* ---- Detalle FACTURA ---- */
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                                Datos de la factura
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                                <div><span style={{ color: "#6b7280" }}>Vivero: </span><strong>{selectedTransaction.nursery || "-"}</strong></div>
                                <div><span style={{ color: "#6b7280" }}>N° factura: </span><strong>{selectedTransaction.invoice_number || "-"}</strong></div>
                                <div><span style={{ color: "#6b7280" }}>Fecha emisión: </span><strong>{formatDate(selectedTransaction.issue_date)}</strong></div>
                                <div><span style={{ color: "#6b7280" }}>Neto: </span><strong>{formatCurrency(Number(selectedTransaction.net_amount) || 0)}</strong></div>
                                <div><span style={{ color: "#6b7280" }}>IVA: </span><strong>{formatCurrency(Number(selectedTransaction.tax_amount) || 0)}</strong></div>
                                <div><span style={{ color: "#6b7280" }}>Total: </span><strong style={{ color: "#111827" }}>{formatCurrency(Number(selectedTransaction.total_amount) || 0)}</strong></div>
                            </div>
                        </div>
                        <div>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                                Documento
                            </h3>
                            {selectedTransaction.document_url ? (
                                <a
                                    href={selectedTransaction.document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: "inline-block", padding: "10px 16px",
                                        backgroundColor: "#eff6ff", color: "#1e40af",
                                        borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "14px"
                                    }}
                                >
                                    📄 {selectedTransaction.document_name || "Abrir documento"}
                                </a>
                            ) : (
                                <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Sin documento adjunto</p>
                            )}
                        </div>
                    </div>
                ) : selectedTransaction ? (
                    /* ---- Detalle VENTA (agrupada) ---- */
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                                Información General
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                                <div>
                                    <span style={{ color: "#6b7280" }}>Fecha: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {formatDate(selectedTransaction.sale_date)}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: "#6b7280" }}>Total: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {formatCurrency(selectedTransaction.total_amount)}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: "#6b7280" }}>Cantidad: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {selectedTransaction.total_quantity} ejemplar{selectedTransaction.total_quantity !== 1 ? 'es' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                                Especies ({selectedTransaction.items?.length || 0})
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {selectedTransaction.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: "12px",
                                            backgroundColor: "#f9fafb",
                                            borderRadius: "6px",
                                            border: "1px solid #e5e7eb"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                                                    {item.species?.scientific_name || "Especie desconocida"}
                                                </p>
                                                {item.species?.["nombre_común"] && (
                                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                        {item.species["nombre_común"]}
                                                    </p>
                                                )}
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                                                    {formatCurrency(item.price)} {item.quantity > 1 && `× ${item.quantity}`}
                                                </p>
                                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                    {item.quantity > 1 ? `Total: ${formatCurrency(item.price * item.quantity)}` : `Cantidad: ${item.quantity || 1}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>

            {/* Modal: Ingreso de compra */}
            <FacturaModal
                isOpen={showFacturaModal}
                onClose={() => setShowFacturaModal(false)}
                onSaved={() => { fetchData(); fetchNurseries(); setActiveTab("purchases"); }}
                apiRequest={apiRequest}
                accessToken={accessToken}
                nurseries={nurseries}
            />

            {/* Modal: Venta de cactus */}
            <SaleModal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                onSaved={() => { fetchData(); setActiveTab("sales"); }}
                apiRequest={apiRequest}
                accessToken={accessToken}
            />
        </div>
    );
}
