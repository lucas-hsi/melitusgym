import logging
from typing import Dict, List, Any
from datetime import datetime
from sqlmodel import Session, select
from app.models.taco_food import TACOFood
from .database import engine
from .taco_dynamic_loader import TACODynamicLoader
from .tbca_connector import TBCAConnector

logger = logging.getLogger(__name__)

class TACOConnector:
    """Conector para base local TACO/TBCA (SQLModel)."""

    def __init__(self):
        # Dynamic loader integrates cache + CSV/XLSX scanning + DB upsert
        self.dynamic_loader = TACODynamicLoader()

    async def search_foods(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca alimentos usando fluxo cache→DB→CSV/XLSX com upsert dinâmico."""
        start_time = datetime.now()
        logger.info(f"🔍 Iniciando busca TACO - termo: '{term}', página: {page_size}")

        try:
            # Use dynamic loader to combine cache, DB and file scan
            result = self.dynamic_loader.search(term, page_size)
            
            latency = (datetime.now() - start_time).total_seconds()
            total_found = result.get('total_found', 0)
            items_count = len(result.get("items", []))
            
            if total_found > 0:
                logger.info(f"✅ Busca TACO concluída - termo: '{term}', encontrados: {total_found}, retornados: {items_count}, latência: {latency:.3f}s")
            else:
                logger.warning(f"⚠️ Busca TACO sem resultados - termo: '{term}', latência: {latency:.3f}s")
            
            # Maintain compatibility with previous return shape expected by NutritionConnectorService
            return {"items": result.get("items", []), "total_found": total_found}
            
        except Exception as e:
            latency = (datetime.now() - start_time).total_seconds()
            logger.error(f"❌ Erro na busca TACO - termo: '{term}', erro: {str(e)}, latência: {latency:.3f}s")
            return {"items": [], "total_found": 0}

    def _normalize_taco(self, r: TACOFood) -> Dict[str, Any]:
        return {
            "id": str(r.id or 0),
            "source": "taco_db",
            "name": r.name_pt,
            "brands": None,
            "serving_size": None,
            "serving_quantity": None,
            "nutrients_per_100g": {
                "energy_kcal": r.energy_kcal_100g,
                "energy_kj": r.energy_kj_100g,
                "carbohydrates": r.carbohydrates_100g,
                "proteins": r.proteins_100g,
                "fat": r.fat_100g,
                "fiber": r.fiber_100g,
                "sugars": r.sugars_100g,
                "sodium": r.sodium_mg_100g,
                "salt": None,
            },
            "nutriscore": None,
            "ecoscore": None,
            "data_type": "TACO",
            "glycemic_index": r.glycemic_index,
            "category": r.category_pt,
        }

class NutritionConnectorService:
    """Serviço principal que coordena os conectores"""
    
    def __init__(self):
        self.taco_connector = TACOConnector()
        self.tbca_connector = TBCAConnector()
    
    async def search_unified(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca híbrida: prioriza local (cache/DB/arquivo) e faz fallback TBCA online.

        - Primeiro consulta TACO local com o loader dinâmico
        - Se não encontrar nada, usa TBCAConnector para scraping e normalização
        - Sempre retorna itens já normalizados ao esquema NutritionItem
        - Atualiza banco com dados externos (upsert) para reutilização futura
        """
        results = {
            "term": term,
            "sources": [],
            "items": [],
            "total_found": 0
        }
        taco_data = await self.taco_connector.search_foods(term, page_size)
        if taco_data.get("total_found", 0) > 0:
            results["sources"].append("taco_db")
            results["items"].extend(taco_data.get("items", []))
            results["total_found"] += taco_data.get("total_found", 0)
        else:
            # Fallback: TBCA online
            tbca_data = await self.tbca_connector.search_foods(term, page_size)
            if tbca_data.get("total_found", 0) > 0:
                results["sources"].append("tbca_online")
                results["items"].extend(tbca_data.get("items", []))
                results["total_found"] += tbca_data.get("total_found", 0)
            else:
                # sem resultados
                results["sources"].append("not_found")
        
        return results