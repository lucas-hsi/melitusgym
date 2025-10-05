"use client";
import { useState, useCallback } from "react";

export interface DayData {
  date: Date;
  glicemia?: number[];
  pressao?: { sistolica: number; diastolica: number }[];
  hidratacao?: number;
  treino?: boolean;
  carboidratos?: number;
  medicamentos?: string[];
  notas?: string;
}

export function useDaySelector(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const loadDayData = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      // Futura integração com API
      // const response = await fetch(`/api/logs?day=${formatDateForAPI(date)}`);
      // const data = await response.json();
      
      // Dados iniciais vazios - conectar com API real
      const initialData: DayData = {
        date,
        glicemia: [],
        pressao: [],
        hidratacao: 0,
        treino: false,
        carboidratos: 0,
        medicamentos: [],
        notas: ''
      };
      
      setDayData(initialData);
    } catch (error) {
      console.error('Erro ao carregar dados do dia:', error);
      setDayData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const changeDate = useCallback((newDate: Date) => {
    setSelectedDate(newDate);
    loadDayData(newDate);
  }, [loadDayData]);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    changeDate(newDate);
  }, [selectedDate, changeDate]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isYesterday = selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString();
  const isTomorrow = selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const getDayLabel = () => {
    if (isToday) return 'Hoje';
    if (isYesterday) return 'Ontem';
    if (isTomorrow) return 'Amanhã';
    return selectedDate.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric',
      month: 'long'
    });
  };

  return {
    selectedDate,
    dayData,
    loading,
    changeDate,
    navigateDay,
    loadDayData,
    isToday,
    isYesterday,
    isTomorrow,
    getDayLabel,
    formatDateForAPI
  };
}