'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import LayoutBase from '../../components/layout/LayoutBase'
import HeaderMobile from '../../components/ui/HeaderMobile'
import CardResumoDia from '../../components/ui/CardResumoDia'
import CardAtividadesRecentes from '../../components/ui/CardAtividadesRecentes'
import BotaoFlutuante from '../../components/ui/BotaoFlutuante'
import { useGlucoseReadings, useBloodPressureReadings, useInsulinReadings, useClinicalStats, useLatestGlucose } from '../../hooks/useClinical'

interface ChartData {
  time: string
  value: number
  systolic?: number
  diastolic?: number
}

interface HealthProfile {
  nome: string
  idade: number
  peso: number
  altura: number
  medicamentos: string[]
  metas: {
    glicemia_jejum: number
    pressao_sistolica: number
    pressao_diastolica: number
    hidratacao_diaria: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null)
  
  // Buscar dados clínicos mais recentes
  const today = new Date().toISOString().split('T')[0]
  const { data: latestGlucoseData, isLoading: glucoseLoading, error: glucoseError } = useLatestGlucose()
  const { data: pressureData, isLoading: pressureLoading, error: pressureError } = useBloodPressureReadings({
    limit: 1
  })
  const { data: insulinData, isLoading: insulinLoading, error: insulinError } = useInsulinReadings({
    limit: 1
  })
  
  // Buscar dados do dia atual para gráficos
  const { data: glucoseData } = useGlucoseReadings({
    date_from: today,
    date_to: today
  })
  const { data: statsData, isLoading: statsLoading } = useClinicalStats()
  
  const isLoading = glucoseLoading || pressureLoading || insulinLoading || statsLoading
  
