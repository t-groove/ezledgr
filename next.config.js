/** @type {import('next').NextConfig} */

const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            },
        ],
    }
};



module.exports = nextConfig;