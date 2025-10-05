'use client'

import { motion } from 'framer-motion'
import { Flame, Clock, Activity } from 'lucide-react'

interface CardResumoDiaProps {
  calorias?: number
  duracao?: string
  tipoTreino?: string
}

export default function CardResumoDia({ 
  calorias, 
  duracao, 
  tipoTreino 
}: CardResumoDiaProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6 mb-6"
    >
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl font-bold text-[#1C1C1C] font-inter mb-1"
        >
          Hoje
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[#1C1C1C] opacity-70 text-sm font-medium"
        >
          Resumo do seu desempenho
        </motion.p>
      </div>

      {/* Indicadores Horizontais */}
      <div className="space-y-4">
        {/* Calorias */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center justify-between p-4 rounded-xl backdrop-blur-[8px] bg-white/20 border border-white/25"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-red-500">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#1C1C1C] font-semibold text-sm">Calorias</p>
              <p className="text-[#1C1C1C] opacity-60 text-xs">Queimadas hoje</p>
            </div>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            className="text-xl font-bold text-[#1C1C1C]"
          >
            {calorias ? calorias.toLocaleString('pt-BR') : '0'}
          </motion.span>
        </motion.div>

        {/* Duração */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex items-center justify-between p-4 rounded-xl backdrop-blur-[8px] bg-white/20 border border-white/25"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#1C1C1C] font-semibold text-sm">Duração</p>
              <p className="text-[#1C1C1C] opacity-60 text-xs">Tempo de treino</p>
            </div>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
            className="text-xl font-bold text-[#1C1C1C]"
          >
            {duracao || '0 min'}
          </motion.span>
        </motion.div>

        {/* Tipo de Treino */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center justify-between p-4 rounded-xl backdrop-blur-[8px] bg-white/20 border border-white/25"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-400 to-[#BFFF00]">
              <Activity className="w-5 h-5 text-[#1C1C1C]" />
            </div>
            <div>
              <p className="text-[#1C1C1C] font-semibold text-sm">Tipo de Treino</p>
              <p className="text-[#1C1C1C] opacity-60 text-xs">Modalidade</p>
            </div>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            className="text-sm font-bold text-[#1C1C1C] text-right max-w-[100px]"
          >
            {tipoTreino || 'Nenhum'}
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  )
}