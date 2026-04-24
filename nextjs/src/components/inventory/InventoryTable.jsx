"use client";

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
    if (purchaseDate) {
        const purchase = new Date(purchaseDate);
        const now = new Date();
        let diffMonths = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
        if (now.getDate() < purchase.getDate()) {
            diffMonths = Math.max(0, diffMonths);
        }
        diffMonths = Math.max(0, diffMonths);
        if (diffMonths >= 12) {
            const years = Math.floor(diffMonths / 12);
            const months = diffMonths % 12;
            return months > 0
                ? `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''}`
                : `${years} año${years !== 1 ? 's' : ''}`;
        }
        return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
    }
    if (ageMonths) {
        const months = parseInt(ageMonths);
        if (months >= 12) {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            return remainingMonths > 0
                ? `${years} año${years !== 1 ? 's' : ''} ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}`
                : `${years} año${years !== 1 ? 's' : ''}`;
        }
        return `${months} mes${months !== 1 ? 'es' : ''}`;
    }
    return "-";
};

const HEADER_STYLE = {
    padding: "16px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

export default function InventoryTable({
    ejemplares,
    loading,
    selectedIds,
    onToggleSelectAll,
    onToggleSelect,
    onEdit,
    onDelete,
}) {
    return (
        <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden"
        }}>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                            <th className="table-header" style={{ ...HEADER_STYLE, width: "40px" }}>
                                <input
                                    type="checkbox"
                                    checked={ejemplares.length > 0 && selectedIds.size === ejemplares.length}
                                    onChange={onToggleSelectAll}
                                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                    title="Seleccionar todos"
                                />
                            </th>
                            <th className="table-header" style={HEADER_STYLE}>Especie</th>
                            <th className="table-header" style={HEADER_STYLE}>Fecha</th>
                            <th className="table-header" style={HEADER_STYLE}>Vivero</th>
                            <th className="table-header" style={HEADER_STYLE}>Edad</th>
                            <th className="table-header" style={HEADER_STYLE}>Tamaño</th>
                            <th className="table-header" style={HEADER_STYLE}>Sector / Ubicación</th>
                            <th className="table-header" style={HEADER_STYLE}>Estado</th>
                            <th className="table-header" style={{ ...HEADER_STYLE, textAlign: "right" }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ejemplares.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af" }}>
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
                                            transition: "background-color 0.2s",
                                            backgroundColor: selectedIds.has(ej.id) ? "#fef3c7" : "white"
                                        }}
                                        onMouseEnter={(e) => !selectedIds.has(ej.id) && (e.currentTarget.style.backgroundColor = "#f9fafb")}
                                        onMouseLeave={(e) => !selectedIds.has(ej.id) && (e.currentTarget.style.backgroundColor = "white")}
                                    >
                                        <td className="table-cell" style={{ padding: "16px", verticalAlign: "middle" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(ej.id)}
                                                onChange={() => onToggleSelect(ej.id)}
                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                            />
                                        </td>
                                        <td className="table-cell" style={{ padding: "16px", verticalAlign: "middle" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <div style={{ fontSize: "14px", fontWeight: "600", fontStyle: "italic", color: "#111827" }}>
                                                    {especie.scientific_name || "-"}
                                                </div>
                                                {especie.nombre_común && (
                                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                                        {especie.nombre_común}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell" style={{ padding: "16px", fontSize: "13px", color: "#374151", verticalAlign: "middle" }}>
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
                                                {ej.invoice_number && (
                                                    <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "monospace" }}>
                                                        #{ej.invoice_number}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell" style={{ padding: "16px", fontSize: "13px", color: "#374151", verticalAlign: "middle" }}>
                                            {ej.nursery || "-"}
                                        </td>
                                        <td className="table-cell" style={{ padding: "16px", fontSize: "13px", color: "#374151", verticalAlign: "middle" }}>
                                            {calculateAge(ej.age_months, ej.purchase_date)}
                                        </td>
                                        <td className="table-cell" style={{ padding: "16px", fontSize: "13px", color: "#374151", verticalAlign: "middle" }}>
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
                                        <td className="table-cell" style={{ padding: "16px", fontSize: "13px", color: "#374151", verticalAlign: "middle", maxWidth: "250px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <div style={{ fontWeight: "500" }}>
                                                    {ej.sector_id === null || ej.sector_id === undefined
                                                        ? "🔴 Sin Asignar (Standby)"
                                                        : (sector.name || "-")}
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
                                        <td className="table-cell" style={{ padding: "16px", verticalAlign: "middle" }}>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "4px 12px",
                                                borderRadius: "12px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                backgroundColor:
                                                    ej.health_status === "muy bien" ? "#d1fae5" :
                                                    ej.health_status === "estable" ? "#dbeafe" :
                                                    ej.health_status === "leve enfermo" ? "#fef3c7" :
                                                    ej.health_status === "enfermo" ? "#fee2e2" :
                                                    ej.health_status === "crítico" ? "#fee2e2" : "#f3f4f6",
                                                color:
                                                    ej.health_status === "muy bien" ? "#065f46" :
                                                    ej.health_status === "leve enfermo" ? "#92400e" :
                                                    ej.health_status === "enfermo" ? "#dc2626" :
                                                    ej.health_status === "crítico" ? "#991b1b" : "#6b7280"
                                            }}>
                                                {ej.health_status === "muy bien" ? "Muy bien" :
                                                    ej.health_status === "leve enfermo" ? "Leve enfermo" :
                                                    ej.health_status
                                                        ? ej.health_status.charAt(0).toUpperCase() + ej.health_status.slice(1)
                                                        : "No especificado"}
                                            </span>
                                        </td>
                                        <td className="table-cell" style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "middle" }}>
                                            <div style={{ display: "inline-flex", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(ej, ej.sale_date ? "venta" : "compra")}
                                                    style={{
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        border: "1px solid #e5e7eb",
                                                        background: "white",
                                                        color: "#374151",
                                                        cursor: "pointer"
                                                    }}
                                                    title="Editar"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(ej)}
                                                    style={{
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        border: "1px solid #ef4444",
                                                        background: "white",
                                                        color: "#ef4444",
                                                        cursor: "pointer"
                                                    }}
                                                    title="Eliminar"
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
    );
}
