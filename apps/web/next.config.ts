import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crmanaliz/ui', '@crmanaliz/types'],
  typedRoutes: true,

  // Development: Proxy /api requests to NestJS backend
  // Production: nginx handles this
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Hardcode for now - env vars not available at build time
    const apiUrl = 'http://localhost:4000';

    // Only add rewrite in development
    if (isDevelopment) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
