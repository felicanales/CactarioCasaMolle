import { NextResponse } from "next/server";

// Middleware simplificado - la autenticación se maneja principalmente en el cliente
// Este middleware solo proporciona una capa básica de protección
export function middleware(req) {
    const { nextUrl, cookies } = req;
    const pathname = nextUrl.pathname;

    // Verificar si tiene las cookies de sesión de Supabase
    const hasSession = Boolean(cookies.get("sb-access-token"));
    const isProtected = ["/staff", "/species", "/sectors"].some((p) => pathname.startsWith(p));

    // Solo redirigir a login si intenta acceder a rutas protegidas sin cookie
    // El cliente se encargará de validar si la cookie es válida
    if (isProtected && !hasSession) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/staff/:path*", "/species/:path*", "/sectors/:path*"],
};



