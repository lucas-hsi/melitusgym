"use client";
import React, { createContext, useContext, useReducer, useCallback } from "react";
import { DayData } from "@/hooks/useDaySelector";

interface HealthProfile {
  idade: number;
  peso: number;
  altura: number;
  imc: number;
  tipoCorporal: 'ectomorfo' | 'mesomorfo' | 'endomorfo';
  medicamentos: string[];
  historico: string[];
  objetivos: string[];
  nivelAtividade: 'sedentario' | 'leve' | 'moderado' | 'intenso';
  insulinSensitivity?: number; // Sensibilidade à insulina (g de carboidratos por 1U)
}

interface HealthMetrics {
  glicemiaMedia: number;
  pressaoMedia: { sistolica: number; diastolica: number };
  hidratacaoTotal: number;
  treinosRealizados: number;
  carboidratosMedio: number;
}

interface AIInsight {
  id: string;
  tipo: 'alerta' | 'sugestao' | 'parabenizacao';
  titulo: string;
  mensagem: string;
  prioridade: 'baixa' | 'media' | 'alta';
  dataGeracao: Date;
  moduloOrigem: 'treino' | 'saude' | 'nutricao' | 'geral';
}

interface HealthState {
  profile: HealthProfile | null;
  currentDayData: DayData | null;
  weeklyMetrics: HealthMetrics | null;
  aiInsights: AIInsight[];
  aiEnabled: boolean;
  loading: boolean;
  error: string | null;
}

type HealthAction =
  | { type: 'SET_PROFILE'; payload: HealthProfile }
  | { type: 'SET_DAY_DATA'; payload: DayData }
  | { type: 'SET_WEEKLY_METRICS'; payload: HealthMetrics }
  | { type: 'ADD_AI_INSIGHT'; payload: AIInsight }
  | { type: 'REMOVE_AI_INSIGHT'; payload: string }
  | { type: 'TOGGLE_AI'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialState: HealthState = {
  profile: null,
  currentDayData: null,
  weeklyMetrics: null,
  aiInsights: [],
  aiEnabled: true,
  loading: false,
  error: null,
};

function healthReducer(state: HealthState, action: HealthAction): HealthState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_DAY_DATA':
      return { ...state, currentDayData: action.payload };
    case 'SET_WEEKLY_METRICS':
      return { ...state, weeklyMetrics: action.payload };
    case 'ADD_AI_INSIGHT':
      return { 
        ...state, 
        aiInsights: [action.payload, ...state.aiInsights].slice(0, 10) // Máximo 10 insights
      };
    case 'REMOVE_AI_INSIGHT':
      return { 
        ...state, 
        aiInsights: state.aiInsights.filter(insight => insight.id !== action.payload)
      };
    case 'TOGGLE_AI':
      return { ...state, aiEnabled: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface HealthContextType {
  state: HealthState;
  updateProfile: (profile: HealthProfile) => void;
  updateDayData: (dayData: DayData) => void;
  generateAIInsight: (data: DayData) => Promise<void>;
  dismissInsight: (insightId: string) => void;
  toggleAI: (enabled: boolean) => void;
  calculateWeeklyMetrics: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(healthReducer, initialState);

  const updateProfile = useCallback((profile: HealthProfile) => {
    dispatch({ type: 'SET_PROFILE', payload: profile });
  }, []);

  const updateDayData = useCallback((dayData: DayData) => {
    dispatch({ type: 'SET_DAY_DATA', payload: dayData });
    
    // Gerar insights automáticos se IA estiver habilitada
    if (state.aiEnabled) {
      generateAIInsight(dayData);
    }
  }, [state.aiEnabled]);

  const generateAIInsight = useCallback(async (data: DayData) => {
    if (!state.aiEnabled) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Futura integração com IA local (Ollama + Mistral)
      // const response = await fetch('/api/ai/analyze', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ dayData: data, profile: state.profile })
      // });
      
      // Por enquanto, insights mock baseados nos dados
      const insights: AIInsight[] = [];
      
      // Análise de glicemia
      if (data.glicemia && data.glicemia.length > 0) {
        const mediaGlicemia = data.glicemia.reduce((a, b) => a + b, 0) / data.glicemia.length;
        if (mediaGlicemia > 140) {
          insights.push({
            id: `glicemia-${Date.now()}`,
            tipo: 'alerta',
            titulo: 'Glicemia Elevada',
            mensagem: 'Sua glicemia média hoje está acima do ideal. Considere revisar a alimentação.',
            prioridade: 'alta',
            dataGeracao: new Date(),
            moduloOrigem: 'saude'
          });
        } else if (mediaGlicemia < 70) {
          insights.push({
            id: `glicemia-baixa-${Date.now()}`,
            tipo: 'alerta',
            titulo: 'Risco de Hipoglicemia',
            mensagem: 'Glicemia baixa detectada. Tenha carboidratos de ação rápida por perto.',
            prioridade: 'alta',
            dataGeracao: new Date(),
            moduloOrigem: 'saude'
          });
        }
      }
      
      // Análise de hidratação
      if (data.hidratacao && data.hidratacao < 2.0) {
        insights.push({
          id: `hidratacao-${Date.now()}`,
          tipo: 'sugestao',
          titulo: 'Hidratação Insuficiente',
          mensagem: 'Você bebeu menos água que o recomendado hoje. Tente aumentar a ingestão.',
          prioridade: 'media',
          dataGeracao: new Date(),
          moduloOrigem: 'nutricao'
        });
      }
      
      // Análise de treino
      if (data.treino) {
        insights.push({
          id: `treino-${Date.now()}`,
          tipo: 'parabenizacao',
          titulo: 'Treino Realizado!',
          mensagem: 'Parabéns por manter a consistência no treino. Continue assim!',
          prioridade: 'baixa',
          dataGeracao: new Date(),
          moduloOrigem: 'treino'
        });
      }
      
      // Adicionar insights gerados
      insights.forEach(insight => {
        dispatch({ type: 'ADD_AI_INSIGHT', payload: insight });
      });
      
    } catch (error) {
      console.error('Erro ao gerar insights de IA:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao gerar insights de IA' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.aiEnabled, state.profile]);

  const dismissInsight = useCallback((insightId: string) => {
    dispatch({ type: 'REMOVE_AI_INSIGHT', payload: insightId });
  }, []);

  const toggleAI = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_AI', payload: enabled });
  }, []);

  const calculateWeeklyMetrics = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Futura integração com API
      // const response = await fetch('/api/metrics/weekly');
      // const metrics = await response.json();
      
      // Métricas mock para desenvolvimento
      const mockMetrics: HealthMetrics = {
        glicemiaMedia: 115,
        pressaoMedia: { sistolica: 125, diastolica: 80 },
        hidratacaoTotal: 14.5,
        treinosRealizados: 4,
        carboidratosMedio: 165
      };
      
      dispatch({ type: 'SET_WEEKLY_METRICS', payload: mockMetrics });
    } catch (error) {
      console.error('Erro ao calcular métricas semanais:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao calcular métricas semanais' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const value: HealthContextType = {
    state,
    updateProfile,
    updateDayData,
    generateAIInsight,
    dismissInsight,
    toggleAI,
    calculateWeeklyMetrics,
  };

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth deve ser usado dentro de um HealthProvider');
  }
  return context;
}

export type { HealthProfile, HealthMetrics, AIInsight, DayData };