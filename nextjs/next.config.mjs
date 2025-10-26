import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Standalone mode para Railway - genera servidor independiente
    output: 'standalone',

    // Fix monorepo lockfile warning
    outputFileTracingRoot: join(__dirname, '../'),

    // Variables de entorno
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },

    // Optimizaciones para producción
    swcMinify: true,

    // Configuración de imágenes
    images: {
        domains: ['localhost', 'gefozbrdrtopdfuezppm.supabase.co'], // Agregar dominios externos cuando uses imágenes de URLs
    },
};

export default nextConfig;
