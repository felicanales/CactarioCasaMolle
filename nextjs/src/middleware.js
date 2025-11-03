import { NextResponse } from "next/server";

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está ACTIVADO en desarrollo local (no requiere .env)
// Para desactivar: setear NEXT_PUBLIC_BYPASS_AUTH=false en producción
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false";

// Middleware simplificado - la validación real se hace en el cliente
// Este middleware solo proporciona una capa básica de protección
export function middleware(req) {
    // BYPASS: Permitir todo en desarrollo
    if (BYPASS_AUTH) {
        return NextResponse.next();
    }

    const { nextUrl, cookies } = req;
    const pathname = nextUrl.pathname;

    // Para rutas protegidas, verificar si hay alguna señal de sesión
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    // Si hay al menos uno de los tokens, permitir el acceso
    // La validación real se hará en el componente y el backend
    const hasAnyToken = Boolean(
        (accessToken && accessToken.value) ||
        (refreshToken && refreshToken.value)
    );

    const isProtected = ["/staff", "/species", "/sectors"].some((p) => pathname.startsWith(p));

    // Solo bloquear si definitivamente no hay ninguna sesión
    if (isProtected && !hasAnyToken) {
        console.log(`[Middleware] No tokens found, redirecting to login from: ${pathname}`);
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // Si hay tokens, dejar pasar - la validación se hará en el componente
    if (isProtected && hasAnyToken) {
        console.log(`[Middleware] Tokens found, allowing access to: ${pathname}`);
    }

    return NextResponse.next();
}

export const config = {
    matcher: (process.env.NEXT_PUBLIC_BYPASS_AUTH !== "false") ? [] : ["/staff/:path*", "/species/:path*", "/sectors/:path*"],
};
