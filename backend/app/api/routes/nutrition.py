from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import httpx
import json
import os
from datetime import datetime

router = APIRouter()

# Pydantic models for request/response
class FoodItem(BaseModel):
    name: str
    portion: float  # gramas
    calories: float
    carbohydrates: float
    proteins: float
    fats: float
    fiber: float
    sugar: float
    sodium: float
    glycemicIndex: float
    confidence: Optional[float] = None
    source: str = 'vision'

class AnalyzeItem(BaseModel):
    name: str
    code: Optional[str] = None  # OpenFoodFacts product code
    grams: float

class AnalyzeRequest(BaseModel):
    items: List[AnalyzeItem]
    meal_time: Optional[str] = None

class FoodPortion(BaseModel):
    measureUnit: Dict[str, Any]
    modifier: Optional[str] = None
    gramWeight: float

class FDCPortionsResponse(BaseModel):
    foodPortions: List[FoodPortion]

class NutritionAnalysisRequest(BaseModel):
    items: List[AnalyzeItem]
    meal_time: Optional[str] = None

class NutritionTotals(BaseModel):
    calories: float
    carbohydrates: float
    proteins: float
    fats: float
    fiber: float
    sugar: float
    sodium: float
    averageGlycemicIndex: float

class NutritionAnalysisResponse(BaseModel):
    totals: NutritionTotals
    items: List[FoodItem]
    meal_type: Optional[str]
    notes: Optional[str]
    timestamp: str

