"use client";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { DaySelector } from "@/components/layout/DaySelector";

interface LayoutBaseProps {
  title?: string;
  children: React.ReactNode;
  showDaySelector?: boolean;
}

export default function LayoutBase({ title, children, showDaySelector = true }: LayoutBaseProps) {
  console.info("[UI-PADRONIZATION] LayoutBase aplicado em todas as páginas.");
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900 relative">
      {/* Calendário Superior */}
      {showDaySelector && (
        <div className="px-4 pt-6 pb-2">
          <DaySelector />
        </div>
      )}
      
      {/* Header */}
      {title && (
        <header className="px-6 pt-4 pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            {title}
          </motion.h1>
        </header>
      )}

      {/* Conteúdo principal */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 px-4 pb-20"
      >
        {children}
      </motion.main>

      {/* Barra inferior */}
      <BottomNav />
    </div>
  );
}