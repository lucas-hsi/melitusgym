"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import LayoutBase from "@/components/layout/LayoutBase";
import { useDaySelector } from "@/hooks/useDaySelector";
import { useHealth } from "@/contexts/HealthContext";
import {
  useGlucoseReadings,
  useCreateGlucoseReading,
  useBloodPressureReadings,
  useCreateBloodPressureReading,
  useInsulinReadings,
  useCreateInsulinReading,
  useClinicalStats
} from "@/hooks/useClinical";
import { 
  Heart, 
  Activity, 
  Pill, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  Target,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";

// Validation schemas
const glucoseSchema = z.object({
  value: z.number().min(20).max(600),
  period: z.enum(['FASTING', 'PRE_MEAL', 'POST_MEAL', 'BEDTIME']),
  notes: z.string().optional(),
});

const bloodPressureSchema = z.object({
  systolic: z.number().min(70).max(250),
  diastolic: z.number().min(40).max(150),
  heart_rate: z.number().min(40).max(200).optional(),
  notes: z.string().optional(),
});

const insulinSchema = z.object({
  units: z.number().min(0.5).max(100),
  insulin_type: z.string().optional(),
  injection_site: z.string().optional(),
  notes: z.string().optional(),
});

type GlucoseFormData = z.infer<typeof glucoseSchema>;
type BloodPressureFormData = z.infer<typeof bloodPressureSchema>;
type InsulinFormData = z.infer<typeof insulinSchema>;

export default function SaudePage() {
  const { selectedDate, dayData, getDayLabel } = useDaySelector();
  const { state } = useHealth();
  const [showNovoRegistro, setShowNovoRegistro] = useState<'glicemia' | 'pressao' | 'insulina' | null>(null);
  
  // Get today's date range for filtering (start and end of day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  // API hooks
  const { data: glucoseData, isLoading: glucoseLoading, error: glucoseError } = useGlucoseReadings({
    date_from: todayStart.toISOString(),
    date_to: todayEnd.toISOString(),
    limit: 20
  });
  
  const { data: bloodPressureData, isLoading: bpLoading, error: bpError } = useBloodPressureReadings({
    date_from: todayStart.toISOString(),
    date_to: todayEnd.toISOString(),
    limit: 20
  });
  
  const { data: insulinData, isLoading: insulinLoading, error: insulinError } = useInsulinReadings({
    date_from: todayStart.toISOString(),
    date_to: todayEnd.toISOString(),
    limit: 20
  });
  
  const { data: statsData, isLoading: statsLoading } = useClinicalStats(1);
  
  // Mutations
  const createGlucoseMutation = useCreateGlucoseReading();
  const createBloodPressureMutation = useCreateBloodPressureReading();
  const createInsulinMutation = useCreateInsulinReading();
  
  // Forms
  const glucoseForm = useForm<GlucoseFormData>({
    resolver: zodResolver(glucoseSchema),
    defaultValues: {
      period: 'PRE_MEAL'
    }
  });
  
  const bloodPressureForm = useForm<BloodPressureFormData>({
    resolver: zodResolver(bloodPressureSchema)
  });
  
  const insulinForm = useForm<InsulinFormData>({
    resolver: zodResolver(insulinSchema)
  });

  // Extract data from API responses
  const registrosGlicemia = glucoseData?.data || [];
  const registrosPressao = bloodPressureData?.data || [];
  const registrosInsulina = insulinData?.data || [];
  
  // Loading states
  const isLoading = glucoseLoading || bpLoading || insulinLoading || statsLoading;
  
  // Error handling with useEffect to avoid setState during render
  useEffect(() => {
    if (glucoseError || bpError || insulinError) {
      toast.error('Erro ao carregar dados clínicos');
    }
  }, [glucoseError, bpError, insulinError]);

  // Form submission handlers
  const onSubmitGlucose = async (data: GlucoseFormData) => {
    try {
      await createGlucoseMutation.mutateAsync({
        ...data,
        measured_at: new Date().toISOString()
      });
      glucoseForm.reset();
      setShowNovoRegistro(null);
    } catch (error) {
      console.error('Erro ao salvar glicemia:', error);
    }
  };
  
  const onSubmitBloodPressure = async (data: BloodPressureFormData) => {
    try {
      await createBloodPressureMutation.mutateAsync({
        ...data,
        measured_at: new Date().toISOString()
      });
      bloodPressureForm.reset();
      setShowNovoRegistro(null);
    } catch (error) {
      console.error('Erro ao salvar pressão:', error);
    }
  };
  
  const onSubmitInsulin = async (data: InsulinFormData) => {
    try {
      await createInsulinMutation.mutateAsync({
        ...data,
        measured_at: new Date().toISOString()
      });
      insulinForm.reset();
      setShowNovoRegistro(null);
    } catch (error) {
      console.error('Erro ao salvar insulina:', error);
    }
  };

  // Helper functions
  const getGlicemiaColor = (valor: number) => {
    if (valor < 70) return 'text-red-600 bg-red-100';
    if (valor > 140) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getPressaoColor = (sistolica: number, diastolica: number) => {
    if (sistolica > 140 || diastolica > 90) return 'text-red-600 bg-red-100';
    if (sistolica > 130 || diastolica > 80) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };
  
  const formatPeriod = (period: string) => {
    const periods: Record<string, string> = {
      'FASTING': 'Jejum',
      'PRE_MEAL': 'Pré-refeição',
      'POST_MEAL': 'Pós-refeição',
      'BEDTIME': 'Antes de dormir'
    };
    return periods[period] || period;
  };

  const calcularMediaGlicemia = () => {
    if (registrosGlicemia.length === 0) return 0;
    const soma = registrosGlicemia.reduce((acc: number, reg: any) => acc + reg.value, 0);
    return Math.round(soma / registrosGlicemia.length);
  };

  const calcularMediaPressao = () => {
    if (registrosPressao.length === 0) return { sistolica: 0, diastolica: 0 };
    const somaSistolica = registrosPressao.reduce((acc: number, reg: any) => acc + reg.systolic, 0);
    const somaDiastolica = registrosPressao.reduce((acc: number, reg: any) => acc + reg.diastolic, 0);
    return {
      sistolica: Math.round(somaSistolica / registrosPressao.length),
      diastolica: Math.round(somaDiastolica / registrosPressao.length)
    };
  };

  const mediaGlicemia = calcularMediaGlicemia();
  const mediaPressao = calcularMediaPressao();
  
  if (isLoading) {
    return (
      <LayoutBase title="Saúde">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutBase>
    );
  }

  return (
    <LayoutBase title={`Saúde - ${getDayLabel()}`}>
      <div className="space-y-6">
        {/* Resumo do Dia */}
        <div className="grid grid-cols-2 gap-4">
          {/* Card Glicemia */}
          <div className="bg-white/30 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Glicemia</h3>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`text-2xl font-bold mb-1 ${getGlicemiaColor(mediaGlicemia).split(' ')[0]}`}>
              {mediaGlicemia} mg/dL
            </div>
            <div className="text-sm text-gray-600">
              {registrosGlicemia.length} medições hoje
            </div>
          </div>

          {/* Card Pressão */}
          <div className="bg-white/30 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Pressão</h3>
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className={`text-2xl font-bold mb-1 ${getPressaoColor(mediaPressao.sistolica, mediaPressao.diastolica).split(' ')[0]}`}>
              {mediaPressao.sistolica}/{mediaPressao.diastolica}
            </div>
            <div className="text-sm text-gray-600">
              {registrosPressao.length} medições hoje
            </div>
          </div>
        </div>

        {/* Insulina */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Pill className="w-5 h-5 mr-2 text-purple-500" />
              Insulina
            </h2>
            <button
              onClick={() => setShowNovoRegistro('insulina')}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
          
          {showNovoRegistro === 'insulina' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-purple-50 rounded-xl p-4 mb-4"
            >
              <form onSubmit={insulinForm.handleSubmit(onSubmitInsulin)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Unidades"
                      {...insulinForm.register('units', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {insulinForm.formState.errors.units && (
                      <p className="text-red-500 text-xs mt-1">{insulinForm.formState.errors.units.message}</p>
                    )}
                  </div>
                  <div>
                    <select
                      {...insulinForm.register('insulin_type')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Tipo de insulina</option>
                      <option value="Rápida">Rápida</option>
                      <option value="Lenta">Lenta</option>
                      <option value="Mista">Mista</option>
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Local da aplicação (opcional)"
                    {...insulinForm.register('injection_site')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Observações (opcional)"
                    {...insulinForm.register('notes')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={createInsulinMutation.isPending}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    {createInsulinMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNovoRegistro(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
          
          <div className="space-y-2">
            {registrosInsulina.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum registro de insulina hoje</p>
            ) : (
              registrosInsulina.map((registro: any) => (
                <div key={registro.id} className="flex items-center justify-between bg-white/40 rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                      {registro.units} UI
                    </div>
                    {registro.insulin_type && (
                      <span className="text-sm text-gray-600">{registro.insulin_type}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(registro.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registros de Glicemia */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Registros de Glicemia</h2>
            <button
              onClick={() => setShowNovoRegistro('glicemia')}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
          
          {showNovoRegistro === 'glicemia' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-blue-50 rounded-xl p-4 mb-4"
            >
              <form onSubmit={glucoseForm.handleSubmit(onSubmitGlucose)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="Valor (mg/dL)"
                      {...glucoseForm.register('value', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {glucoseForm.formState.errors.value && (
                      <p className="text-red-500 text-xs mt-1">{glucoseForm.formState.errors.value.message}</p>
                    )}
                  </div>
                  <div>
                    <select
                      {...glucoseForm.register('period')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FASTING">Jejum</option>
                      <option value="PRE_MEAL">Pré-refeição</option>
                      <option value="POST_MEAL">Pós-refeição</option>
                      <option value="BEDTIME">Antes de dormir</option>
                    </select>
                  </div>
                </div>
                <div>
                  <textarea
                    placeholder="Observações (opcional)"
                    {...glucoseForm.register('notes')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={createGlucoseMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {createGlucoseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNovoRegistro(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
          
          <div className="space-y-2">
            {registrosGlicemia.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum registro de glicemia hoje</p>
            ) : (
              registrosGlicemia.map((registro: any) => (
                <div key={registro.id} className="flex items-center justify-between bg-white/40 rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getGlicemiaColor(registro.value)}`}>
                      {registro.value} mg/dL
                    </div>
                    <span className="text-sm text-gray-600">{formatPeriod(registro.period)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(registro.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registros de Pressão */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Registros de Pressão</h2>
            <button
              onClick={() => setShowNovoRegistro('pressao')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
          
          {showNovoRegistro === 'pressao' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 rounded-xl p-4 mb-4"
            >
              <form onSubmit={bloodPressureForm.handleSubmit(onSubmitBloodPressure)} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="Sistólica"
                      {...bloodPressureForm.register('systolic', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    {bloodPressureForm.formState.errors.systolic && (
                      <p className="text-red-500 text-xs mt-1">{bloodPressureForm.formState.errors.systolic.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Diastólica"
                      {...bloodPressureForm.register('diastolic', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    {bloodPressureForm.formState.errors.diastolic && (
                      <p className="text-red-500 text-xs mt-1">{bloodPressureForm.formState.errors.diastolic.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="FC (opcional)"
                      {...bloodPressureForm.register('heart_rate', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    placeholder="Observações (opcional)"
                    {...bloodPressureForm.register('notes')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={createBloodPressureMutation.isPending}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {createBloodPressureMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNovoRegistro(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
          
          <div className="space-y-2">
            {registrosPressao.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum registro de pressão hoje</p>
            ) : (
              registrosPressao.map((registro: any) => (
                <div key={registro.id} className="flex items-center justify-between bg-white/40 rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPressaoColor(registro.systolic, registro.diastolic)}`}>
                      {registro.systolic}/{registro.diastolic} mmHg
                    </div>
                    {registro.heart_rate && (
                      <span className="text-sm text-gray-600">FC: {registro.heart_rate}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(registro.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Insights de IA */}
        {state.aiInsights.filter(insight => insight.moduloOrigem === 'saude').length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
              Insights de IA
            </h3>
            <div className="space-y-2">
              {state.aiInsights
                .filter(insight => insight.moduloOrigem === 'saude')
                .map(insight => (
                  <div key={insight.id} className={`p-3 rounded-lg ${
                    insight.prioridade === 'alta' ? 'bg-red-100 border border-red-200' :
                    insight.prioridade === 'media' ? 'bg-orange-100 border border-orange-200' :
                    'bg-blue-100 border border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {insight.prioridade === 'alta' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                      <div>
                        <div className="font-medium text-gray-800">{insight.titulo}</div>
                        <div className="text-sm text-gray-600">{insight.mensagem}</div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </LayoutBase>
  );
}