// nextjs/src/app/page.js
"use client";

import { useAuth } from "./context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está ACTIVADO en desarrollo local (no requiere .env)
// Para desactivar: setear NEXT_PUBLIC_BYPASS_AUTH=false en producción
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // BYPASS: No redirigir en desarrollo, ir directamente a staff
    if (BYPASS_AUTH) {
      router.replace("/staff");
      return;
    }

    if (!loading) {
      if (user) {
        router.replace("/staff");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", textAlign: "center" }}>
      <p>Cargando...</p>
    </div>
  );
}
