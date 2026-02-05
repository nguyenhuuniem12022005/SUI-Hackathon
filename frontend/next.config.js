/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'p-market.onrender.com',
        pathname: '/uploads/**'
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**'
      }
    ]
  }
};

module.exports = nextConfig;
