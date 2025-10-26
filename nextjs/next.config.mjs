/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Variables de entorno
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },

    // Configuración de imágenes
    images: {
        domains: ['localhost', 'gefozbrdrtopdfuezppm.supabase.co'],
    },
};

export default nextConfig;
