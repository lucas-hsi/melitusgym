import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { toast } from 'react-hot-toast';

// Types for clinical data
export interface ClinicalLog {
  id: number;
  user_id: number;
  measurement_type: string;
  value: number;
  secondary_value?: number;
  unit: string;
  period?: string;
  notes?: string;
  measured_at: string;
  created_at: string;
}

export interface GlucoseReading {
  value: number;
  period: string;
  notes?: string;
  measured_at?: string;
}

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  heart_rate?: number;
  notes?: string;
  measured_at?: string;
}

export interface InsulinReading {
  units: number;
  insulin_type?: string;
  injection_site?: string;
  notes?: string;
  measured_at?: string;
}

// Clinical logs hooks
export const useClinicalLogs = (params?: {
  measurement_type?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['clinical-logs', params],
    queryFn: () => apiService.getClinicalLogs(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateClinicalLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createClinicalLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      toast.success('Registro clínico criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao criar registro clínico');
    },
  });
};

export const useUpdateClinicalLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiService.updateClinicalLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      toast.success('Registro clínico atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar registro clínico');
    },
  });
};

export const useDeleteClinicalLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.deleteClinicalLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      toast.success('Registro clínico excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao excluir registro clínico');
    },
  });
};

// Clinical stats hook
export const useClinicalStats = (days?: number) => {
  return useQuery({
    queryKey: ['clinical-stats', days],
    queryFn: () => apiService.getClinicalStats(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Glucose specific hooks
export const useGlucoseReadings = (params?: {
  date_from?: string;
  date_to?: string;
  period?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['glucose-readings', params],
    queryFn: () => apiService.getGlucoseReadings(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateGlucoseReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createGlucoseReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glucose-readings'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      queryClient.invalidateQueries({ queryKey: ['latest-glucose'] });
      queryClient.invalidateQueries({ queryKey: ['glucose-trend'] });
      toast.success('Leitura de glicemia registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao registrar glicemia');
    },
  });
};

export const useLatestGlucose = () => {
  return useQuery({
    queryKey: ['latest-glucose'],
    queryFn: apiService.getLatestGlucose,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGlucoseTrend = (days?: number) => {
  return useQuery({
    queryKey: ['glucose-trend', days],
    queryFn: () => apiService.getGlucoseTrend(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Blood pressure specific hooks
export const useBloodPressureReadings = (params?: {
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['blood-pressure-readings', params],
    queryFn: () => apiService.getBloodPressureReadings(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateBloodPressureReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createBloodPressureReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blood-pressure-readings'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      toast.success('Leitura de pressão arterial registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao registrar pressão arterial');
    },
  });
};

// Insulin specific hooks
export const useInsulinReadings = (params?: {
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['insulin-readings', params],
    queryFn: () => apiService.getInsulinReadings(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateInsulinReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createInsulinReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insulin-readings'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-stats'] });
      toast.success('Dose de insulina registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao registrar insulina');
    },
  });
};