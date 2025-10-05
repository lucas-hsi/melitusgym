'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface BotaoFlutuanteProps {
  onClick?: () => void
  texto?: string
}

export default function BotaoFlutuante({ 
  onClick, 
  texto = "+ Novo Treino" 
}: BotaoFlutuanteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <motion.button
        onClick={onClick}
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 8px 25px rgba(191, 255, 0, 0.4)"
        }}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: [1, 1.02, 1]
        }}
        transition={{
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className="bg-[#BFFF00] hover:bg-[#BFFF00]/90 text-[#1C1C1C] font-bold py-4 px-8 rounded-full shadow-[0_4px_20px_rgba(191,255,0,0.3)] border border-[#BFFF00]/50 backdrop-blur-[10px] transition-all duration-200 flex items-center space-x-2 min-w-[160px] justify-center"
      >
        <motion.div
          animate={{ rotate: [0, 90, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 8
          }}
        >
          <Plus className="w-5 h-5" />
        </motion.div>
        <span className="font-inter font-semibold text-sm">
          {texto}
        </span>
      </motion.button>
      
      {/* Efeito de ondas */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-[#BFFF00]/20 rounded-full -z-10"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.2, 0, 0.2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute inset-0 bg-[#BFFF00]/10 rounded-full -z-20"
      />
    </motion.div>
  )
}