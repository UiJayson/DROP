import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drop/shared', '@drop/ui-tokens', '@drop/api-client'],
};

export default nextConfig;
