/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;

