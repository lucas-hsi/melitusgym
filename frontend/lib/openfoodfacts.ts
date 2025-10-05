// OpenFoodFacts API integration for nutritional data

interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name?: string;
    brands?: string;
    categories?: string;
    nutriments?: {
      energy_100g?: number;
      'energy-kcal_100g'?: number;
      carbohydrates_100g?: number;
      proteins_100g?: number;
      fat_100g?: number;
      fiber_100g?: number;
      sugars_100g?: number;
      salt_100g?: number;
      sodium_100g?: number;
    };
    nutriscore_grade?: string;
    nova_group?: number;
    ecoscore_grade?: string;
    image_url?: string;
    image_front_url?: string;
  };
  status: number;
  status_verbose: string;
}

interface NutritionData {
  name: string;
  brand?: string;
  calories: number; // per 100g
  carbohydrates: number; // per 100g
  proteins: number; // per 100g
  fats: number; // per 100g
  fiber?: number; // per 100g
  sugars?: number; // per 100g
  sodium?: number; // per 100g
  nutriscore?: string;
  imageUrl?: string;
  categories?: string[];
}

interface SearchResult {
  products: OpenFoodFactsProduct[];
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  skip: number;
}

class OpenFoodFactsService {
  private baseUrl = 'https://world.openfoodfacts.org';
  private userAgent = 'MelitusGym/1.0 (lucas@melitusgym.com)';

  /**
   * Search for food products by name
   */
  async searchProducts(query: string, limit: number = 20): Promise<NutritionData[]> {
    try {
      const searchUrl = `${this.baseUrl}/cgi/search.pl`;
      const params = new URLSearchParams({
        search_terms: query,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        fields: 'code,product_name,brands,categories,nutriments,nutriscore_grade,nova_group,image_url,image_front_url'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenFoodFacts API error: ${response.status}`);
      }

      const data: SearchResult = await response.json();
      
      return data.products
        .filter(product => product.product && product.product.nutriments)
        .map(product => this.transformProduct(product))
        .filter(nutrition => nutrition.calories > 0); // Filter out products without calorie data
    } catch (error) {
      console.error('Error searching OpenFoodFacts:', error);
      return [];
    }
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<NutritionData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v0/product/${barcode}.json`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenFoodFacts API error: ${response.status}`);
      }

      const data: OpenFoodFactsProduct = await response.json();
      
      if (data.status === 1 && data.product && data.product.nutriments) {
        return this.transformProduct(data);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      return null;
    }
  }

  /**
   * Search for products by detected food class
   */
  async searchByFoodClass(foodClass: string): Promise<NutritionData[]> {
    // Map COCO-SSD classes to better search terms
    const foodClassMap: Record<string, string> = {
      'banana': 'banana',
      'apple': 'apple',
      'orange': 'orange',
      'broccoli': 'broccoli',
      'carrot': 'carrot',
      'hot dog': 'hot dog sausage',
      'pizza': 'pizza',
      'donut': 'donut doughnut',
      'cake': 'cake',
      'sandwich': 'sandwich'
    };

    const searchTerm = foodClassMap[foodClass.toLowerCase()] || foodClass;
    return this.searchProducts(searchTerm, 10);
  }

  /**
   * Transform OpenFoodFacts product to our nutrition data format
   */
  private transformProduct(product: OpenFoodFactsProduct): NutritionData {
    const p = product.product;
    const nutriments = p.nutriments || {};

    return {
      name: p.product_name || 'Produto sem nome',
      brand: p.brands,
      calories: nutriments['energy-kcal_100g'] || nutriments.energy_100g || 0,
      carbohydrates: nutriments.carbohydrates_100g || 0,
      proteins: nutriments.proteins_100g || 0,
      fats: nutriments.fat_100g || 0,
      fiber: nutriments.fiber_100g,
      sugars: nutriments.sugars_100g,
      sodium: nutriments.sodium_100g || (nutriments.salt_100g ? nutriments.salt_100g * 0.4 : undefined),
      nutriscore: p.nutriscore_grade?.toUpperCase(),
      imageUrl: p.image_front_url || p.image_url,
      categories: p.categories ? p.categories.split(',').map(cat => cat.trim()) : undefined
    };
  }

  /**
   * Calculate glycemic index estimation based on food composition
   */
  calculateGlycemicIndex(nutrition: NutritionData): 'baixo' | 'medio' | 'alto' {
    const { carbohydrates, fiber = 0, sugars = 0 } = nutrition;
    
    // Simple heuristic for glycemic index estimation
    const netCarbs = carbohydrates - fiber;
    const sugarRatio = sugars / carbohydrates;
    
    if (netCarbs < 15 || fiber > 5) {
      return 'baixo';
    }
    
    if (sugarRatio > 0.7 || netCarbs > 30) {
      return 'alto';
    }
    
    return 'medio';
  }

  /**
   * Get nutrition data for multiple detected food items
   */
  async getNutritionForDetectedItems(detectedItems: Array<{ class: string; score: number }>): Promise<Array<NutritionData & { confidence: number; detectedClass: string }>> {
    const results = [];
    
    for (const item of detectedItems) {
      try {
        const nutritionData = await this.searchByFoodClass(item.class);
        
        if (nutritionData.length > 0) {
          // Take the first (most relevant) result
          const bestMatch = nutritionData[0];
          results.push({
            ...bestMatch,
            confidence: item.score,
            detectedClass: item.class
          });
        } else {
          // Fallback: create basic entry for unknown foods
          results.push({
            name: item.class,
            calories: 0,
            carbohydrates: 0,
            proteins: 0,
            fats: 0,
            confidence: item.score,
            detectedClass: item.class
          });
        }
      } catch (error) {
        console.error(`Error getting nutrition for ${item.class}:`, error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const openFoodFactsService = new OpenFoodFactsService();
export type { NutritionData };
export default OpenFoodFactsService;