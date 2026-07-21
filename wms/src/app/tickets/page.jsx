"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useCreateSupportTicket,
  useDeleteSupportTicket,
  useSupportTicketSummary,
  useSupportTicketsList,
  useUpdateSupportTicket,
} from "../../hooks/useSupportTickets";
import { AUTH_BYPASS_ENABLED as BYPASS_AUTH } from "../../utils/auth-config";


const MODULE_OPTIONS = [
  "Dashboard",
  "Especies",
  "Sectores",
  "Inventario",
  "Compras y Ventas",
  "Reportes",
  "Auditoria",
  "Editor QR",
  "Home App QR",
  "Login",
  "App QR Publica",
  "Otro",
];

const TYPE_OPTIONS = [
  { value: "error", label: "Error" },
  { value: "mejora", label: "Mejora" },
  { value: "duda", label: "Duda" },
];

const STATUS_OPTIONS = [
  { value: "en_espera", label: "En espera" },
  { value: "en_revision", label: "En revision" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cancelado", label: "Cancelado" },
];

const TYPE_META = {
  error: { label: "Error", color: "#b91c1c", bg: "#fee2e2" },
  mejora: { label: "Mejora", color: "#0369a1", bg: "#e0f2fe" },
  duda: { label: "Duda", color: "#6d28d9", bg: "#ede9fe" },
};

const STATUS_META = {
  en_espera: { label: "En espera", color: "#92400e", bg: "#fef3c7" },
  en_revision: { label: "En revision", color: "#1d4ed8", bg: "#dbeafe" },
  resuelto: { label: "Resuelto", color: "#047857", bg: "#d1fae5" },
  cancelado: { label: "Cancelado", color: "#6b7280", bg: "#f3f4f6" },
};

const emptyForm = {
  type: "error",
  module: "",
  title: "",
  description: "",
  steps_to_reproduce: "",
  expected_result: "",
  actual_result: "",
};

const fieldStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#111827",
  backgroundColor: "white",
  minWidth: 0,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#374151",
  marginBottom: "6px",
};

