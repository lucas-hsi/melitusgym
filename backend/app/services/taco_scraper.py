"""
Web Scraping da Tabela TACO Online
Busca informações nutricionais de alimentos da base TACO através de web scraping.
"""

import logging
from typing import Dict, List, Any, Optional
from functools import lru_cache
from datetime import datetime
from unicodedata import normalize

logger = logging.getLogger(__name__)


def _clean_text(text: Optional[str]) -> str:
    """Normaliza texto removendo acentos e convertendo para minúsculas"""
    if not text:
        return ""
    normalized = normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("ASCII")
    return normalized.strip().lower()


def _parse_float(value: str) -> Optional[float]:
    """Converte string para float, tratando formatos PT-BR"""
    if not value or value.strip() in ("", "-", "na", "nd", "n/a", "tr"):
        return None
    try:
        # Remove espaços e substitui vírgula por ponto
        cleaned = value.strip().replace(",", ".")
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


class TACOWebScraper:
    """
    Scraper para buscar dados nutricionais da TACO online.
    Implementa cache LRU para otimizar performance.
    """
    
    # NOTA: Site TBCA não possui API pública simples para scraping
    # Usando integração com base local TACO como solução prática
    BASE_URL = None  # Não usado - integração via TACODynamicLoader
    SEARCH_URL = None  # Não usado - integração via TACODynamicLoader
    
    def __init__(self, cache_size: int = 100, timeout: int = 10):
        """
        Inicializa o scraper.
        
        Args:
            cache_size: Tamanho máximo do cache LRU
            timeout: Timeout para requisições HTTP em segundos
        """
        self.timeout = timeout
        self.cache_size = cache_size
        # Importar aqui para evitar imports circulares
        from .taco_dynamic_loader import TACODynamicLoader
        self.taco_loader = TACODynamicLoader()
        logger.info(f"🕷️ TACO Scraper inicializado (usando base local)")
    
    @lru_cache(maxsize=100)
    def _search_local_db(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """
        Busca na base de dados local TACO.
        Usa cache para evitar consultas duplicadas.
        
        Args:
            query: Termo de busca
            limit: Número máximo de resultados
            
        Returns:
            Lista de alimentos encontrados
        """
        try:
            logger.info(f"🔍 Buscando na base local TACO: '{query}'")
            
            result = self.taco_loader.search(query, limit)
            
            logger.info(f"✅ Busca local concluída: {result['total_found']} itens")
            return result.get('items', [])
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar na base local: {e}")
            return []
    
    def _convert_to_scraper_format(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Converte formato da base local para formato do scraper.
        
        Args:
            items: Itens da base local
            
        Returns:
            Lista de alimentos no formato padronizado
        """
        foods = []
        for item in items:
            try:
                # Extrai nutrients_per_100g
                nutrients = item.get('nutrients_per_100g', {})
                
                food_data = {
                    "nome": item.get('name', 'Desconhecido'),
                    "categoria": item.get('category', 'Geral'),
                    "kcal": nutrients.get('energy_kcal'),
                    "carb": nutrients.get('carbohydrates'),
                    "prot": nutrients.get('proteins'),
                    "lip": nutrients.get('fat'),
                    "fibra": nutrients.get('fiber'),
                    "porcao": "100g",
                    "porcao_gr": 100.0
                }
                
                foods.append(food_data)
                logger.debug(f"✅ Alimento convertido: {food_data['nome']}")
                
            except Exception as e:
                logger.warning(f"⚠️ Erro ao converter item: {e}")
                continue
        
        logger.info(f"📊 Total de alimentos convertidos: {len(foods)}")
        return foods
    
    def search_foods(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """
        Busca alimentos na TACO online via web scraping.
        
        Args:
            query: Termo de busca
            limit: Número máximo de resultados
            
        Returns:
            Dicionário com resultados da busca
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"🔍 Iniciando busca TACO online: '{query}' (limit={limit})")
            
            # Validação de entrada
            if not query or len(query) < 2:
                return {
                    "query": query,
                    "items": [],
                    "count": 0,
                    "error": "Query deve ter pelo menos 2 caracteres",
                    "source": "taco_online",
                    "cached": False
                }
            
            # Busca na base local (pode vir do cache)
            local_items = self._search_local_db(query, limit)
            
            if not local_items:
                return {
                    "query": query,
                    "items": [],
                    "count": 0,
                    "error": "Nenhum alimento encontrado na base local",
                    "source": "taco_local",
                    "cached": False
                }
            
            # Converte para formato do scraper
            foods = self._convert_to_scraper_format(local_items)
            
            # Limita resultados
            limited_foods = foods[:limit]
            
            # Calcula tempo de busca
            search_time_ms = (datetime.now() - start_time).total_seconds() * 1000
            
            result = {
                "query": query,
                "items": limited_foods,
                "count": len(limited_foods),
                "total_found": len(foods),
                "source": "taco_local",
                "cached": False,  # TODO: implementar detecção de cache
                "search_time_ms": round(search_time_ms, 2)
            }
            
            logger.info(
                f"✅ Busca TACO online concluída: '{query}' - "
                f"{result['count']} resultados em {search_time_ms:.2f}ms"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na busca TACO online: {e}")
            
            return {
                "query": query,
                "items": [],
                "count": 0,
                "error": f"Erro na busca: {str(e)}",
                "source": "taco_local",
                "cached": False
            }
    
    def clear_cache(self):
        """Limpa o cache de consultas"""
        self._search_local_db.cache_clear()
        logger.info("🗑️ Cache do scraper TACO limpo")


# Instância global do scraper (singleton)
_scraper_instance: Optional[TACOWebScraper] = None


def get_taco_scraper() -> TACOWebScraper:
    """
    Retorna instância singleton do scraper.
    """
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = TACOWebScraper()
    return _scraper_instance
