from typing import Dict
import logging

logger = logging.getLogger(__name__)

def ingest_taco_excel(path: str) -> Dict[str, int]:
    """Stub de ingestão TACO.

    Lê arquivo Excel da TACO e popula a tabela taco_foods.
    Implementação completa pendente; por ora retorna contagens zero.
    """
    logger.info(f"TACO ingest called for path: {path}")
    # TODO: Implementar parsing real do Excel e persistência em TACOFood
    return {"created": 0, "updated": 0}