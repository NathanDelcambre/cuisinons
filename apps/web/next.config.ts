import type { NextConfig } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600';
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cuisinons/ui'],
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/login', destination: '/connexion', permanent: true },
      { source: '/recipes/new', destination: '/recettes/nouvelle', permanent: true },
      { source: '/recipes/suggest', destination: '/recettes?proposer=1', permanent: true },
      { source: '/recettes/proposer', destination: '/recettes?proposer=1', permanent: true },
      { source: '/recipes/:id/edit', destination: '/recettes/:id/modifier', permanent: true },
      { source: '/recipes/:id', destination: '/recettes/:id', permanent: true },
      { source: '/recipes', destination: '/recettes', permanent: true },
      { source: '/shopping', destination: '/courses', permanent: true },
      { source: '/pantry', destination: '/reserves', permanent: true },
      { source: '/goals', destination: '/objectifs', permanent: true },
      { source: '/settings/stats', destination: '/profil/statistiques', permanent: true },
      { source: '/settings/security', destination: '/profil/securite', permanent: true },
      { source: '/settings', destination: '/profil', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/connexion', destination: '/login' },
      { source: '/recettes/nouvelle', destination: '/recipes/new' },
      { source: '/recettes/:id/modifier', destination: '/recipes/:id/edit' },
      { source: '/recettes/:id', destination: '/recipes/:id' },
      { source: '/recettes', destination: '/recipes' },
      { source: '/courses', destination: '/shopping' },
      { source: '/reserves', destination: '/pantry' },
      { source: '/objectifs', destination: '/goals' },
      { source: '/profil/statistiques', destination: '/settings/stats' },
      { source: '/profil/securite', destination: '/settings/security' },
      { source: '/profil', destination: '/settings' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              `connect-src 'self' ${appUrl}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
