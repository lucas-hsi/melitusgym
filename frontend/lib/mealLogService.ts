// Serviço para gerenciamento do histórico de refeições
import axios from './axios-config';
import { TacoNutrient } from './tacoService';

export interface MealLogItem {
  id: string;
  name: string;
  source: string;
  grams: number;
  nutrients: TacoNutrient;
}

export interface MealLog {
  id: number;
  user_id: string;
  meal_time: string;
  meal_date: string;
  items: MealLogItem[];
  total_nutrients: TacoNutrient;
  notes?: string;
  // Campos clínicos
  carbohydrates_total?: number;
  glucose_value?: number;
  glucose_measured?: boolean;
  glucose_measure_timing?: string;
  insulin_recommended_units?: number;
  insulin_applied_units?: number;
  created_at: string;
  updated_at?: string;
}

export interface MealLogCreate {
  meal_time: string;
  meal_date: string;
  items: MealLogItem[];
  total_nutrients: TacoNutrient;
  notes?: string;
  // Campos clínicos opcionais na criação
  carbohydrates_total?: number;
  glucose_value?: number;
  glucose_measured?: boolean;
  glucose_measure_timing?: string;
  insulin_recommended_units?: number;
  insulin_applied_units?: number;
  recorded_at?: string;
}

export interface MealLogUpdate {
  meal_time?: string;
  meal_date?: string;
  items?: MealLogItem[];
  total_nutrients?: TacoNutrient;
  notes?: string;
  // Campos clínicos opcionais na atualização
  carbohydrates_total?: number;
  glucose_value?: number;
  glucose_measured?: boolean;
  glucose_measure_timing?: string;
  insulin_recommended_units?: number;
  insulin_applied_units?: number;
  recorded_at?: string;
}

class MealLogService {
  private baseUrl = '/meal-logs';

  /**
   * Cria um novo registro de refeição
   * @param mealLog Dados da refeição
   * @returns Registro de refeição criado
   */
  async createMealLog(mealLog: MealLogCreate): Promise<MealLog> {
    try {
      const response = await axios.post(this.baseUrl, mealLog);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar registro de refeição:', error);
      throw error;
    }
  }

  /**
   * Obtém registros de refeição com filtros
   * @param startDate Data inicial
   * @param endDate Data final
   * @param mealTime Momento da refeição
   * @param limit Limite de registros
   * @param offset Offset para paginação
   * @returns Lista de registros de refeição
   */
  async getMealLogs(
    startDate?: Date,
    endDate?: Date,
    mealTime?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<MealLog[]> {
    try {
      const params: any = { limit, offset };
      
      if (startDate) {
        params.start_date = startDate.toISOString();
      }
      
      if (endDate) {
        params.end_date = endDate.toISOString();
      }
      
      if (mealTime) {
        params.meal_time = mealTime;
      }
      
      const response = await axios.get(this.baseUrl, { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter registros de refeição:', error);
      throw error;
    }
  }

  /**
   * Obtém registros de refeição recentes
   * @param days Número de dias para buscar
   * @returns Lista de registros de refeição
   */
  async getRecentMealLogs(days: number = 7): Promise<MealLog[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/recent`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter registros de refeição recentes:', error);
      throw error;
    }
  }

  /**
   * Obtém um registro de refeição específico
   * @param id ID do registro
   * @returns Registro de refeição
   */
  async getMealLog(id: number): Promise<MealLog> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter registro de refeição ${id}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza um registro de refeição
   * @param id ID do registro
   * @param mealLog Dados para atualização
   * @returns Registro de refeição atualizado
   */
  async updateMealLog(id: number, mealLog: MealLogUpdate): Promise<MealLog> {
    try {
      const response = await axios.put(`${this.baseUrl}/${id}`, mealLog);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar registro de refeição ${id}:`, error);
      throw error;
    }
  }

  /**
   * Exclui um registro de refeição
   * @param id ID do registro
   */
  async deleteMealLog(id: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Erro ao excluir registro de refeição ${id}:`, error);
      throw error;
    }
  }

  /**
   * Formata a data para exibição
   * @param dateString String de data
   * @returns Data formatada
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formata a hora para exibição
   * @param dateString String de data
   * @returns Hora formatada
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new MealLogService();