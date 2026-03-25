import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crmanaliz/ui', '@crmanaliz/types'],
  typedRoutes: true,
};

export default nextConfig;
