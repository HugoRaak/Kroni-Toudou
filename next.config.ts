import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimizations for production
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
