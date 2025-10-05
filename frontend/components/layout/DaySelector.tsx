"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DaySelectorProps {
  onDateChange?: (date: Date) => void;
}

export function DaySelector({ onDateChange }: DaySelectorProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDayName = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
    
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    });
  };

  const getDaysArray = () => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    handleDateSelect(newDate);
  };

  return (
    <div className="flex items-center justify-between bg-white/30 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg">
      {/* Botão Anterior */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigateDay('prev')}
        className="p-2 rounded-xl bg-white/40 hover:bg-white/60 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </motion.button>

      {/* Lista de Dias */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
        {getDaysArray().map((date, index) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <motion.button
              key={date.toISOString()}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateSelect(date)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isToday
                  ? 'bg-blue-100 text-blue-600 border border-blue-200'
                  : 'bg-white/40 text-gray-600 hover:bg-white/60'
              }`}
            >
              {getDayName(date)}
            </motion.button>
          );
        })}
      </div>

      {/* Botão Próximo */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => navigateDay('next')}
        className="p-2 rounded-xl bg-white/40 hover:bg-white/60 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </motion.button>
    </div>
  );
}