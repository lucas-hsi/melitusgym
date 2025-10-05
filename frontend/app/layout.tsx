import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { HealthProvider } from '../contexts/HealthContext'
import { QueryProvider } from '../providers/QueryProvider'
import { ClientLayout } from '../components/ClientLayout'
import { ServiceWorkerProvider } from '../components/ServiceWorkerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HealthTrack Pro',
  description: 'App para controle de diabetes, hipertensão e treinos',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#22c55e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body className={`${inter.className} bg-dark-900 text-white min-h-screen`}>
        <QueryProvider>
          <AuthProvider>
            <HealthProvider>
              <ServiceWorkerProvider>
                <ClientLayout>
                  <div className="flex flex-col min-h-screen">
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </ClientLayout>
              </ServiceWorkerProvider>
            </HealthProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}