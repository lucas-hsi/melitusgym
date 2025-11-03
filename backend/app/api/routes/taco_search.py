from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class TacoSearchResult:
    """Modelo para resultado de busca TACO"""
    def __init__(self, name: str, category: str, energy_kcal: Optional[float] = None,
                 protein_g: Optional[float] = None, carbs_g: Optional[float] = None,
                 fat_g: Optional[float] = None, fiber_g: Optional[float] = None):
        self.name = name
        self.category = category
        self.energy_kcal = energy_kcal
        self.protein_g = protein_g
        self.carbs_g = carbs_g
        self.fat_g = fat_g
        self.fiber_g = fiber_g

    def to_dict(self):
        return {
            "name": self.name,
            "category": self.category,
            "nutritional_info": {
                "energy_kcal": self.energy_kcal,
                "protein_g": self.protein_g,
                "carbs_g": self.carbs_g,
                "fat_g": self.fat_g,
                "fiber_g": self.fiber_g
            }
        }


async def scrape_taco_foods(query: str) -> List[TacoSearchResult]:
    """
    Busca alimentos no site TACO usando BeautifulSoup.
    
    Args:
        query: Termo de busca para o alimento
    
    Returns:
        Lista de resultados encontrados
    """
    try:
        # URL do TACO (Tabela Brasileira de Composição de Alimentos)
        # Nota: Este é um exemplo. A URL real pode variar.
        base_url = "http://www.tbca.net.br/base-dados/composicao_estatistica.php"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fazer requisição de busca
            params = {"food": query}
            response = await client.get(base_url, params=params, follow_redirects=True)
            response.raise_for_status()
            
            # Parse HTML com BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            results = []
            
            # Buscar tabelas de resultados
            # Nota: Os seletores precisam ser ajustados conforme a estrutura real do site TACO
            tables = soup.find_all('table', class_='table')
            
            for table in tables:
                rows = table.find_all('tr')
                
                for row in rows[1:]:  # Pular cabeçalho
                    cols = row.find_all('td')
                    
                    if len(cols) >= 2:
                        try:
                            # Extrair dados das colunas
                            name = cols[0].get_text(strip=True)
                            category = cols[1].get_text(strip=True) if len(cols) > 1 else "Não especificada"
                            
                            # Extrair valores nutricionais (se disponíveis)
                            energy_kcal = None
                            protein_g = None
                            carbs_g = None
                            fat_g = None
                            fiber_g = None
                            
                            if len(cols) > 2:
                                try:
                                    energy_kcal = float(cols[2].get_text(strip=True).replace(',', '.'))
                                except (ValueError, AttributeError):
                                    pass
                            
                            if len(cols) > 3:
                                try:
                                    protein_g = float(cols[3].get_text(strip=True).replace(',', '.'))
                                except (ValueError, AttributeError):
                                    pass
                            
                            if len(cols) > 4:
                                try:
                                    carbs_g = float(cols[4].get_text(strip=True).replace(',', '.'))
                                except (ValueError, AttributeError):
                                    pass
                            
                            if len(cols) > 5:
                                try:
                                    fat_g = float(cols[5].get_text(strip=True).replace(',', '.'))
                                except (ValueError, AttributeError):
                                    pass
                            
                            if len(cols) > 6:
                                try:
                                    fiber_g = float(cols[6].get_text(strip=True).replace(',', '.'))
                                except (ValueError, AttributeError):
                                    pass
                            
                            # Filtrar por termo de busca
                            if query.lower() in name.lower():
                                result = TacoSearchResult(
                                    name=name,
                                    category=category,
                                    energy_kcal=energy_kcal,
                                    protein_g=protein_g,
                                    carbs_g=carbs_g,
                                    fat_g=fat_g,
                                    fiber_g=fiber_g
                                )
                                results.append(result)
                        except Exception as e:
                            logger.warning(f"Erro ao processar linha da tabela: {e}")
                            continue
            
            return results
            
    except httpx.TimeoutException:
        logger.error(f"Timeout ao buscar alimentos no TACO para query: {query}")
        raise HTTPException(status_code=504, detail="Tempo limite excedido ao acessar TACO")
    except httpx.HTTPError as e:
        logger.error(f"Erro HTTP ao buscar alimentos no TACO: {e}")
        raise HTTPException(status_code=502, detail="Erro ao acessar o site TACO")
    except Exception as e:
        logger.error(f"Erro inesperado ao buscar alimentos no TACO: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar busca TACO")


@router.get("/api/taco/search")
async def search_taco_foods(
    q: str = Query(..., description="Termo de busca para alimentos", min_length=2),
    limit: int = Query(50, description="Número máximo de resultados", ge=1, le=100)
):
    """
    Endpoint para buscar alimentos na tabela TACO via web scraping.
    
    Args:
        q: Termo de busca (mínimo 2 caracteres)
        limit: Número máximo de resultados (padrão 50, máximo 100)
    
    Returns:
        JSON com lista de alimentos encontrados e suas informações nutricionais
    
    Exemplo de resposta:
    {
        "query": "arroz",
        "total_results": 5,
        "results": [
            {
                "name": "Arroz branco cozido",
                "category": "Cereais",
                "nutritional_info": {
                    "energy_kcal": 130.0,
                    "protein_g": 2.5,
                    "carbs_g": 28.0,
                    "fat_g": 0.2,
                    "fiber_g": 0.5
                }
            }
        ]
    }
    """
    try:
        logger.info(f"Buscando alimentos TACO com query: {q}")
        
        # Realizar scraping
        results = await scrape_taco_foods(q)
        
        # Limitar resultados
        limited_results = results[:limit]
        
        # Formatar resposta
        response = {
            "query": q,
            "total_results": len(limited_results),
            "results": [result.to_dict() for result in limited_results]
        }
        
        logger.info(f"Busca TACO concluída: {len(limited_results)} resultados para '{q}'")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar busca TACO: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar busca de alimentos TACO")
