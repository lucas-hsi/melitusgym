import httpx
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class OpenFoodFactsConnector:
    """Conector para OpenFoodFacts API v2"""
    
    def __init__(self):
        self.base_url = "https://world.openfoodfacts.org"
        self.headers = {
            "User-Agent": "DL-Auto-Pecas-Nutrition/1.0",
            "Accept": "application/json"
        }
        self.timeout = 10.0
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def search_foods(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca alimentos no OpenFoodFacts"""
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/api/v2/search"
                params = {
                    "q": term,
                    "page_size": page_size,
                    "fields": "code,product_name,brands,serving_size,serving_quantity,nutriments,nutriscore_grade,ecoscore_grade"
                }
                
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                
                latency = (datetime.now() - start_time).total_seconds()
                logger.info(f"OFF search completed - term: {term}, latency: {latency:.3f}s")
                
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"OFF search failed - term: {term}, error: {str(e)}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def get_product(self, barcode: str) -> Dict[str, Any]:
        """Obtém produto específico por código de barras"""
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/api/v2/product/{barcode}.json"
                
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                latency = (datetime.now() - start_time).total_seconds()
                logger.info(f"OFF product completed - barcode: {barcode}, latency: {latency:.3f}s")
                
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"OFF product failed - barcode: {barcode}, error: {str(e)}")
            raise

class USDAFDCConnector:
    """Conector para USDA FoodData Central API"""
    
    def __init__(self):
        self.base_url = "https://api.nal.usda.gov/fdc/v1"
        self.api_key = os.getenv("FDC_API_KEY")
        self.timeout = 15.0
        
        if not self.api_key:
            logger.warning("FDC_API_KEY not found in environment variables")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def search_foods(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca alimentos no USDA FDC"""
        if not self.api_key:
            raise ValueError("FDC_API_KEY is required for USDA searches")
            
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/foods/search"
                params = {
                    "query": term,
                    "pageSize": page_size,
                    "api_key": self.api_key,
                    "dataType": ["Branded", "Foundation", "Survey (FNDDS)"]
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                latency = (datetime.now() - start_time).total_seconds()
                logger.info(f"FDC search completed - term: {term}, latency: {latency:.3f}s")
                
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"FDC search failed - term: {term}, error: {str(e)}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def get_food_details(self, fdc_id: int) -> Dict[str, Any]:
        """Obtém detalhes de um alimento específico"""
        if not self.api_key:
            raise ValueError("FDC_API_KEY is required for USDA food details")
            
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/foods/{fdc_id}"
                params = {"api_key": self.api_key}
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                latency = (datetime.now() - start_time).total_seconds()
                logger.info(f"FDC details completed - fdc_id: {fdc_id}, latency: {latency:.3f}s")
                
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"FDC details failed - fdc_id: {fdc_id}, error: {str(e)}")
            raise

class NutritionConnectorService:
    """Serviço principal que coordena os conectores"""
    
    def __init__(self):
        self.off_connector = OpenFoodFactsConnector()
        self.fdc_connector = USDAFDCConnector()
    
    async def search_unified(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca unificada com fallback entre APIs"""
        results = {
            "term": term,
            "sources": [],
            "items": [],
            "total_found": 0
        }
        
        # Primeira tentativa: OpenFoodFacts
        try:
            off_data = await self.off_connector.search_foods(term, page_size)
            if off_data.get("products"):
                results["sources"].append("openfoodfacts")
                results["items"].extend(self._normalize_off_products(off_data["products"]))
                results["total_found"] += len(off_data["products"])
                logger.info(f"OFF search successful - found {len(off_data['products'])} items")
        except Exception as e:
            logger.warning(f"OFF search failed, trying FDC fallback: {str(e)}")
        
        # Fallback: USDA FDC (se OFF não retornou resultados suficientes)
        if results["total_found"] < 5:  # Threshold para fallback
            try:
                fdc_data = await self.fdc_connector.search_foods(term, page_size - results["total_found"])
                if fdc_data.get("foods"):
                    results["sources"].append("usda_fdc")
                    results["items"].extend(self._normalize_fdc_foods(fdc_data["foods"]))
                    results["total_found"] += len(fdc_data["foods"])
                    logger.info(f"FDC fallback successful - found {len(fdc_data['foods'])} items")
            except Exception as e:
                logger.warning(f"FDC fallback also failed: {str(e)}")
        
        return results
    
    def _normalize_off_products(self, products: List[Dict]) -> List[Dict]:
        """Normaliza produtos do OpenFoodFacts"""
        normalized = []
        
        for product in products:
            item = {
                "id": product.get("code"),
                "source": "openfoodfacts",
                "name": product.get("product_name", "Nome não disponível"),
                "brands": product.get("brands", ""),
                "serving_size": product.get("serving_size"),
                "serving_quantity": product.get("serving_quantity"),
                "nutrients_per_100g": self._extract_off_nutrients(product.get("nutriments", {})),
                "nutriscore": product.get("nutriscore_grade"),
                "ecoscore": product.get("ecoscore_grade")
            }
            normalized.append(item)
        
        return normalized
    
    def _normalize_fdc_foods(self, foods: List[Dict]) -> List[Dict]:
        """Normaliza alimentos do USDA FDC"""
        normalized = []
        
        for food in foods:
            item = {
                "id": str(food.get("fdcId")),
                "source": "usda_fdc",
                "name": food.get("description", "Nome não disponível"),
                "brands": food.get("brandOwner", ""),
                "serving_size": food.get("servingSize"),
                "serving_quantity": food.get("servingSizeUnit"),
                "nutrients_per_100g": self._extract_fdc_nutrients(food.get("foodNutrients", [])),
                "data_type": food.get("dataType")
            }
            normalized.append(item)
        
        return normalized
    
    def _extract_off_nutrients(self, nutriments: Dict) -> Dict:
        """Extrai nutrientes do OpenFoodFacts"""
        return {
            "energy_kcal": nutriments.get("energy-kcal_100g"),
            "energy_kj": nutriments.get("energy_100g"),
            "carbohydrates": nutriments.get("carbohydrates_100g"),
            "proteins": nutriments.get("proteins_100g"),
            "fat": nutriments.get("fat_100g"),
            "fiber": nutriments.get("fiber_100g"),
            "sugars": nutriments.get("sugars_100g"),
            "sodium": nutriments.get("sodium_100g"),
            "salt": nutriments.get("salt_100g")
        }
    
    def _extract_fdc_nutrients(self, food_nutrients: List[Dict]) -> Dict:
        """Extrai nutrientes do USDA FDC"""
        nutrients = {}
        
        nutrient_mapping = {
            "Energy": "energy_kcal",
            "Carbohydrate, by difference": "carbohydrates",
            "Protein": "proteins",
            "Total lipid (fat)": "fat",
            "Fiber, total dietary": "fiber",
            "Sugars, total including NLEA": "sugars",
            "Sodium, Na": "sodium"
        }
        
        for nutrient in food_nutrients:
            nutrient_name = nutrient.get("nutrientName")
            if nutrient_name in nutrient_mapping:
                key = nutrient_mapping[nutrient_name]
                nutrients[key] = nutrient.get("value")
        
        return nutrients