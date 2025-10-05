from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime
import logging

from ...schemas.nutrition_schemas import (
    SearchRequest, SearchResponse, ItemRequest, ItemWithCalculationRequest,
    ItemWithCalculationResponse, CalculationRequest, CalculationResult,
    ErrorResponse, HealthCheckResponse, NutritionSource
)
from ...services.nutrition_connectors import NutritionConnectorService
from ...services.nutrition_calculator import NutritionCalculatorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nutrition/v2", tags=["Nutrition V2"])

# Inicialização dos serviços
connector_service = NutritionConnectorService()
calculator_service = NutritionCalculatorService()

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Verifica status dos serviços de nutrição"""
    
    services_status = {
        "openfoodfacts": "unknown",
        "usda_fdc": "unknown"
    }
    
    # Testa OpenFoodFacts
    try:
        await connector_service.off_connector.search_foods("test", 1)
        services_status["openfoodfacts"] = "healthy"
    except Exception as e:
        services_status["openfoodfacts"] = f"error: {str(e)[:50]}"
        logger.warning(f"OpenFoodFacts health check failed: {str(e)}")
    
    # Testa USDA FDC
    try:
        await connector_service.fdc_connector.search_foods("test", 1)
        services_status["usda_fdc"] = "healthy"
    except Exception as e:
        services_status["usda_fdc"] = f"error: {str(e)[:50]}"
        logger.warning(f"USDA FDC health check failed: {str(e)}")
    
    overall_status = "healthy" if any("healthy" in status for status in services_status.values()) else "degraded"
    
    return HealthCheckResponse(
        status=overall_status,
        services=services_status,
        timestamp=datetime.now().isoformat()
    )

@router.get("/search", response_model=SearchResponse)
async def search_foods(
    term: str = Query(..., min_length=2, max_length=100, description="Termo de busca"),
    page_size: int = Query(20, ge=1, le=50, description="Número de resultados"),
    sources: Optional[List[NutritionSource]] = Query(None, description="Fontes específicas")
):
    """Busca unificada de alimentos com fallback entre APIs"""
    
    start_time = datetime.now()
    
    try:
        logger.info(f"Starting unified search - term: {term}, page_size: {page_size}")
        
        # Realiza busca unificada
        search_result = await connector_service.search_unified(term, page_size)
        
        # Calcula tempo de busca
        search_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Converte para modelo de resposta
        response = SearchResponse(
            term=search_result["term"],
            sources=search_result["sources"],
            items=search_result["items"],
            total_found=search_result["total_found"],
            search_time_ms=round(search_time, 2)
        )
        
        logger.info(
            f"Search completed - term: {term}, found: {response.total_found}, "
            f"sources: {response.sources}, time: {search_time:.2f}ms"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Search failed - term: {term}, error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "search_failed",
                "message": f"Falha na busca: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/item", response_model=ItemWithCalculationResponse)
async def get_item_with_calculation(
    id: str = Query(..., description="ID do item"),
    source: NutritionSource = Query(..., description="Fonte dos dados"),
    portion_value: float = Query(..., gt=0, description="Valor da porção"),
    portion_unit: str = Query(..., description="Unidade da porção")
):
    """Obtém item específico com cálculo nutricional para porção"""
    
    try:
        logger.info(
            f"Getting item with calculation - id: {id}, source: {source}, "
            f"portion: {portion_value}{portion_unit}"
        )
        
        # Valida entrada de porção
        if not calculator_service.validate_portion_input(portion_value, portion_unit):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_portion",
                    "message": f"Porção inválida: {portion_value}{portion_unit}",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # Obtém item com cálculo
        result = await calculator_service.get_item_with_calculation(
            id, source.value, portion_value, portion_unit
        )
        
        response = ItemWithCalculationResponse(**result)
        
        logger.info(
            f"Item calculation completed - id: {id}, "
            f"method: {response.data_source_method}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Item calculation failed - id: {id}, source: {source}, error: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "calculation_failed",
                "message": f"Falha no cálculo: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )

@router.post("/calc", response_model=CalculationResult)
async def calculate_nutrition(request: CalculationRequest):
    """Calcula nutrição para porção específica"""
    
    try:
        logger.info(
            f"Calculating nutrition - portion: {request.portion_value}{request.portion_unit}, "
            f"base: {request.base_unit}"
        )
        
        # Valida entrada de porção
        if not calculator_service.validate_portion_input(request.portion_value, request.portion_unit):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_portion",
                    "message": f"Porção inválida: {request.portion_value}{request.portion_unit}",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        # Realiza cálculo
        result = await calculator_service.calculate_portion_nutrition(
            request.nutrients_base,
            request.portion_value,
            request.portion_unit,
            request.base_unit
        )
        
        response = CalculationResult(**result)
        
        logger.info(
            f"Nutrition calculation completed - factor: {response.conversion_factor}, "
            f"method: {response.calculation_method}"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Nutrition calculation failed - portion: {request.portion_value}{request.portion_unit}, "
            f"error: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail={
                "error": "calculation_failed",
                "message": f"Falha no cálculo: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )

# Endpoints de conveniência
@router.get("/search/openfoodfacts")
async def search_openfoodfacts_only(
    term: str = Query(..., min_length=2, max_length=100),
    page_size: int = Query(20, ge=1, le=50)
):
    """Busca apenas no OpenFoodFacts"""
    
    try:
        result = await connector_service.off_connector.search_foods(term, page_size)
        
        if result.get("products"):
            normalized = connector_service._normalize_off_products(result["products"])
            return {
                "source": "openfoodfacts",
                "term": term,
                "items": normalized,
                "total_found": len(normalized)
            }
        
        return {
            "source": "openfoodfacts",
            "term": term,
            "items": [],
            "total_found": 0
        }
        
    except Exception as e:
        logger.error(f"OpenFoodFacts search failed - term: {term}, error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha na busca OpenFoodFacts: {str(e)}"
        )

@router.get("/search/usda")
async def search_usda_only(
    term: str = Query(..., min_length=2, max_length=100),
    page_size: int = Query(20, ge=1, le=50)
):
    """Busca apenas no USDA FDC"""
    
    try:
        result = await connector_service.fdc_connector.search_foods(term, page_size)
        
        if result.get("foods"):
            normalized = connector_service._normalize_fdc_foods(result["foods"])
            return {
                "source": "usda_fdc",
                "term": term,
                "items": normalized,
                "total_found": len(normalized)
            }
        
        return {
            "source": "usda_fdc",
            "term": term,
            "items": [],
            "total_found": 0
        }
        
    except Exception as e:
        logger.error(f"USDA FDC search failed - term: {term}, error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha na busca USDA: {str(e)}"
        )

@router.get("/product/{barcode}")
async def get_openfoodfacts_product(barcode: str):
    """Obtém produto específico do OpenFoodFacts por código de barras"""
    
    try:
        result = await connector_service.off_connector.get_product(barcode)
        
        if result.get("status") == 1 and result.get("product"):
            normalized = connector_service._normalize_off_products([result["product"]])
            return {
                "source": "openfoodfacts",
                "barcode": barcode,
                "product": normalized[0] if normalized else None,
                "found": bool(normalized)
            }
        
        return {
            "source": "openfoodfacts",
            "barcode": barcode,
            "product": None,
            "found": False
        }
        
    except Exception as e:
        logger.error(f"OpenFoodFacts product failed - barcode: {barcode}, error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao buscar produto: {str(e)}"
        )

@router.get("/food/{fdc_id}")
async def get_usda_food(fdc_id: int):
    """Obtém alimento específico do USDA FDC por ID"""
    
    try:
        result = await connector_service.fdc_connector.get_food_details(fdc_id)
        
        if result:
            normalized = connector_service._normalize_fdc_foods([result])
            return {
                "source": "usda_fdc",
                "fdc_id": fdc_id,
                "food": normalized[0] if normalized else None,
                "found": bool(normalized)
            }
        
        return {
            "source": "usda_fdc",
            "fdc_id": fdc_id,
            "food": None,
            "found": False
        }
        
    except Exception as e:
        logger.error(f"USDA FDC food failed - fdc_id: {fdc_id}, error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao buscar alimento: {str(e)}"
        )