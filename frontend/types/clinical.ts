// Tipos para o módulo de saúde
export type HealthMetricType = 'glicemia' | 'pressao' | 'hidratacao' | 'peso' | 'treino'
export type TrendType = 'up' | 'down' | 'stable'

export interface HealthMetric {
  id: number
  user_id: number
  type: HealthMetricType
  value: number
  secondary_value?: number
  unit: string
  notes?: string
  recorded_at: string
  created_at: string
}

export interface HealthMetricCreate {
  type: HealthMetricType
  value: number
  secondary_value?: number
  unit: string
  notes?: string
  recorded_at?: string
}

export interface HealthStats {
  type: HealthMetricType
  total_readings: number
  average_value: number
  min_value: number
  max_value: number
  last_reading?: HealthMetric
  trend: TrendType
  period_start: string
  period_end: string
}

// Interfaces para dados específicos de saúde
export interface GlicemiaData {
  id: number
  valor: number
  data: string
  notas?: string
  status: 'baixa' | 'normal' | 'alta' | 'muito_alta'
}

export interface PressaoData {
  id: number
  sistolica: number
  diastolica: number
  data: string
  notas?: string
  status: 'baixa' | 'normal' | 'elevada' | 'alta_estagio1' | 'alta_estagio2' | 'crise'
}

export interface HealthProfile {
  id: number
  nome: string
  idade: number
  peso: number
  altura: number
  tipo_diabetes?: string
  glucoseTarget?: number;
  medicamentos: string[]
  metas: {
    glicemia_jejum: number
    glicemia_pos_refeicao: number
    pressao_sistolica: number
    pressao_diastolica: number
    hidratacao_diaria: number
  }
}

// Formulários para entrada de dados
export interface GlicemiaFormData {
  valor: string
  notas: string
}

export interface PressaoFormData {
  sistolica: string
  diastolica: string
  notas: string
}

export interface HealthFormData {
  tipo: HealthMetricType
  valor: string
  valor_secundario?: string
  notas: string
}

// Funções utilitárias para status de saúde
export const getGlicemiaStatus = (valor: number): 'baixa' | 'normal' | 'alta' | 'muito_alta' => {
  if (valor < 70) return 'baixa'
  if (valor <= 140) return 'normal'
  if (valor <= 180) return 'alta'
  return 'muito_alta'
}

export const getPressaoStatus = (sistolica: number, diastolica: number): 'baixa' | 'normal' | 'elevada' | 'alta_estagio1' | 'alta_estagio2' | 'crise' => {
  if (sistolica < 90 || diastolica < 60) return 'baixa'
  if (sistolica < 120 && diastolica < 80) return 'normal'
  if (sistolica < 130 && diastolica < 80) return 'elevada'
  if (sistolica < 140 || diastolica < 90) return 'alta_estagio1'
  if (sistolica < 180 || diastolica < 120) return 'alta_estagio2'
  return 'crise'
}

// Cores para status
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'baixa':
      return 'text-blue-600 bg-blue-100'
    case 'normal':
      return 'text-green-600 bg-green-100'
    case 'elevada':
    case 'alta':
    case 'alta_estagio1':
      return 'text-yellow-600 bg-yellow-100'
    case 'muito_alta':
    case 'alta_estagio2':
    case 'crise':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'baixa': return 'Baixa'
    case 'normal': return 'Normal'
    case 'elevada': return 'Elevada'
    case 'alta': return 'Alta'
    case 'alta_estagio1': return 'Alta Estágio 1'
    case 'alta_estagio2': return 'Alta Estágio 2'
    case 'muito_alta': return 'Muito Alta'
    case 'crise': return 'Crise'
    default: return 'Desconhecido'
  }
}
