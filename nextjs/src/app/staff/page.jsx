"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está DESACTIVADO (requiere autenticación)
// Para activar en desarrollo: setear NEXT_PUBLIC_BYPASS_AUTH=true
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export default function StaffPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // BYPASS: No redirigir en desarrollo
    if (BYPASS_AUTH) {
      return;
    }

    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb"
      }}>
        <div style={{
          padding: "24px",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
          <p style={{ marginTop: "12px", color: "#6b7280" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const modules = [
    {
      title: "Gestión de Especies",
      description: "Administra las especies de cactáceas del vivero",
      icon: "🌵",
      href: "/species",
      color: "#10b981",
      bgColor: "#d1fae5"
    },
    {
      title: "Gestión de Sectores",
      description: "Organiza y controla los sectores del vivero",
      icon: "📍",
      href: "/sectors",
      color: "#3b82f6",
      bgColor: "#dbeafe"
    },
    {
      title: "Inventario",
      description: "Control de stock y movimientos",
      icon: "📦",
      href: "/inventory",
      color: "#f59e0b",
      bgColor: "#fef3c7"
    },
    {
      title: "Compras y Ventas",
      description: "Historial de transacciones y movimientos",
      icon: "💰",
      href: "/transactions",
      color: "#06b6d4",
      bgColor: "#cffafe"
    },
    {
      title: "Reportes",
      description: "Estadísticas y reportes del sistema",
      icon: "📊",
      href: "/reports",
      color: "#8b5cf6",
      bgColor: "#ede9fe"
    },
    {
      title: "Logs de Auditoría",
      description: "Historial de cambios y modificaciones",
      icon: "📋",
      href: "/audit",
      color: "#6366f1",
      bgColor: "#e0e7ff"
    },
    {
      title: "Editor de la información",
      description: "Edita información para la app de escaneo QR",
      icon: "📱",
      href: "/species-editor",
      color: "#ec4899",
      bgColor: "#fce7f3"
    }
  ];

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card {
          animation: fadeIn 0.5s ease-out;
        }

        .card:nth-child(1) { animation-delay: 0.1s; }
        .card:nth-child(2) { animation-delay: 0.2s; }
        .card:nth-child(3) { animation-delay: 0.3s; }
        .card:nth-child(4) { animation-delay: 0.4s; }
        .card:nth-child(5) { animation-delay: 0.5s; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb"
      }}>
        {/* Header / Navbar */}
        <header style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>🌵</span>
              <div>
                <h1 style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#111827",
                  margin: 0
                }}>
                  Cactario Casa Molle
                </h1>
                <p style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: 0
                }}>
                  Panel de Administración
                </p>
              </div>
            </div>

            {/* User Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "white",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  {user.email[0].toUpperCase()}
                </div>
                <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  minWidth: "200px",
                  overflow: "hidden",
                  zIndex: 20
                }}>
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    <p style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: 0
                    }}>
                      Conectado como
                    </p>
                    <p style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                      margin: "4px 0 0 0"
                    }}>
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      textAlign: "left",
                      border: "none",
                      backgroundColor: "white",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#dc2626",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                  >
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 48px) 24px"
        }}>
          {/* Welcome Section */}
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "clamp(24px, 5vw, 32px)",
            marginBottom: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white"
          }}>
            <h2 style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: "700",
              margin: "0 0 8px 0"
            }}>
              ¡Bienvenido de vuelta! 👋
            </h2>
            <p style={{
              fontSize: "clamp(14px, 3vw, 16px)",
              margin: 0,
              opacity: 0.95
            }}>
              Selecciona un módulo para comenzar a trabajar
            </p>
          </div>

          {/* Modules Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px"
          }}>
            {modules.map((module, index) => (
              module.disabled ? (
                <div
                  key={index}
                  className="card"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: "1px solid #e5e7eb",
                    opacity: 0.6,
                    cursor: "not-allowed",
                    position: "relative"
                  }}
                >
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    backgroundColor: module.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    marginBottom: "16px"
                  }}>
                    {module.icon}
                  </div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: "0 0 8px 0"
                  }}>
                    {module.title}
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0",
                    lineHeight: "1.5"
                  }}>
                    {module.description}
                  </p>
                  <div style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    Próximamente
                  </div>
                </div>
              ) : (
                <Link
                  key={index}
                  href={module.href}
                  className="card"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: "1px solid #e5e7eb",
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    display: "block"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.15)";
                    e.currentTarget.style.borderColor = module.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    backgroundColor: module.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    marginBottom: "16px",
                    transition: "transform 0.3s ease"
                  }}>
                    {module.icon}
                  </div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: "0 0 8px 0"
                  }}>
                    {module.title}
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0 0 16px 0",
                    lineHeight: "1.5"
                  }}>
                    {module.description}
                  </p>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: module.color
                  }}>
                    Acceder
                    <span style={{ fontSize: "12px" }}>→</span>
                  </div>
                </Link>
              )
            ))}
          </div>

          {/* Footer Info */}
          <div style={{
            marginTop: "48px",
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            textAlign: "center"
          }}>
            <p style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0
            }}>
              Sistema de Gestión Cactario Casa Molle · v1.0.0
            </p>
            <p style={{
              fontSize: "13px",
              color: "#9ca3af",
              margin: "8px 0 0 0"
            }}>
              © 2025 Casa Molle · Todos los derechos reservados
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