  // Preparar dados para gráficos
  const glucoseChartData: ChartData[] = glucoseData?.data?.map((reading: any) => ({
    time: new Date(reading.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    value: reading.value
  })) || []
  
  const pressureChartData: ChartData[] = pressureData?.data?.map((reading: any) => ({
    time: new Date(reading.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    value: reading.systolic // Para compatibilidade
  })) || []
  
  // Obter últimas leituras
  const lastGlucose = latestGlucoseData?.data
  const lastPressure = pressureData?.data?.[0]
  const lastInsulin = insulinData?.data?.[0]
  
  // Calcular tendências
  const getGlucoseTrend = () => {
    if (!glucoseData?.data || glucoseData.data.length < 2) return 'stable'
    const recent = glucoseData.data.slice(-2)
    const diff = recent[1].value - recent[0].value
    if (diff > 10) return 'up'
    if (diff < -10) return 'down'
    return 'stable'
  }
  
  const getPressureTrend = () => {
    if (!pressureData?.data || pressureData.data.length < 2) return 'stable'
    const recent = pressureData.data.slice(-2)
    const diff = recent[1].systolic - recent[0].systolic
    if (diff > 5) return 'up'
    if (diff < -5) return 'down'
    return 'stable'
  }
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const handleNavigateToSaude = () => {
    router.push('/saude')
  }

  const handleNavigateToNutricao = () => {
    router.push('/nutricao')
  }

  const handleNavigateToTreino = () => {
    router.push('/treino')
  }

  const handleNavigateToConfiguracoes = () => {
    router.push('/configuracoes')
  }

  return (
    <ProtectedRoute>
      <LayoutBase title="Dashboard">
        {/* Container Principal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="px-4 py-6 space-y-6"
        >
        {/* Card Resumo do Dia */}
        <CardResumoDia 
          calorias={1250}
          duracao="45 min"
          tipoTreino="Cardio + Força"
        />
        
        {/* Card Atividades Recentes */}
        <CardAtividadesRecentes />

        {/* Cards de Métricas de Saúde */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Pressão Arterial */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNavigateToSaude}
            className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-4 cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-red-400 to-red-600 rounded-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1C1C1C]">Pressão</h3>
                <p className="text-xs text-[#1C1C1C] opacity-60">Arterial</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <p className="text-lg font-bold text-[#1C1C1C]">
                  {pressureLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${lastPressure?.systolic || '--'}/${lastPressure?.diastolic || '--'}`
                  )}
                </p>
                {!pressureLoading && getTrendIcon(getPressureTrend())}
              </div>
              <p className="text-xs text-[#1C1C1C] opacity-70">mmHg</p>
              {pressureError && (
                <p className="text-xs text-red-500">Erro ao carregar</p>
              )}
            </div>
          </motion.div>

          {/* Glicemia */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNavigateToSaude}
            className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-4 cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1C1C1C]">Glicemia</h3>
                <p className="text-xs text-[#1C1C1C] opacity-60">Atual</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <p className="text-lg font-bold text-[#1C1C1C]">
                  {glucoseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    lastGlucose?.value || '--'
                  )}
                </p>
                {!glucoseLoading && getTrendIcon(getGlucoseTrend())}
              </div>
              <p className="text-xs text-[#1C1C1C] opacity-70">mg/dL</p>
              {glucoseError && (
                <p className="text-xs text-red-500">Erro ao carregar</p>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Segunda linha de métricas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Insulina */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNavigateToSaude}
            className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-4 cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1C1C1C]">Insulina</h3>
                <p className="text-xs text-[#1C1C1C] opacity-60">Última</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-[#1C1C1C]">
                {insulinLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  lastInsulin?.units || '--'
                )}
              </p>
              <p className="text-xs text-[#1C1C1C] opacity-70">UI</p>
              {insulinError && (
                <p className="text-xs text-red-500">Erro ao carregar</p>
              )}
            </div>
          </motion.div>

          {/* Alimentação */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNavigateToNutricao}
            className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-4 cursor-pointer"
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1C1C1C]">Refeições</h3>
                <p className="text-xs text-[#1C1C1C] opacity-60">Hoje</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-[#1C1C1C]">3</p>
              <p className="text-xs text-[#1C1C1C] opacity-70">registradas</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Alarmes de Medicação */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1C1C1C]">Alarmes de Medicação</h3>
                <p className="text-[#1C1C1C] opacity-60 text-sm">Lembretes ativos</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNavigateToSaude}
              className="px-4 py-2 bg-[#BFFF00] text-[#1C1C1C] rounded-lg hover:bg-[#BFFF00]/90 transition-colors text-sm font-semibold"
            >
              Gerenciar
            </motion.button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl">
              <p className="text-2xl font-bold text-[#1C1C1C]">0</p>
              <p className="text-[#1C1C1C] opacity-70 text-sm">Ativos</p>
            </div>
            <div className="text-center p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl">
              <p className="text-lg font-bold text-[#1C1C1C]">--:--</p>
              <p className="text-[#1C1C1C] opacity-70 text-sm">Próximo</p>
            </div>
          </div>
        </motion.div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6"
        >
          <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNavigateToSaude}
              className="flex flex-col items-center p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl hover:bg-white/30 transition-all"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#1C1C1C] text-center">Saúde</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNavigateToNutricao}
              className="flex flex-col items-center p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl hover:bg-white/30 transition-all"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#1C1C1C] text-center">Nutrição</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNavigateToTreino}
              className="flex flex-col items-center p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl hover:bg-white/30 transition-all"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#1C1C1C] text-center">Treino</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Gráficos Diários */}
        {(glucoseChartData.length > 0 || pressureChartData.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="space-y-4"
          >
            {/* Gráfico de Glicemia */}
            {glucoseChartData.length > 0 && (
              <div className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1C1C1C]">Glicemia - Hoje</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-[#1C1C1C] opacity-70">mg/dL</span>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={glucoseChartData}>
                      <XAxis 
                        dataKey="time" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#1C1C1C' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#1C1C1C' }}
                        domain={['dataMin - 20', 'dataMax + 20']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: '#1C1C1C' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Gráfico de Pressão Arterial */}
            {pressureChartData.length > 0 && (
              <div className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1C1C1C]">Pressão Arterial - Hoje</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-[#1C1C1C] opacity-70">Sistólica</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-[#1C1C1C] opacity-70">Diastólica</span>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pressureChartData}>
                      <XAxis 
                        dataKey="time" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#1C1C1C' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#1C1C1C' }}
                        domain={['dataMin - 10', 'dataMax + 10']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: '#1C1C1C' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="systolic" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolic" 
                        stroke="#F97316" 
                        strokeWidth={3}
                        dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#F97316', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Resumo de Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6"
        >
          <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Resumo de Hoje</h3>
          <div className="space-y-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[#1C1C1C] font-medium">Glicemia</span>
              </div>
              <span className="text-[#1C1C1C] font-bold">{glucoseData?.data?.length || 0} registros</span>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-[#1C1C1C] font-medium">Pressão</span>
              </div>
              <span className="text-[#1C1C1C] font-bold">{pressureData?.data?.length || 0} registros</span>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-4 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <span className="text-[#1C1C1C] font-medium">Insulina</span>
              </div>
              <span className="text-[#1C1C1C] font-bold">{insulinData?.data?.length || 0} registros</span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      
        {/* Botão Flutuante */}
        <BotaoFlutuante />
      </LayoutBase>
    </ProtectedRoute>
  )
}