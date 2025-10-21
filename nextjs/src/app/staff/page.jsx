"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StaffPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{ maxWidth: 420, margin: "64px auto" }}>Cargando…</div>;
  }

  if (!user) {
    return <div style={{ maxWidth: 420, margin: "64px auto" }}>Redirigiendo…</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Panel de Staff</h1>
        <button
          onClick={logout}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}
        >
          Cerrar sesión
        </button>
      </div>

      <p>Bienvenido, <b>{user.email}</b>.</p>

      <div style={{ marginTop: 24 }}>
        <ul style={{ listStyle: "disc", paddingLeft: 20 }}>
          <li><Link href="/species">Gestión de especies (próximo paso)</Link></li>
          <li><Link href="/sectors">Gestión de sectores (próximo paso)</Link></li>
        </ul>
      </div>
    </div>
  );
}
