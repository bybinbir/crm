import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crmanaliz/ui', '@crmanaliz/types'],
  typedRoutes: true,

  // Development: Proxy /api requests to NestJS backend (port 4000)
  // Production: nginx handles this
  async rewrites() {
    // Only add rewrite in development
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
