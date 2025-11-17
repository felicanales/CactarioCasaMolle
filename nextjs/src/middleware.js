import { NextResponse } from "next/server";

// Configuración del matcher - DEBE ser completamente estático
// Next.js no permite expresiones condicionales, referencias a variables,
// ni ninguna evaluación en tiempo de ejecución en config.matcher
export const config = {
    matcher: [
        "/staff/:path*",
        "/species/:path*",
        "/sectors/:path*"
    ],
};

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está DESACTIVADO (requiere autenticación)
// Para activar en desarrollo: setear NEXT_PUBLIC_BYPASS_AUTH=true
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

// Middleware simplificado - la validación real se hace en el cliente
// Este middleware solo proporciona una capa básica de protección
// NOTA: En producción con frontend y backend en dominios diferentes,
// las cookies del backend no están disponibles en el middleware de Next.js.
// Por lo tanto, confiamos en la validación del cliente (AuthContext y componentes).
export function middleware(req) {
    // BYPASS: Permitir todo en desarrollo
    if (BYPASS_AUTH) {
        return NextResponse.next();
    }

    const { nextUrl } = req;
    const pathname = nextUrl.pathname;

    // En producción con cross-domain, las cookies del backend no están disponibles
    // en el middleware de Next.js. La validación real se hace en:
    // 1. AuthContext (verifica usuario al cargar)
    // 2. Componentes individuales (redirigen a /login si no hay usuario)
    // 3. Backend (valida tokens en cada request)
    
    // Por lo tanto, permitimos el acceso y confiamos en la validación del cliente
    // Esto evita redirecciones innecesarias cuando el usuario está autenticado
    // pero las cookies no están disponibles en el middleware
    
    const isProtected = ["/staff", "/species", "/sectors"].some((p) => pathname.startsWith(p));
    
    if (isProtected) {
        // Log para debugging, pero no bloquear
        // La validación real se hará en el componente
        console.log(`[Middleware] Protected route accessed: ${pathname} - validation will happen in component`);
    }

    return NextResponse.next();
}