function Badge({ meta, fallback }) {
  const cfg = meta || { label: fallback, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      minHeight: "24px",
      padding: "3px 9px",
      borderRadius: "999px",
      backgroundColor: cfg.bg,
      color: cfg.color,
      fontSize: "12px",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function DetailBlock({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      borderLeft: "3px solid #e5e7eb",
      paddingLeft: "10px",
      minWidth: 0,
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 700, marginBottom: "3px" }}>
        {label}
      </div>
      <div style={{
        fontSize: "13px",
        color: "#374151",
        lineHeight: 1.5,
        overflowWrap: "anywhere",
        whiteSpace: "pre-wrap",
      }}>
        {value}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function TicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState({ status: "", type: "", module: "", q: "" });
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState({});

  const enabled = !authLoading && Boolean(user || BYPASS_AUTH);

  const {
    data: ticketsResult = { data: [], total: 0 },
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useSupportTicketsList(filters, { enabled });

  const { data: summary } = useSupportTicketSummary({ enabled });
  const createTicket = useCreateSupportTicket();
  const updateTicket = useUpdateSupportTicket();
  const deleteTicket = useDeleteSupportTicket();

  useEffect(() => {
    if (!BYPASS_AUTH && !authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const busy = createTicket.isPending || updateTicket.isPending || deleteTicket.isPending;
  const tickets = ticketsResult.data || [];

  const counts = useMemo(() => {
    const byStatus = summary?.by_status || {};
    return {
      open: summary?.open_count || 0,
      waiting: byStatus.en_espera || 0,
      review: byStatus.en_revision || 0,
      resolved: byStatus.resuelto || 0,
    };
  }, [summary]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      await createTicket.mutateAsync({
        ...form,
        page_url: typeof window !== "undefined" ? window.location.href : "",
      });
      setForm(emptyForm);
      setNotice("Ticket creado correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo crear el ticket");
    }
  };

  const handleStatus = async (ticket, status) => {
    setError("");
    setNotice("");
    try {
      const payload = { status };
      if (status === "resuelto") {
        payload.resolution_note = resolutionNotes[ticket.id] || "";
      }
      await updateTicket.mutateAsync({ id: ticket.id, payload });
      setNotice("Ticket actualizado.");
    } catch (err) {
      setError(err.message || "No se pudo actualizar el ticket");
    }
  };

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Eliminar ticket #${ticket.id}?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteTicket.mutateAsync(ticket.id);
      setNotice("Ticket eliminado.");
    } catch (err) {
      setError(err.message || "No se pudo eliminar el ticket");
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", backgroundColor: "#f9fafb" }}>
        <p style={{ color: "#6b7280" }}>Cargando...</p>
      </div>
    );
  }

  if (!user && !BYPASS_AUTH) return null;

  return (
    <>
      <style jsx>{`
        .tickets-grid {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 900px) {
          .tickets-grid {
            grid-template-columns: 1fr;
          }

          .filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ minHeight: "100dvh", backgroundColor: "#f9fafb" }}>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px clamp(12px, 4vw, 24px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
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
                  lineHeight: 1,
                }}
                title="Volver a modulos"
              >
                ←
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: "20px", color: "#111827", lineHeight: 1.2 }}>
                  Tickets de Soporte
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#6b7280" }}>
                  Reportes internos del WMS
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Badge meta={{ label: `${counts.open} abiertos`, color: "#92400e", bg: "#fef3c7" }} />
              <Badge meta={{ label: `${counts.resolved} resueltos`, color: "#047857", bg: "#d1fae5" }} />
            </div>
          </div>
        </header>

        <main style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(14px, 3vw, 24px)",
        }}>
          {(notice || error || ticketsError) && (
            <div style={{
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "8px",
              border: `1px solid ${error || ticketsError ? "#fecaca" : "#a7f3d0"}`,
              backgroundColor: error || ticketsError ? "#fef2f2" : "#ecfdf5",
              color: error || ticketsError ? "#991b1b" : "#065f46",
              fontSize: "14px",
              overflowWrap: "anywhere",
            }}>
              {error || ticketsError?.message || notice}
            </div>
          )}

          <div className="tickets-grid">
            <section style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <h2 style={{ margin: "0 0 14px", fontSize: "16px", color: "#111827" }}>
                Crear ticket
              </h2>

              <form onSubmit={handleCreate} style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Field label="Tipo">
                    <select
                      value={form.type}
                      onChange={(e) => updateForm("type", e.target.value)}
                      style={fieldStyle}
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Modulo">
                    <select
                      required
                      value={form.module}
                      onChange={(e) => updateForm("module", e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Seleccionar</option>
                      {MODULE_OPTIONS.map((module) => (
                        <option key={module} value={module}>{module}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Resumen">
                  <input
                    required
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    maxLength={180}
                    placeholder="Ej: No puedo guardar una especie"
                    style={fieldStyle}
                  />
                </Field>

                <Field label="Descripcion">
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={5}
                    placeholder="Cuenta que intentabas hacer, que paso y desde cuando ocurre."
                    style={{ ...fieldStyle, resize: "vertical", minHeight: "116px" }}
                  />
                </Field>

                {form.type === "error" && (
                  <div style={{ display: "grid", gap: "10px" }}>
                    <Field label="Pasos para repetirlo">
                      <textarea
                        value={form.steps_to_reproduce}
                        onChange={(e) => updateForm("steps_to_reproduce", e.target.value)}
                        rows={3}
                        placeholder="1. Entrar a... 2. Hacer click en..."
                        style={{ ...fieldStyle, resize: "vertical" }}
                      />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <Field label="Resultado esperado">
                        <textarea
                          value={form.expected_result}
                          onChange={(e) => updateForm("expected_result", e.target.value)}
                          rows={3}
                          style={{ ...fieldStyle, resize: "vertical" }}
                        />
                      </Field>
                      <Field label="Resultado actual">
                        <textarea
                          value={form.actual_result}
                          onChange={(e) => updateForm("actual_result", e.target.value)}
                          rows={3}
                          style={{ ...fieldStyle, resize: "vertical" }}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    minHeight: "44px",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor: busy ? "#9ca3af" : "#111827",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  {createTicket.isPending ? "Creando..." : "Crear ticket"}
                </button>
              </form>
            </section>

            <section style={{ minWidth: 0 }}>
              <div style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>
                <div className="filter-grid">
                  <Field label="Estado">
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilter("status", e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tipo">
                    <select
                      value={filters.type}
                      onChange={(e) => updateFilter("type", e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Todos</option>
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Modulo">
                    <select
                      value={filters.module}
                      onChange={(e) => updateFilter("module", e.target.value)}
                      style={fieldStyle}
                    >
                      <option value="">Todos</option>
                      {MODULE_OPTIONS.map((module) => (
                        <option key={module} value={module}>{module}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Buscar">
                    <input
                      value={filters.q}
                      onChange={(e) => updateFilter("q", e.target.value)}
                      placeholder="ID, resumen, email"
                      style={fieldStyle}
                    />
                  </Field>
                </div>
              </div>

              {ticketsLoading ? (
                <div style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "22px",
                  color: "#6b7280",
                  textAlign: "center",
                }}>
                  Cargando tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "22px",
                  color: "#6b7280",
                  textAlign: "center",
                }}>
                  No hay tickets para estos filtros.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {tickets.map((ticket) => {
                    const permissions = ticket.permissions || {};
                    const isClosed = ticket.status === "resuelto" || ticket.status === "cancelado";
                    return (
                      <article
                        key={ticket.id}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "16px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          minWidth: 0,
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}>
                          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                              <Badge meta={STATUS_META[ticket.status]} fallback={ticket.status} />
                              <Badge meta={TYPE_META[ticket.type]} fallback={ticket.type} />
                              <Badge meta={{ label: ticket.module, color: "#374151", bg: "#f3f4f6" }} />
                            </div>
                            <h3 style={{
                              margin: 0,
                              fontSize: "17px",
                              color: "#111827",
                              lineHeight: 1.3,
                              overflowWrap: "anywhere",
                            }}>
                              #{ticket.id} {ticket.title}
                            </h3>
                            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#6b7280", overflowWrap: "anywhere" }}>
                              {ticket.created_by_email} · {formatDate(ticket.created_at)}
                            </p>
                          </div>
                        </div>

                        <p style={{
                          margin: "0 0 12px",
                          fontSize: "14px",
                          color: "#374151",
                          lineHeight: 1.55,
                          overflowWrap: "anywhere",
                          whiteSpace: "pre-wrap",
                        }}>
                          {ticket.description}
                        </p>

                        <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
                          <DetailBlock label="Pasos" value={ticket.steps_to_reproduce} />
                          <DetailBlock label="Esperado" value={ticket.expected_result} />
                          <DetailBlock label="Actual" value={ticket.actual_result} />
                          <DetailBlock label="Nota de resolucion" value={ticket.resolution_note} />
                        </div>

                        {permissions.can_update_status && !isClosed && (
                          <div style={{
                            display: "grid",
                            gap: "8px",
                            marginBottom: "12px",
                          }}>
                            <textarea
                              value={resolutionNotes[ticket.id] || ""}
                              onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                              rows={2}
                              placeholder="Nota de resolucion opcional"
                              style={{ ...fieldStyle, resize: "vertical" }}
                            />
                          </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {permissions.can_update_status && ticket.status === "en_espera" && (
                            <button
                              disabled={busy}
                              onClick={() => handleStatus(ticket, "en_revision")}
                              style={secondaryButtonStyle}
                            >
                              En revision
                            </button>
                          )}
                          {permissions.can_update_status && !isClosed && (
                            <button
                              disabled={busy}
                              onClick={() => handleStatus(ticket, "resuelto")}
                              style={successButtonStyle}
                            >
                              Resolver
                            </button>
                          )}
                          {permissions.can_cancel && (
                            <button
                              disabled={busy}
                              onClick={() => handleStatus(ticket, "cancelado")}
                              style={warningButtonStyle}
                            >
                              Cancelar
                            </button>
                          )}
                          {permissions.can_delete && (
                            <button
                              disabled={busy}
                              onClick={() => handleDelete(ticket)}
                              style={dangerButtonStyle}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

const baseButtonStyle = {
  minHeight: "40px",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid transparent",
};

const secondaryButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: "#eff6ff",
  borderColor: "#bfdbfe",
  color: "#1d4ed8",
};

const successButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: "#ecfdf5",
  borderColor: "#a7f3d0",
  color: "#047857",
};

const warningButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: "#fffbeb",
  borderColor: "#fde68a",
  color: "#92400e",
};

const dangerButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: "#fef2f2",
  borderColor: "#fecaca",
  color: "#b91c1c",
};
