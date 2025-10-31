/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'api.nutritionix.com', 'melitusgym-production.up.railway.app'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_VISION_BACKEND: process.env.NEXT_PUBLIC_VISION_BACKEND || 'local',
    NEXT_PUBLIC_LAZY_MODEL_LOADING: process.env.NEXT_PUBLIC_LAZY_MODEL_LOADING || 'true',
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        // Service Worker com cache curto para forçar verificação de atualizações
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Permitir uso da câmera em todas as páginas
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self)',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig