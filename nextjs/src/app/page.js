// nextjs/src/app/page.js
"use client";

import { useAuth } from "./context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
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
