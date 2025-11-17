import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Standalone output for Railway deployment
    output: 'standalone',

    // Fix monorepo lockfile warning
    outputFileTracingRoot: join(__dirname, '../'),

    // Variables de entorno
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
};

export default nextConfig;
