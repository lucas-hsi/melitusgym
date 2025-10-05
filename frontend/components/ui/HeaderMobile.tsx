'use client'

import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'

interface User {
  id: number
  nome: string
  email: string
  created_at: string
}

interface HeaderMobileProps {
  user?: User
}

export default function HeaderMobile({ user }: HeaderMobileProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 backdrop-blur-[10px] bg-white/25 border-b border-white/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
    >
      <div className="px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Avatar do usuário à esquerda */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#BFFF00] to-[#C5F36E] flex items-center justify-center shadow-lg"
          >
            <span className="text-[#1C1C1C] font-bold text-sm">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          </motion.div>

          {/* Nome do app centralizado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex-1 text-center"
          >
            <h1 className="text-xl font-bold text-[#1C1C1C] font-inter">
              Melitus Gym
            </h1>
          </motion.div>

          {/* Ícone de notificação à direita com badge */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 rounded-full backdrop-blur-[10px] bg-white/20 border border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-white/30 transition-all duration-200"
          >
            <Bell className="w-5 h-5 text-[#212121] opacity-70" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-full h-full bg-red-500 rounded-full"
              />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}