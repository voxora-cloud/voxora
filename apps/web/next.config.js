/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable standalone output for Docker (significantly smaller image)
    output: 'standalone',
    
    // Temporarily ignore ESLint during builds (for Docker)
    // TODO: Fix all warnings in code
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
