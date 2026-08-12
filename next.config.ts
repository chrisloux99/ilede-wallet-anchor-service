import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  serverExternalPackages: ['stellar-sdk', '@stellar/stellar-base', 'sodium-native'],

  async rewrites() {
    return [
      {
        source: '/.well-known/stellar.toml',
        destination: '/api/.well-known/stellar.toml',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
