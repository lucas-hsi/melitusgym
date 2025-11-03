from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Response models
class FoodItem(BaseModel):
    id: str
    code: str
    name: str
    group: Optional[str] = None
    url: str

class FoodNutrients(BaseModel):
    id: str
    code: str
    name: str
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fiber_g: Optional[float] = None
    lipids_g: Optional[float] = None
    calcium_mg: Optional[float] = None
    sodium_mg: Optional[float] = None

class FoodSearchResponse(BaseModel):
    foods: List[FoodItem]
    total: int


@router.get("/search-web", response_model=FoodSearchResponse)
async def search_foods_web(q: str = Query(..., min_length=2)):
    """
    Search foods from TBCA (Tabela Brasileira de Composição de Alimentos) website
    
    Args:
        q: Search query (minimum 2 characters)
    
    Returns:
        FoodSearchResponse with list of matching foods
    """
    try:
        # TBCA search URL
        url = "https://www.tbca.net.br/base-dados/composicao_alimentos.php"
        
        # Prepare search parameters
        params = {
            "txt_descricao": q,
            "txt_codigo": "",
            "cmbgrupo": "SELECIONE",
            "cmbsubgrupo": "SELECIONE"
        }
        
        # Make request with headers to avoid blocking
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Find results table
        foods = []
        results_table = soup.find("table", class_="tbca-table") or soup.find("table")
        
        if results_table:
            rows = results_table.find_all("tr")
            
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 2:
                    # Extract food code and name
                    code_elem = cols[0].find("a")
                    name_elem = cols[1].find("a") or cols[1]
                    
                    if code_elem and name_elem:
                        code = code_elem.get_text(strip=True)
                        name = name_elem.get_text(separator=" ", strip=True)
                        food_url = code_elem.get("href", "")
                        
                        # Create full URL
                        if food_url and not food_url.startswith("http"):
                            food_url = f"https://www.tbca.net.br/base-dados/{food_url}"
                        
                        # Generate unique ID from code
                        food_id = f"tbca_{code.lower()}"
                        
                        foods.append(FoodItem(
                            id=food_id,
                            code=code,
                            name=name,
                            url=food_url
                        ))
        
        logger.info(f"Found {len(foods)} foods for query: {q}")
        
        return FoodSearchResponse(
            foods=foods,
            total=len(foods)
        )
        
    except requests.RequestException as e:
        logger.error(f"Error fetching TBCA data: {str(e)}")
        raise HTTPException(status_code=503, detail="Error connecting to TBCA database")
    except Exception as e:
        logger.error(f"Error processing TBCA data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing food data: {str(e)}")


@router.get("/food-web/{food_id}", response_model=FoodNutrients)
async def get_food_details_web(food_id: str):
    """
    Get detailed nutritional information for a specific food from TBCA
    
    Args:
        food_id: Food ID (format: tbca_XXXXX)
    
    Returns:
        FoodNutrients with detailed nutritional information
    """
    try:
        # Extract code from food_id
        if not food_id.startswith("tbca_"):
            raise HTTPException(status_code=400, detail="Invalid food ID format")
        
        code = food_id.replace("tbca_", "").upper()
        
        # Search for the food first to get its URL
        search_url = "https://www.tbca.net.br/base-dados/composicao_alimentos.php"
        params = {
            "txt_codigo": code,
            "txt_descricao": "",
            "cmbgrupo": "SELECIONE",
            "cmbsubgrupo": "SELECIONE"
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
        response = requests.get(search_url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Find the food detail link
        detail_url = None
        results_table = soup.find("table", class_="tbca-table") or soup.find("table")
        
        if results_table:
            first_row = results_table.find("tr")
            if first_row:
                link = first_row.find("a")
                if link:
                    detail_url = link.get("href")
                    if detail_url and not detail_url.startswith("http"):
                        detail_url = f"https://www.tbca.net.br/base-dados/{detail_url}"
        
        if not detail_url:
            raise HTTPException(status_code=404, detail="Food not found")
        
        # Get food details page
        detail_response = requests.get(detail_url, headers=headers, timeout=10)
        detail_response.raise_for_status()
        
        detail_soup = BeautifulSoup(detail_response.content, "html.parser")
        
        # Extract food name
        name = ""
        name_elem = detail_soup.find("h1") or detail_soup.find("h2")
        if name_elem:
            name = name_elem.get_text(strip=True)
        
        # Extract nutrients from table
        nutrients = {
            "energy_kcal": None,
            "protein_g": None,
            "carbs_g": None,
            "fiber_g": None,
            "lipids_g": None,
            "calcium_mg": None,
            "sodium_mg": None
        }
        
        # Find nutrients table
        nutrients_table = detail_soup.find("table", class_="table-nutricional") or detail_soup.find_all("table")[0] if detail_soup.find_all("table") else None
        
        if nutrients_table:
            rows = nutrients_table.find_all("tr")
            
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 2:
                    nutrient_name = cols[0].get_text(strip=True).lower()
                    nutrient_value = cols[1].get_text(strip=True)
                    
                    # Parse numeric value
                    try:
                        # Remove non-numeric characters except comma and dot
                        value_str = "".join(c for c in nutrient_value if c.isdigit() or c in ".,")
                        value_str = value_str.replace(",", ".")
                        value = float(value_str) if value_str else None
                    except:
                        value = None
                    
                    # Map nutrients
                    if "energia" in nutrient_name or "kcal" in nutrient_name:
                        nutrients["energy_kcal"] = value
                    elif "proteína" in nutrient_name or "protein" in nutrient_name:
                        nutrients["protein_g"] = value
                    elif "carboidrato" in nutrient_name or "carbohydrate" in nutrient_name:
                        nutrients["carbs_g"] = value
                    elif "fibra" in nutrient_name or "fiber" in nutrient_name:
                        nutrients["fiber_g"] = value
                    elif "lipíd" in nutrient_name or "gordura" in nutrient_name or "lipid" in nutrient_name:
                        nutrients["lipids_g"] = value
                    elif "cálcio" in nutrient_name or "calcium" in nutrient_name:
                        nutrients["calcium_mg"] = value
                    elif "sódio" in nutrient_name or "sodium" in nutrient_name:
                        nutrients["sodium_mg"] = value
        
        return FoodNutrients(
            id=food_id,
            code=code,
            name=name,
            **nutrients
        )
        
    except HTTPException:
        raise
    except requests.RequestException as e:
        logger.error(f"Error fetching TBCA food details: {str(e)}")
        raise HTTPException(status_code=503, detail="Error connecting to TBCA database")
    except Exception as e:
        logger.error(f"Error processing TBCA food details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing food details: {str(e)}")
