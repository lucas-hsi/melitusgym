'use client'

import { motion } from 'framer-motion'
import { Activity, Dumbbell, Heart, Zap } from 'lucide-react'

interface Atividade {
  id: number
  tipo: string
  icone: 'activity' | 'dumbbell' | 'heart' | 'zap'
  tempo: string
  calorias: number
  dataHora: string
  cor: string
}

interface CardAtividadesRecentesProps {
  atividades?: Atividade[]
}

const iconeMap = {
  activity: Activity,
  dumbbell: Dumbbell,
  heart: Heart,
  zap: Zap
}

const atividadesDefault: Atividade[] = [
  {
    id: 1,
    tipo: "Corrida",
    icone: "activity",
    tempo: "30 min",
    calorias: 320,
    dataHora: "Hoje, 07:30",
    cor: "from-blue-400 to-blue-600"
  },
  {
    id: 2,
    tipo: "Musculação",
    icone: "dumbbell",
    tempo: "45 min",
    calorias: 280,
    dataHora: "Hoje, 09:15",
    cor: "from-purple-400 to-purple-600"
  },
  {
    id: 3,
    tipo: "Cardio HIIT",
    icone: "zap",
    tempo: "20 min",
    calorias: 250,
    dataHora: "Ontem, 18:00",
    cor: "from-orange-400 to-red-500"
  }
]

export default function CardAtividadesRecentes({ atividades = atividadesDefault }: CardAtividadesRecentesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="backdrop-blur-[10px] bg-white/25 border border-white/30 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-6 mb-6"
    >
      {/* Título */}
      <motion.h3
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-xl font-bold text-[#1C1C1C] font-inter mb-4"
      >
        Últimas Atividades
      </motion.h3>

      {/* Lista de Atividades */}
      <div className="space-y-3">
        {atividades.map((atividade, index) => {
          const IconeComponent = iconeMap[atividade.icone]
          
          return (
            <motion.div
              key={atividade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.3 + (index * 0.1), 
                duration: 0.5,
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl p-4 hover:bg-white/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                {/* Ícone e Info Principal */}
                <div className="flex items-center space-x-3 flex-1">
                  <motion.div
                    whileHover={{ rotate: 5 }}
                    className={`p-2 rounded-lg bg-gradient-to-br ${atividade.cor} shadow-lg`}
                  >
                    <IconeComponent className="w-4 h-4 text-white" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[#1C1C1C] font-semibold text-sm">
                        {atividade.tipo}
                      </p>
                      <span className="text-[#1C1C1C] opacity-60 text-xs">
                        {atividade.dataHora}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[#1C1C1C] opacity-70 text-xs font-medium">
                        {atividade.tempo}
                      </span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          delay: 0.5 + (index * 0.1), 
                          type: "spring", 
                          stiffness: 200 
                        }}
                        className="text-[#1C1C1C] font-bold text-sm bg-[#BFFF00]/20 px-2 py-1 rounded-full"
                      >
                        {atividade.calorias} cal
                      </motion.span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Botão Ver Mais */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-4 py-3 backdrop-blur-[8px] bg-white/20 border border-white/25 rounded-xl text-[#1C1C1C] font-semibold text-sm hover:bg-white/30 transition-all duration-200"
      >
        Ver todas as atividades
      </motion.button>
    </motion.div>
  )
}