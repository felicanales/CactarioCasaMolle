import { NextResponse } from "next/server";

// Middleware simplificado - la autenticación se maneja principalmente en el cliente
// Este middleware solo proporciona una capa básica de protección
export function middleware(req) {
    const { nextUrl, cookies } = req;
    const pathname = nextUrl.pathname;

    const hasSession = Boolean(cookies.get("cm_session"));
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



