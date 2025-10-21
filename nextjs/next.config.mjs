/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configuración para Railway
    output: 'standalone',
    
    // Configurar workspace root para evitar advertencias de múltiples lockfiles
    outputFileTracingRoot: require('path').join(__dirname, '../'),
    
    experimental: {
        // Desactivar optimización de CSS para evitar problemas con critters
        optimizeCss: false,
    },
    
    // Configuración de variables de entorno
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
    
    // Configuración de rewrites para API
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
