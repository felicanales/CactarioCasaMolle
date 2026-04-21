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
    output: 'standalone',
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "pub-538a9d932ea54b5c81b7831be6ea5ee9.r2.dev",
            },
            {
                protocol: "https",
                hostname: "gefozbrdrtopdfuezppm.supabase.co",
            },
        ],
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
