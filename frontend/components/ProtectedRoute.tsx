'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredProfile?: 'Gestor' | 'Vendedor' | 'Anúncios' | 'all'
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  requiredProfile = 'all',
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Se não está autenticado, redirecionar para login
      if (!isAuthenticated) {
        router.push(redirectTo)
        return
      }

      // Se está autenticado mas não tem o perfil necessário
      if (requiredProfile !== 'all') {
        // Redirecionar para página de acesso negado ou dashboard
        router.push('/dashboard')
        return
      }
    }
  }, [isAuthenticated, isLoading, user, requiredProfile, router, redirectTo])

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E8F5E8] via-[#F0F8FF] to-[#E8F5E8] flex items-center justify-center">
        <div className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BFFF00]"></div>
            <p className="text-[#1C1C1C] font-medium">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    )
  }

  // Se não está autenticado ou não tem permissão, não renderizar nada
  // (o useEffect já fez o redirecionamento)
  if (!isAuthenticated) {
    return null
  }

  if (requiredProfile !== 'all') {
    return null
  }

  // Se tudo está ok, renderizar o conteúdo
  return <>{children}</>
}