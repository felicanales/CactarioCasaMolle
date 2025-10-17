import { NextResponse } from "next/server";

// Protege rutas del panel y redirige según estado de sesión via cookie httpOnly
export function middleware(req) {
    const { nextUrl, cookies } = req;
    const pathname = nextUrl.pathname;

    const hasSession = Boolean(cookies.get("cm_session"));
    const isAuthPage = pathname.startsWith("/login");
    const isProtected = ["/staff", "/species", "/sectors"].some((p) => pathname.startsWith(p));

    // Si intenta acceder a rutas protegidas sin sesión → login
    if (isProtected && !hasSession) {
        const url = new URL("/login", nextUrl);
        // opcional: mantener destino
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    // Si ya tiene sesión y visita /login → panel
    if (isAuthPage && hasSession) {
        const nextParam = nextUrl.searchParams.get("next");
        const redirectTo = nextParam || "/staff";
        return NextResponse.redirect(new URL(redirectTo, nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/login", "/staff/:path*", "/species/:path*", "/sectors/:path*"],
};



