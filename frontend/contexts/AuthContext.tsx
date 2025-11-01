'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import setupAxiosInterceptors from '../lib/axios-config'

interface User {
  id: number
  nome: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user && !!token

  // Funções utilitárias para persistência de sessão
  const persistSession = (token: string, user: any) => {
    localStorage.setItem('token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('session_timestamp', Date.now().toString())
  }

  const clearSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('session_timestamp')
  }

  // Configurar interceptors do Axios
  useEffect(() => {
    setupAxiosInterceptors()
  }, [])

  // Verificar se há sessão persistida no localStorage - executa apenas uma vez
  useEffect(() => {
    console.log('AuthContext montado. Verificando token armazenado...')
    
    const checkStoredAuth = async () => {
      try {
        // Acessar localStorage diretamente para evitar dependências
        const storedToken = localStorage.getItem('token')
        const storedUserStr = localStorage.getItem('auth_user')
        const timestamp = localStorage.getItem('session_timestamp')
        
        console.log('Token encontrado:', !!storedToken)
        
        if (storedToken && storedUserStr && timestamp) {
          try {
            const storedUser = JSON.parse(storedUserStr)
            const sessionAge = Date.now() - parseInt(timestamp)
            const maxSessionAge = 24 * 60 * 60 * 1000 // 24 horas
            
            if (sessionAge <= maxSessionAge) {
              // Verificar se o token ainda é válido
              const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-token`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`
                }
              })
              
              if (response.status === 200) {
                console.log('Token válido, restaurando sessão')
                setToken(storedToken)
                setUser(storedUser)
              } else {
                console.log('Token inválido, limpando sessão')
                // Token inválido, limpar sessão
                localStorage.removeItem('token')
                localStorage.removeItem('auth_user')
                localStorage.removeItem('session_timestamp')
              }
            } else {
              console.log('Sessão expirada, limpando dados')
              localStorage.removeItem('token')
              localStorage.removeItem('auth_user')
              localStorage.removeItem('session_timestamp')
            }
          } catch (parseError) {
            console.error('Erro ao fazer parse dos dados da sessão:', parseError)
            localStorage.removeItem('token')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('session_timestamp')
          }
        }
      } catch (error) {
        console.error('Erro ao verificar token armazenado:', error)
        // Em caso de erro, limpar dados possivelmente corrompidos
        localStorage.removeItem('token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('session_timestamp')
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredAuth()
  }, []) // ✅ Array vazio - executa apenas uma vez

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      const payload = {
        email,
        password
      }
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const { access_token, user: userData } = response.data
      
      // Salvar no estado e persistir sessão
      setToken(access_token)
      setUser(userData)
      persistSession(access_token, userData)
      
      // Redirecionar para dashboard
      router.push('/dashboard')
      
      return true
    } catch (error: any) {
      console.error('Erro no login:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    console.log('Fazendo logout...')
    
    // Limpar estado
    setToken(null)
    setUser(null)
    
    // Limpar sessão persistida
    clearSession()
    
    // Redirecionar para login
    router.push('/login')
  }





  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export default AuthContext