import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pedidos.sinvelloporlaser.es',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
