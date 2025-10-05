import logging
from typing import Dict, Optional, Any, Tuple
from datetime import datetime
from .nutrition_connectors import NutritionConnectorService

logger = logging.getLogger(__name__)

class NutritionCalculatorService:
    """Serviço para cálculo nutricional por porção"""
    
    def __init__(self):
        self.connector_service = NutritionConnectorService()
    
    async def calculate_portion_nutrition(
        self, 
        nutrients_base: Dict[str, Optional[float]], 
        portion_value: float, 
        portion_unit: str,
        base_unit: str = "100g"
    ) -> Dict[str, Any]:
        """Calcula nutrientes para uma porção específica"""
        
        start_time = datetime.now()
        
        try:
            # Determina o fator de conversão
            conversion_factor = self._calculate_conversion_factor(
                portion_value, portion_unit, base_unit
            )
            
            # Calcula nutrientes para a porção
            calculated_nutrients = {}
            for nutrient, value in nutrients_base.items():
                if value is not None:
                    calculated_nutrients[nutrient] = round(value * conversion_factor, 2)
                else:
                    calculated_nutrients[nutrient] = None
            
            # Converte energia de kJ para kcal se necessário
            if calculated_nutrients.get("energy_kj") and not calculated_nutrients.get("energy_kcal"):
                calculated_nutrients["energy_kcal"] = round(
                    calculated_nutrients["energy_kj"] / 4.184, 2
                )
            
            latency = (datetime.now() - start_time).total_seconds()
            
            result = {
                "nutrients": calculated_nutrients,
                "portion": {
                    "value": portion_value,
                    "unit": portion_unit
                },
                "base_reference": base_unit,
                "conversion_factor": conversion_factor,
                "calculation_method": "proportional_conversion",
                "latency_ms": round(latency * 1000, 2)
            }
            
            logger.info(
                f"Nutrition calculation completed - portion: {portion_value}{portion_unit}, "
                f"factor: {conversion_factor}, latency: {latency:.3f}s"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Nutrition calculation failed: {str(e)}")
            raise
    
    async def get_item_with_calculation(
        self, 
        item_id: str, 
        source: str, 
        portion_value: float, 
        portion_unit: str
    ) -> Dict[str, Any]:
        """Obtém item e calcula nutrição para porção específica"""
        
        try:
            # Busca dados do item
            item_data = await self._get_item_data(item_id, source)
            
            if not item_data:
                raise ValueError(f"Item not found: {item_id} from {source}")
            
            # Determina se usar dados por porção ou por 100g
            nutrients_base, base_unit, method = self._extract_base_nutrients(item_data)
            
            # Calcula nutrição para a porção desejada
            calculation_result = await self.calculate_portion_nutrition(
                nutrients_base, portion_value, portion_unit, base_unit
            )
            
            # Combina dados do item com cálculo
            result = {
                "item": {
                    "id": item_id,
                    "source": source,
                    "name": item_data.get("name"),
                    "brands": item_data.get("brands"),
                    "original_serving": {
                        "size": item_data.get("serving_size"),
                        "quantity": item_data.get("serving_quantity")
                    }
                },
                "calculation": calculation_result,
                "data_source_method": method
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Item calculation failed - id: {item_id}, source: {source}, error: {str(e)}")
            raise
    
    async def _get_item_data(self, item_id: str, source: str) -> Optional[Dict[str, Any]]:
        """Busca dados do item na fonte especificada"""
        
        try:
            if source == "openfoodfacts":
                response = await self.connector_service.off_connector.get_product(item_id)
                if response.get("status") == 1 and response.get("product"):
                    products = [response["product"]]
                    normalized = self.connector_service._normalize_off_products(products)
                    return normalized[0] if normalized else None
            
            elif source == "usda_fdc":
                response = await self.connector_service.fdc_connector.get_food_details(int(item_id))
                if response:
                    foods = [response]
                    normalized = self.connector_service._normalize_fdc_foods(foods)
                    return normalized[0] if normalized else None
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get item data - id: {item_id}, source: {source}, error: {str(e)}")
            return None
    
    def _extract_base_nutrients(self, item_data: Dict[str, Any]) -> Tuple[Dict[str, Optional[float]], str, str]:
        """Extrai nutrientes base e determina método de cálculo"""
        
        # Verifica se há dados de porção específica
        serving_size = item_data.get("serving_size")
        serving_quantity = item_data.get("serving_quantity")
        
        if serving_size and serving_quantity:
            # Tenta usar dados por porção se disponíveis
            serving_nutrients = item_data.get("nutrients_per_serving")
            if serving_nutrients and any(v is not None for v in serving_nutrients.values()):
                return serving_nutrients, f"{serving_size}{serving_quantity}", "direct_serving"
        
        # Fallback para dados por 100g
        nutrients_100g = item_data.get("nutrients_per_100g", {})
        return nutrients_100g, "100g", "converted_from_100g"
    
    def _calculate_conversion_factor(
        self, 
        portion_value: float, 
        portion_unit: str, 
        base_unit: str
    ) -> float:
        """Calcula fator de conversão entre unidades"""
        
        # Normaliza unidades para gramas
        portion_grams = self._convert_to_grams(portion_value, portion_unit)
        base_grams = self._convert_to_grams(1, base_unit)
        
        if base_unit == "100g":
            base_grams = 100
        
        return portion_grams / base_grams
    
    def _convert_to_grams(self, value: float, unit: str) -> float:
        """Converte valor para gramas"""
        
        unit = unit.lower().strip()
        
        # Mapeamento de unidades para gramas
        unit_conversions = {
            "g": 1,
            "gram": 1,
            "grams": 1,
            "gramas": 1,
            "kg": 1000,
            "kilogram": 1000,
            "kilograms": 1000,
            "quilograma": 1000,
            "quilogramas": 1000,
            "mg": 0.001,
            "milligram": 0.001,
            "milligrams": 0.001,
            "miligramas": 0.001,
            "oz": 28.3495,
            "ounce": 28.3495,
            "ounces": 28.3495,
            "lb": 453.592,
            "pound": 453.592,
            "pounds": 453.592,
            "ml": 1,  # Aproximação para líquidos
            "milliliter": 1,
            "milliliters": 1,
            "mililitro": 1,
            "mililitros": 1,
            "l": 1000,
            "liter": 1000,
            "liters": 1000,
            "litro": 1000,
            "litros": 1000,
            "cup": 240,  # Aproximação
            "cups": 240,
            "xícara": 240,
            "xícaras": 240,
            "tbsp": 15,  # Colher de sopa
            "tablespoon": 15,
            "tablespoons": 15,
            "colher de sopa": 15,
            "tsp": 5,  # Colher de chá
            "teaspoon": 5,
            "teaspoons": 5,
            "colher de chá": 5
        }
        
        # Remove números do final da unidade (ex: "100g" -> "g")
        clean_unit = ''.join([c for c in unit if not c.isdigit()])
        
        conversion_factor = unit_conversions.get(clean_unit, 1)
        return value * conversion_factor
    
    def validate_portion_input(self, portion_value: float, portion_unit: str) -> bool:
        """Valida entrada de porção"""
        
        if portion_value <= 0:
            return False
        
        if not portion_unit or not isinstance(portion_unit, str):
            return False
        
        # Verifica se a unidade é reconhecida
        try:
            self._convert_to_grams(1, portion_unit)
            return True
        except:
            return False