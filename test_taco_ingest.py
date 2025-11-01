import os
import sys
import logging
from pathlib import Path

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent / "backend"
sys.path.append(str(backend_dir))

# Importar serviços necessários
from app.services.etl_taco import ingest_taco_excel
from app.services.nutrition_connectors import NutritionConnectorService
from app.models.taco_food import TACOFood
from app.services.database import engine
from sqlmodel import Session, select

async def test_taco_search(term="arroz"):
    """Testa a busca na tabela TACO"""
    connector = NutritionConnectorService()
    results = await connector.search_unified(term, page_size=10)
    
    print(f"\nResultados da busca por '{term}':")
    print(f"Total encontrado: {results['total_found']}")
    print(f"Fontes consultadas: {results['sources']}")
    
    if results['items']:
        print("\nPrimeiro resultado:")
        item = results['items'][0]
        print(f"Nome: {item['name']}")
        print(f"Categoria: {item.get('category')}")
        print(f"Carboidratos (100g): {item['nutrients_per_100g'].get('carbohydrates')}")
        print(f"Proteínas (100g): {item['nutrients_per_100g'].get('proteins')}")
        print(f"Gorduras (100g): {item['nutrients_per_100g'].get('fat')}")
        print(f"Calorias (100g): {item['nutrients_per_100g'].get('energy_kcal')}")
    else:
        print("Nenhum resultado encontrado.")

def count_taco_items():
    """Conta quantos itens existem na tabela TACO"""
    with Session(engine) as session:
        count = session.exec(select(TACOFood)).all()
        return len(count)

async def main():
    """Função principal para testar a ingestão e busca da tabela TACO"""
    taco_file = Path(__file__).parent / "Taco-4a-Edicao.xlsx"
    
    if not taco_file.exists():
        logger.error(f"Arquivo TACO não encontrado: {taco_file}")
        return
    
    # Verificar se já existem dados na tabela
    initial_count = count_taco_items()
    logger.info(f"Número de itens na tabela TACO antes da ingestão: {initial_count}")
    
    # Realizar ingestão apenas se não houver dados
    if initial_count == 0:
        logger.info(f"Iniciando ingestão da tabela TACO: {taco_file}")
        try:
            stats = ingest_taco_excel(str(taco_file))
            logger.info(f"Ingestão concluída: {stats}")
        except Exception as e:
            logger.error(f"Erro na ingestão: {e}")
            return
    else:
        logger.info("Tabela TACO já possui dados, pulando ingestão.")
    
    # Verificar contagem após ingestão
    final_count = count_taco_items()
    logger.info(f"Número de itens na tabela TACO após ingestão: {final_count}")
    
    # Testar busca
    await test_taco_search("arroz")
    await test_taco_search("feijão")
    await test_taco_search("frango")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())