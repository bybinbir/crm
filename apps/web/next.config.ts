import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crmanaliz/ui', '@crmanaliz/types'],
  typedRoutes: true,

  // Development: Proxy /api requests to NestJS backend
  // Production: nginx handles this
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === 'development'; // eslint-disable-line no-undef
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'; // eslint-disable-line no-undef

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
