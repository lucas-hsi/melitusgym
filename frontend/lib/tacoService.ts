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

export interface TacoOnlineSearchResponse {
  query: string;
  items: Array<{
    nome: string;
    categoria: string;
    kcal: number | null;
    carb: number | null;
    prot: number | null;
    lip: number | null;
    fibra: number | null;
    porcao: string;
    porcao_gr: number;
  }>;
  count: number;
  total_found: number;
  source: string;
  cached: boolean;
  search_time_ms: number;
  timestamp: string;
  error?: string;
  message?: string;
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

export interface InsulinCalculation {
  carbs: number;
  insulinDose: number;
  correctionDose?: number;
  totalDose: number;
  sensitivity: number;
  highGlycemicAdjustment?: number;
}

export interface ItemWithCalculation {
  item: {
    id: string;
    source: string;
    name: string;
    brands?: string;
    original_serving?: {
      size?: string | number;
      quantity?: string;
    };
  };
  calculation: CalculationResult;
  data_source_method: string;
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
<<<<<<< HEAD
   * Busca alimentos na TACO usando web scraping (novo endpoint)
   * @param query Termo de busca (mínimo 2 caracteres)
   * @param limit Número máximo de resultados (1-50, padrão: 20)
   * @returns Resposta da busca com dados do web scraping
   */
  async searchTacoOnline(query: string, limit: number = 20): Promise<TacoOnlineSearchResponse> {
    try {
      // Validação de entrada
      if (!query || query.trim().length < 2) {
        throw new Error('O termo de busca deve ter pelo menos 2 caracteres');
      }

      if (limit < 1 || limit > 50) {
        throw new Error('O limite deve estar entre 1 e 50');
      }

      const response = await axios.get('/api/taco/search', {
        params: {
          query: query.trim(),
          limit
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar alimentos TACO online:', error);
      
      // Se o erro veio do backend, tenta extrair mensagem
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw error;
    }
  }

  /**
   * Converte resultado do web scraping TACO para formato TacoFood
   * @param item Item do web scraping
   * @returns Objeto TacoFood normalizado
   */
  convertTacoOnlineToTacoFood(item: TacoOnlineSearchResponse['items'][0]): TacoFood {
    return {
      id: `taco_online_${item.nome.toLowerCase().replace(/\s+/g, '_')}`,
      source: 'taco_online',
      name: item.nome,
      category: item.categoria,
      nutrients_per_100g: {
        energy_kcal: item.kcal ?? undefined,
        carbohydrates: item.carb ?? undefined,
        proteins: item.prot ?? undefined,
        fat: item.lip ?? undefined,
        fiber: item.fibra ?? undefined,
      }
    };
  }

  /**
   * Busca alimentos na tabela TACO (método legado - mantido para compatibilidade)
   * @param term Termo de busca
   * @param pageSize Número de resultados por página
   * @returns Resposta da busca
   */
  async searchFoods(term: string, pageSize: number = 20): Promise<TacoSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          term,
          page_size: pageSize
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar alimentos:', error);
      throw error;
    }
  }

  /**
   * Obtém item com cálculo nutricional para porção específica
   * @param id ID do item
   * @param source Fonte dos dados
   * @param portionValue Valor da porção
   * @param portionUnit Unidade da porção
   * @returns Item com cálculo nutricional
   */
  async getItemWithCalculation(
    id: string,
    source: string,
    portionValue: number,
    portionUnit: string
  ): Promise<ItemWithCalculation> {
    try {
      const response = await axios.get(`${this.baseUrl}/item`, {
        params: {
          id,
          source,
          portion_value: portionValue,
          portion_unit: portionUnit
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter item com cálculo:', error);
      throw error;
    }
  }

  /**
   * Calcula dose de insulina com base nos carboidratos
   * @param carbs Quantidade de carboidratos em gramas
   * @param sensitivity Sensibilidade à insulina (g de carboidratos por 1U de insulina)
   * @param highGlycemicAdjustment Ajuste percentual para alimentos de alto índice glicêmico (opcional)
   * @returns Cálculo de insulina
   */
  calculateInsulin(
    carbs: number,
    sensitivity: number,
    highGlycemicAdjustment?: number
  ): InsulinCalculation {
    if (!carbs || !sensitivity || sensitivity <= 0) {
      throw new Error('Parâmetros inválidos para cálculo de insulina');
    }

    // Cálculo básico de insulina
    const insulinDose = carbs / sensitivity;
    
    // Cálculo da dose de correção para alimentos de alto índice glicêmico
    let correctionDose = 0;
    if (highGlycemicAdjustment && highGlycemicAdjustment > 0) {
      correctionDose = (carbs * (highGlycemicAdjustment / 100)) / sensitivity;
    }
    
    // Dose total
    const totalDose = insulinDose + correctionDose;
    
    return {
      carbs,
      insulinDose,
      correctionDose: correctionDose > 0 ? correctionDose : undefined,
      totalDose,
      sensitivity,
      highGlycemicAdjustment
    };
  }

  /**
   * Calcula nutrientes para uma porção específica
=======
   * Calcula nutrição para uma porção específica usando endpoint do backend
>>>>>>> 8ec0140021debe97454f9572570fb9e70d123e4c
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
