'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  user?: {
    nome: string
    email: string
  }
}

const menuItems = [
  {
    icon: '🏠',
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    icon: '❤️',
    label: 'Saúde',
    href: '/saude'
  },
  {
    icon: '🍎',
    label: 'Nutrição',
    href: '/nutricao'
  },
  {
    icon: '💪',
    label: 'Treino',
    href: '/treino'
  },
  {
    icon: '⚙️',
    label: 'Configurações',
    href: '/configuracoes'
  }
]

export default function Sidebar({ isOpen, onToggle, user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <>
      {/* Botão flutuante quando colapsado removido conforme solicitação: menu inferior será responsável pelo expandir/recolher */}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-72 bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-xl
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-2xl border-r border-white/20
      `}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏥</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">HealthTrack</h2>
                <p className="text-gray-300 text-sm">Saúde Pessoal</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.nome?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-gray-300 text-sm truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'))
              return (
                <li key={index}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-green-500/30 to-teal-500/30 border border-green-400/50 text-white shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-105'
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-4 text-gray-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}