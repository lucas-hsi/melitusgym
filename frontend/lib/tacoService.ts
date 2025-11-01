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
  base_reference: string;
  conversion_factor: number;
  calculation_method: string;
  latency_ms: number;
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

export interface InsulinCalculation {
  carbs: number;
  insulinDose: number;
  correctionDose?: number;
  totalDose: number;
  sensitivity: number;
  highGlycemicAdjustment?: number;
}

class TacoService {
  private baseUrl = '/api/nutrition/v2';

  /**
   * Busca alimentos na tabela TACO
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
      const response = await axios.post(`${this.baseUrl}/calc`, {
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