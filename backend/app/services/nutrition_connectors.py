import logging
from typing import Dict, List, Any
from datetime import datetime
from sqlmodel import Session, select
from app.models.taco_food import TACOFood
from .database import engine

logger = logging.getLogger(__name__)

class TACOConnector:
    """Conector para base local TACO/TBCA (SQLModel)."""

    def __init__(self):
        pass

    async def search_foods(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca alimentos na tabela local TACOFood por nome (PT-BR)."""
        start_time = datetime.now()
        items: List[Dict[str, Any]] = []
        with Session(engine) as session:
            stmt = select(TACOFood).where(TACOFood.name_pt.ilike(f"%{term}%")).limit(page_size)
            results = session.exec(stmt).all()
            for r in results:
                items.append(self._normalize_taco(r))

        latency = (datetime.now() - start_time).total_seconds()
        logger.info(f"TACO search completed - term: {term}, found: {len(items)}, latency: {latency:.3f}s")
        return {"items": items, "total_found": len(items)}

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
    
    async def search_unified(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        """Busca usando exclusivamente a base TACO/TBCA local (PT-BR)."""
        results = {
            "term": term,
            "sources": [],
            "items": [],
            "total_found": 0
        }
        taco_data = await self.taco_connector.search_foods(term, page_size)
        results["sources"].append("taco_db")
        results["items"].extend(taco_data.get("items", []))
        results["total_found"] += taco_data.get("total_found", 0)
        
        return results