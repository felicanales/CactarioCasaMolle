import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultApiProxyUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:8000'
        : 'https://cactariocasamolle-production.up.railway.app';
const apiProxyUrl =
    process.env.API_PROXY_URL ||
    process.env.NEXT_PUBLIC_API_PROXY_URL ||
    defaultApiProxyUrl;
const normalizedApiProxyUrl = apiProxyUrl.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Standalone output for Railway deployment
    output: 'standalone',

    // Variables de entorno
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },

    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${normalizedApiProxyUrl}/:path*`,
            },
        ];
    },
};

export default nextConfig;
