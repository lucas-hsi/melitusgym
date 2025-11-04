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
from ...services.etl_taco import ingest_taco_excel
from ...services.auth import get_current_user
from ...models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nutrition/v2", tags=["Nutrition V2"])

# Inicialização dos serviços
connector_service = NutritionConnectorService()
calculator_service = NutritionCalculatorService()

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Verifica status da base local TACO/TBCA."""
    services_status = {"taco_db": "unknown"}
    try:
        # Consulta mínima para validar acesso à base local
        await connector_service.search_unified("arroz", 1)
        services_status["taco_db"] = "healthy"
    except Exception as e:
        services_status["taco_db"] = f"error: {str(e)[:50]}"
        logger.warning(f"TACO DB health check failed: {str(e)}")

    overall_status = "healthy" if services_status["taco_db"] == "healthy" else "degraded"
    return HealthCheckResponse(
        status=overall_status,
        services=services_status,
        timestamp=datetime.now().isoformat()
    )

@router.post("/ingest/taco")
async def ingest_taco(
    path: str = Query(
        default=r"c:\\Users\\lucas\\OneDrive\\Área de Trabalho\\Melitus Gym\\Taco-4a-Edicao.xlsx",
        description="Caminho do arquivo Excel da TACO"
    ),
    current_user: User = Depends(get_current_user)
):
    """Importa dados TACO para o banco (PostgreSQL) com autenticação.

    Retorna contagem de registros criados/atualizados.
    """
    try:
        logger.info(f"Ingestão TACO iniciada por {current_user.email} - arquivo: {path}")
        stats = ingest_taco_excel(path)
        logger.info(f"Ingestão TACO concluída - created={stats.get('created')}, updated={stats.get('updated')}")
        return {
            "status": "ok",
            "source": "TACO",
            "path": path,
            "created": stats.get("created", 0),
            "updated": stats.get("updated", 0),
            "timestamp": datetime.now().isoformat()
        }
    except FileNotFoundError as e:
        logger.error(f"Arquivo TACO não encontrado: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Falha na ingestão TACO: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "taco_ingest_failed",
                "message": f"Falha na ingestão TACO: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/taco", response_model=SearchResponse)
async def get_taco_foods(
    query: str = Query(..., min_length=2, max_length=100, description="Termo de busca", alias="term"),
    limit: int = Query(20, ge=1, le=50, description="Número máximo de resultados", alias="page_size")
):
    """Endpoint para busca na base TACO - otimizado para frontend."""
    
    start_time = datetime.now()
    
    try:
        logger.info(f"🔍 Busca TACO - termo: '{query}', limite: {limit}")
        
        # Busca direta no conector TACO
        taco_connector = connector_service.taco_connector
        taco_data = await taco_connector.search_foods(query, limit)
        
        # Calcula tempo de busca
        search_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Converte para modelo de resposta
        response = SearchResponse(
            term=query,
            sources=["taco_local"],
            items=taco_data.get("items", []),
            total_found=taco_data.get("total_found", 0),
            search_time_ms=round(search_time, 2)
        )
        
        logger.info(
            f"✅ Busca TACO concluída - termo: '{query}', "
            f"encontrados: {response.total_found}, "
            f"tempo: {search_time:.2f}ms"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Erro na busca TACO - termo: '{query}', erro: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "taco_search_failed",
                "message": f"Falha na busca TACO: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/search", response_model=SearchResponse)
async def search_foods(
    term: str = Query(..., min_length=2, max_length=100, description="Termo de busca"),
    page_size: int = Query(20, ge=1, le=50, description="Número de resultados"),
    sources: Optional[List[NutritionSource]] = Query(None, description="Fontes específicas")
):
    """Busca híbrida priorizando base local (TACO) com fallback TBCA online.

    - Consulta local: cache/DB/arquivo via TACODynamicLoader
    - Se nada encontrado, faz scraping TBCA e normaliza
    - Retorna fontes consultadas e tempo de busca
    """
    
    start_time = datetime.now()
    
    try:
        logger.info(f"🔎 Busca híbrida - termo: {term}, page_size: {page_size}")
        
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
            f"✅ Busca concluída - termo: {term}, encontrados: {response.total_found}, "
            f"fontes: {response.sources}, tempo: {search_time:.2f}ms"
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

# Endpoints externos removidos: fluxo agora é exclusivamente TACO/TBCA local