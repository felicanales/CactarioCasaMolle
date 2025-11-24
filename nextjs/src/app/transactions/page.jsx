"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "../../utils/api-config";

const API = getApiUrl();

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

export default function TransactionsPage() {
    const { user, loading: authLoading, accessToken, apiRequest } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("purchases"); // "purchases" o "sales"
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && accessToken) {
            fetchData();
        }
    }, [user, accessToken, activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");
            
            if (activeTab === "purchases") {
                const res = await apiRequest(`${API}/transactions/purchases`, {}, accessToken);
                if (res.ok) {
                    const data = await res.json();
                    setPurchases(Array.isArray(data) ? data : []);
                } else {
                    throw new Error("Error al cargar compras");
                }
            } else {
                const res = await apiRequest(`${API}/transactions/sales`, {}, accessToken);
                if (res.ok) {
                    const data = await res.json();
                    setSales(Array.isArray(data) ? data : []);
                } else {
                    throw new Error("Error al cargar ventas");
                }
            }
        } catch (err) {
            console.error('[TransactionsPage] Error:', err);
            setError(err.message || "Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

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
    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalQuantity = transactions.reduce((sum, t) => sum + (t.total_quantity || 0), 0);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
            {/* Header */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "1px solid #e5e7eb",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                        Compras y Ventas
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6b7280" }}>
                        Historial de transacciones
                    </p>
                </div>
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
                    Volver a Inventario
                </Link>
            </div>

            {/* Tabs */}
            <div style={{
                backgroundColor: "white",
                borderBottom: "1px solid #e5e7eb",
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

                {/* Summary */}
                {transactions.length > 0 && (
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "20px",
                        marginBottom: "20px",
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-around",
                        flexWrap: "wrap",
                        gap: "20px"
                    }}>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                                Total {activeTab === "purchases" ? "Compras" : "Ventas"}
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                                {formatCurrency(totalAmount)}
                            </p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                                Total Ejemplares
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                                {totalQuantity}
                            </p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                                Transacciones
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                                {transactions.length}
                            </p>
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                {transactions.length === 0 ? (
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "40px",
                        textAlign: "center",
                        border: "1px solid #e5e7eb"
                    }}>
                        <p style={{ color: "#6b7280", fontSize: "16px" }}>
                            No hay {activeTab === "purchases" ? "compras" : "ventas"} registradas
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {transactions.map((transaction, index) => (
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
                                            {activeTab === "purchases" 
                                                ? formatDate(transaction.purchase_date)
                                                : formatDate(transaction.sale_date)
                                            }
                                        </h3>
                                        {activeTab === "purchases" && transaction.invoice_number && (
                                            <span style={{
                                                padding: "4px 8px",
                                                backgroundColor: "#eff6ff",
                                                color: "#1e40af",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "600"
                                            }}>
                                                {transaction.invoice_number}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b7280" }}>
                                        <span>{transaction.total_quantity} ejemplar{transaction.total_quantity !== 1 ? 'es' : ''}</span>
                                        {activeTab === "purchases" && transaction.nursery && (
                                            <span>• {transaction.nursery}</span>
                                        )}
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

            {/* Modal con detalles */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedTransaction(null);
                }}
                title={activeTab === "purchases" ? "Detalle de Compra" : "Detalle de Venta"}
            >
                {selectedTransaction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {/* Información general */}
                        <div style={{
                            padding: "16px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "8px"
                        }}>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                                Información General
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                                <div>
                                    <span style={{ color: "#6b7280" }}>Fecha: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {activeTab === "purchases" 
                                            ? formatDate(selectedTransaction.purchase_date)
                                            : formatDate(selectedTransaction.sale_date)
                                        }
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: "#6b7280" }}>Total: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {formatCurrency(selectedTransaction.total_amount)}
                                    </span>
                                </div>
                                {activeTab === "purchases" && selectedTransaction.invoice_number && (
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Factura: </span>
                                        <span style={{ fontWeight: "600", color: "#111827" }}>
                                            {selectedTransaction.invoice_number}
                                        </span>
                                    </div>
                                )}
                                {activeTab === "purchases" && selectedTransaction.nursery && (
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Vivero: </span>
                                        <span style={{ fontWeight: "600", color: "#111827" }}>
                                            {selectedTransaction.nursery}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <span style={{ color: "#6b7280" }}>Cantidad: </span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>
                                        {selectedTransaction.total_quantity} ejemplar{selectedTransaction.total_quantity !== 1 ? 'es' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
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
                                                {item.species?.nombre_común && (
                                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                        {item.species.nombre_común}
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
                                        {item.age_months && (
                                            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                Edad: {item.age_months} {item.age_months === 1 ? 'mes' : 'meses'}
                                            </p>
                                        )}
                                        {item.health_status && (
                                            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                                                Estado: {item.health_status}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

