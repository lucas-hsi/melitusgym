// Serviço para busca e processamento de dados da tabela TACO
import axios from './axios-config';

export interface TacoNutrient {
  energy_kcal?: number;
  energy_kj?: number;
  carbohydrates?: number;
  proteins?: number;
  fat?: number;
  fiber?: number;
  sugars?: number;
  sodium?: number;
  salt?: number;
}

export interface TacoFood {
  id: string;
  source: string;
  name: string;
  category?: string;
  nutrients_per_100g: TacoNutrient;
  glycemic_index?: number;
}

export interface TacoSearchResponse {
  term: string;
  sources: string[];
  items: TacoFood[];
  total_found: number;
  search_time_ms?: number;
}

export interface CalculationResult {
  nutrients: TacoNutrient;
  portion: {
    value: number;
    unit: string;
  };
  base: {
    value: number;
    unit: string;
  };
  conversion_factor: number;
}

export interface TacoCategory {
  id: string;
  name: string;
  description?: string;
}

export interface CategoriesResponse {
  categories: TacoCategory[];
  total: number;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

class TacoService {
  private baseUrl = '/api';

  /**
   * Busca alimentos da base TACO
   * @param term Termo de busca
   * @param filters Filtros opcionais (source, category)
   * @returns Lista de alimentos encontrados
   */
  async searchTacoFoods(
    term: string,
    filters?: { source?: string[]; category?: string }
  ): Promise<TacoSearchResponse> {
    try {
      if (!term || term.trim().length === 0) {
        throw new Error('Termo de busca não pode estar vazio');
      }

      console.log('[TacoService] Buscando alimentos:', { term, filters });

      const params: any = { term };
      if (filters?.source && filters.source.length > 0) {
        params.source = filters.source.join(',');
      }
      if (filters?.category) {
        params.category = filters.category;
      }

      const response = await axios.get('/search-web', {
        params,
      });

      console.log('[TacoService] Resposta recebida:', response.data);

      return response.data;
    } catch (error: any) {
      console.error('[TacoService] Erro ao buscar alimentos:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.message || errorData.error || 'Erro ao buscar alimentos');
      }
      
      throw new Error('Erro ao conectar com o servidor');
    }
  }

  /**
   * Obtém categorias disponíveis
   * @returns Lista de categorias
   */
  async getCategories(): Promise<CategoriesResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/categories`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  /**
   * Calcula nutrição para uma porção específica usando endpoint do backend
   * @param nutrientsBase Nutrientes base (por 100g)
   * @param portionValue Valor da porção
   * @param portionUnit Unidade da porção
   * @param baseUnit Unidade base dos nutrientes
   * @returns Resultado do cálculo
   */
  async calculateNutrition(
    nutrientsBase: TacoNutrient,
    portionValue: number,
    portionUnit: string,
    baseUnit: string = '100g'
  ): Promise<CalculationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/nutrition/v2/calc`, {
        nutrients_base: nutrientsBase,
        portion_value: portionValue,
        portion_unit: portionUnit,
        base_unit: baseUnit
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao calcular nutrição:', error);
      throw error;
    }
  }

  /**
   * Calcula nutrientes localmente para uma porção específica
   * @param nutrientsBase Nutrientes base (por 100g)
   * @param portionValue Valor da porção em gramas
   * @returns Nutrientes calculados
   */
  calculateNutritionLocally(nutrientsBase: TacoNutrient, portionValue: number): TacoNutrient {
    if (!nutrientsBase || portionValue <= 0) {
      throw new Error('Parâmetros inválidos para cálculo de nutrição');
    }

    const factor = portionValue / 100;
    const result: TacoNutrient = {};

    // Calcula cada nutriente
    for (const [key, value] of Object.entries(nutrientsBase)) {
      if (value !== undefined && value !== null) {
        result[key as keyof TacoNutrient] = parseFloat((value * factor).toFixed(2));
      }
    }

    return result;
  }
}

export default new TacoService();
