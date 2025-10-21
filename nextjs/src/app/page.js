// nextjs/src/app/page.js
"use client";

import { useAuth } from "./context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log('[HomePage] Render - loading:', loading, 'user:', user);

  useEffect(() => {
    console.log('[HomePage] useEffect - loading:', loading, 'user:', user);
    if (!loading) {
      if (user) {
        console.log('[HomePage] Redirigiendo a /staff');
        router.push("/staff");
      } else {
        console.log('[HomePage] Redirigiendo a /login');
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", textAlign: "center" }}>
      <p>Cargando...</p>
      <p style={{ fontSize: "12px", color: "#999", marginTop: "10px" }}>
        loading: {loading.toString()} | user: {user ? user.email : 'null'}
      </p>
    </div>
  );
}