@router.get("/nutrition/foods")
async def search_foods(q: str, limit: int = 20):
    """
    OpenFoodFacts Search v2 API with limited fields as specified
    Returns: code, product_name, brands, nutriments (carbohydrates_100g, sodium_100g, energy-kcal_100g, energy_100g), serving_size, serving_quantity
    """
    try:
        search_url = "https://world.openfoodfacts.org/api/v2/search"
        
        params = {
            "q": q,
            "page_size": str(limit),
            "fields": "code,product_name,brands,nutriments.carbohydrates_100g,nutriments.sodium_100g,nutriments.energy-kcal_100g,nutriments.energy_100g,serving_size,serving_quantity"
        }
        
        headers = {
            "User-Agent": "MelitusGym/0.1 (email@exemplo.com)",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(search_url, params=params, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="OpenFoodFacts API error")
            
            data = response.json()
            
            # Transform products to match specification
            products = []
            for product in data.get("products", []):
                nutriments = product.get("nutriments", {})
                
                # Skip products without basic nutritional data
                if not nutriments:
                    continue
                
                # Extract limited fields as specified
                transformed_product = {
                    "code": product.get("code", ""),
                    "product_name": product.get("product_name", ""),
                    "brands": product.get("brands", ""),
                    "nutriments": {
                        "carbohydrates_100g": nutriments.get("carbohydrates_100g", 0),
                        "sodium_100g": nutriments.get("sodium_100g", 0),
                        "energy-kcal_100g": nutriments.get("energy-kcal_100g"),
                        "energy_100g": nutriments.get("energy_100g")
                    },
                    "serving_size": product.get("serving_size"),
                    "serving_quantity": product.get("serving_quantity")
                }
                
                products.append(transformed_product)
            
            return JSONResponse(content={
                "products": products,
                "count": len(products),
                "page": data.get("page", 1),
                "page_count": data.get("page_count", 1)
            })
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching foods: {str(e)}")

@router.get("/nutrition/portions/fdc/{fdcId}")
async def get_fdc_portions(fdcId: str):
    """
    Get FoodData Central portions for household measures
    Returns: foodPortions[{measureUnit.name, modifier, gramWeight}]
    """
    try:
        fdc_api_key = os.getenv("FDC_API_KEY")
        if not fdc_api_key:
            raise HTTPException(status_code=500, detail="FDC API key not configured")
        
        url = f"https://api.nal.usda.gov/fdc/v1/food/{fdcId}"
        
        params = {
            "api_key": fdc_api_key,
            "format": "json"
        }
        
        headers = {
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Food not found in FDC")
            elif response.status_code != 200:
                raise HTTPException(status_code=500, detail="FDC API error")
            
            data = response.json()
            
            # Extract food portions
            food_portions = data.get("foodPortions", [])
            
            # Transform to our format
            portions = []
            for portion in food_portions:
                measure_unit = portion.get("measureUnit", {})
                transformed_portion = {
                    "measureUnit": {
                        "name": measure_unit.get("name", "")
                    },
                    "modifier": portion.get("modifier"),
                    "gramWeight": portion.get("gramWeight", 0)
                }
                portions.append(transformed_portion)
            
            return JSONResponse(content={
                "foodPortions": portions
            })
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching FDC portions: {str(e)}")

@router.post("/nutrition/analyze")
async def analyze_nutrition(request: NutritionAnalysisRequest):
    """
    Analyze nutrition for a list of food items
    Receives {items:[{name, code?, grams:number}], meal_time?}
    Resolves nutrients per 100g and calculates per item: value_100g * (grams/100)
    If energy comes in kJ (energy_100g), converts to kcal when returning
    Responds {items_normalized, totals:{carbs_g,sodium_mg,kcal}}
    """
    try:
        total_carbs = 0
        total_sodium = 0
        total_kcal = 0
        analyzed_items = []
        
        for item in request.items:
             # Initialize default values
             carbs_100g = 0
             sodium_100g = 0
             kcal_100g = 0
             
             # If code is provided, fetch from OpenFoodFacts
             if item.code:
                 try:
                     product_url = f"https://world.openfoodfacts.org/api/v2/product/{item.code}"
                     headers = {
                         "User-Agent": "MelitusGym/0.1 (email@exemplo.com)",
                         "Accept": "application/json"
                     }
                     
                     async with httpx.AsyncClient() as client:
                         response = await client.get(product_url, headers=headers)
                         
                         if response.status_code == 200:
                             data = response.json()
                             product = data.get("product", {})
                             nutriments = product.get("nutriments", {})
                             
                             carbs_100g = nutriments.get("carbohydrates_100g", 0)
                             sodium_100g = nutriments.get("sodium_100g", 0)
                             
                             # Handle energy conversion from kJ to kcal if needed
                             if nutriments.get("energy-kcal_100g"):
                                 kcal_100g = nutriments.get("energy-kcal_100g")
                             elif nutriments.get("energy_100g"):
                                 # Convert from kJ to kcal (1 kcal = 4.184 kJ)
                                 kcal_100g = nutriments.get("energy_100g") / 4.184
                             
                 except Exception:
                     # If API fails, use default values (0)
                     pass
             
             # Calculate based on actual grams: value_100g * (grams/100)
             actual_carbs = (carbs_100g * item.grams) / 100
             actual_sodium = (sodium_100g * item.grams) / 100
             actual_kcal = (kcal_100g * item.grams) / 100
             
             total_carbs += actual_carbs
             total_sodium += actual_sodium
             total_kcal += actual_kcal
             
             analyzed_items.append({
                 "name": item.name,
                 "code": item.code,
                 "grams": item.grams,
                 "carbs_g": round(actual_carbs, 1),
                 "sodium_mg": round(actual_sodium, 1),
                 "kcal": round(actual_kcal, 1)
             })
        
        return JSONResponse(content={
            "items": analyzed_items,
            "totals": {
                "carbs_g": round(total_carbs, 1),
                "sodium_mg": round(total_sodium, 1),
                "kcal": round(total_kcal, 1)
            },
            "meal_time": request.meal_time
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing nutrition: {str(e)}")

@router.get("/nutrition/foods/{barcode}")
async def get_product_by_barcode(barcode: str):
    """
    Get specific product by barcode from OpenFoodFacts
    """
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        
        headers = {
            "User-Agent": "MelitusGym/1.0 (lucas@melitusgym.com)",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Product not found")
            
            data = response.json()
            
            if data.get("status") != 1:
                raise HTTPException(status_code=404, detail="Product not found")
            
            product = data.get("product", {})
            nutriments = product.get("nutriments", {})
            
            if not nutriments:
                raise HTTPException(status_code=404, detail="Product has no nutritional data")
            
            # Transform to our format
            calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy_100g", 0)
            
            transformed_product = {
                "code": barcode,
                "name": product.get("product_name", "Produto sem nome"),
                "brand": product.get("brands", ""),
                "categories": product.get("categories", "").split(",") if product.get("categories") else [],
                "nutrition_per_100g": {
                    "calories": calories,
                    "carbohydrates": nutriments.get("carbohydrates_100g", 0),
                    "proteins": nutriments.get("proteins_100g", 0),
                    "fats": nutriments.get("fat_100g", 0),
                    "fiber": nutriments.get("fiber_100g", 0),
                    "sugar": nutriments.get("sugars_100g", 0),
                    "sodium": nutriments.get("sodium_100g") or (nutriments.get("salt_100g", 0) * 0.4)
                },
                "nutriscore": product.get("nutriscore_grade", "").upper(),
                "image_url": product.get("image_front_url") or product.get("image_url", "")
            }
            
            return JSONResponse(content=transformed_product)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching product: {str(e)}")