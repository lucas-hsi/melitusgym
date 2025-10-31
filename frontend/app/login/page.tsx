'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'

interface LoginForm {
  email: string
  password: string
}

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

interface LoginResponse {
  access_token: string
  token_type: string
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated, user } = useAuth()
  const router = useRouter()

  // Se já está autenticado, redirecionar
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Usar o método login do AuthContext
      const success = await login(formData.email, formData.password)
      
      if (!success) {
        setError('Email ou senha incorretos')
        return
      }
      
      // Login bem-sucedido, o AuthContext já redireciona
    } catch (err: any) {
      console.error('Erro no login:', err)
      if (err.response?.data?.detail) {
        // Garantir que o erro seja sempre uma string
        const errorDetail = err.response.data.detail
        if (typeof errorDetail === 'string') {
          setError(errorDetail)
        } else if (Array.isArray(errorDetail)) {
          setError(errorDetail.map(e => e.msg || e).join(', '))
        } else {
          setError('Erro de validação nos dados fornecidos.')
        }
      } else {
        setError('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E8] via-[#F0F8FF] to-[#E8F5E8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C1C1C] mb-2">Melitus Gym</h1>
          <p className="text-[#666666]">Faça login para acessar sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1C1C1C] mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm text-[#1C1C1C] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#BFFF00] focus:border-transparent"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1C1C1C] mb-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm text-[#1C1C1C] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#BFFF00] focus:border-transparent"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-100/50 border border-red-200/50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#BFFF00] hover:bg-[#A6E600] disabled:opacity-50 disabled:cursor-not-allowed text-[#1C1C1C] font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1C1C1C]"></div>
                <span>Entrando...</span>
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#666666]">
            Não tem uma conta?{' '}
            <a href="/register" className="text-[#1C1C1C] hover:underline font-medium">
              Registre-se
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}