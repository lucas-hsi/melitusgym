'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axiosInstance from '../lib/axios-config'
import Sidebar from './Sidebar'

interface User {
  id: number
  nome: string
  email: string
  created_at: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function DashboardLayout({ children, title = 'Dashboard' }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          router.push('/login')
          return
        }

        const response = await axiosInstance.get<User>(
          `/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        setUser(response.data)
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl font-medium">Carregando...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando seu dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar} 
        user={user || undefined}
      />
      
      {/* Main Content - Mobile First */}
      <div className="min-h-screen">
        {/* Mobile Header */}
        <header className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-lg border-b border-white/20 sticky top-0 z-30">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSidebar}
                  className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Home Button */}
                <Link
                  href="/dashboard"
                  prefetch={false}
                  className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 hover:scale-105"
                  title="Voltar ao Dashboard"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>
                
                <div>
                  <h1 className="text-xl font-bold text-white">{title}</h1>
                  <p className="text-gray-300 text-xs">Olá, {user?.nome}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <button className="relative text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.5a6 6 0 0 1 6 6v2l1.5 3h-15l1.5-3v-2a6 6 0 0 1 6-6z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </button>
                
                {/* User Avatar - Mobile */}
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {user?.nome?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Mobile Optimized */}
        <main className="p-4 pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}