import os
import sys
import json
import logging
import asyncio
from datetime import datetime
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
from app.services.nutrition_calculator import NutritionCalculatorService
from app.models.taco_food import TACOFood
from app.models.meal_log import MealLog
from app.services.database import engine, get_session
from sqlmodel import Session, select

# Constantes
TACO_FILE = Path(__file__).parent / "Taco-4a-Edicao.xlsx"
TEST_USER_ID = "test_user_123"

async def test_taco_ingest():
    """Teste de ingestão da tabela TACO"""
    logger.info("=== Teste de Ingestão da Tabela TACO ===")
    
    if not TACO_FILE.exists():
        logger.error(f"Arquivo TACO não encontrado: {TACO_FILE}")
        return False
    
    try:
        # Verificar se já existem dados na tabela
        with Session(engine) as session:
            count_before = session.exec(select(TACOFood)).all()
            initial_count = len(count_before)
        
        logger.info(f"Número de itens na tabela TACO antes da ingestão: {initial_count}")
        
        # Realizar ingestão
        stats = ingest_taco_excel(str(TACO_FILE))
        logger.info(f"Ingestão concluída: {stats}")
        
        # Verificar contagem após ingestão
        with Session(engine) as session:
            count_after = session.exec(select(TACOFood)).all()
            final_count = len(count_after)
        
        logger.info(f"Número de itens na tabela TACO após ingestão: {final_count}")
        
        if final_count > 0:
            logger.info("✅ Teste de ingestão da tabela TACO: SUCESSO")
            return True
        else:
            logger.error("❌ Teste de ingestão da tabela TACO: FALHA - Nenhum item encontrado após ingestão")
            return False
    
    except Exception as e:
        logger.error(f"❌ Teste de ingestão da tabela TACO: FALHA - {e}")
        return False

async def test_food_search():
    """Teste de busca de alimentos"""
    logger.info("=== Teste de Busca de Alimentos ===")
    
    connector = NutritionConnectorService()
    search_terms = ["arroz", "feijão", "frango", "maçã", "pão"]
    success_count = 0
    
    for term in search_terms:
        try:
            results = await connector.search_unified(term, page_size=5)
            
            logger.info(f"Busca por '{term}':")
            logger.info(f"  Total encontrado: {results['total_found']}")
            logger.info(f"  Fontes consultadas: {results['sources']}")
            
            if results['total_found'] > 0 and len(results['items']) > 0:
                item = results['items'][0]
                logger.info(f"  Primeiro resultado: {item['name']}")
                logger.info(f"  Carboidratos (100g): {item['nutrients_per_100g'].get('carbohydrates')}")
                success_count += 1
            else:
                logger.warning(f"  Nenhum resultado encontrado para '{term}'")
        
        except Exception as e:
            logger.error(f"  Erro na busca por '{term}': {e}")
    
    success_rate = success_count / len(search_terms)
    logger.info(f"Taxa de sucesso na busca: {success_rate * 100:.1f}%")
    
    if success_rate >= 0.8:  # 80% de sucesso
        logger.info("✅ Teste de busca de alimentos: SUCESSO")
        return True
    else:
        logger.error("❌ Teste de busca de alimentos: FALHA - Taxa de sucesso abaixo de 80%")
        return False

async def test_nutrition_calculation():
    """Teste de cálculo nutricional"""
    logger.info("=== Teste de Cálculo Nutricional ===")
    
    calculator = NutritionCalculatorService()
    connector = NutritionConnectorService()
    
    # Buscar um alimento para teste
    try:
        results = await connector.search_unified("arroz", page_size=1)
        
        if results['total_found'] == 0 or len(results['items']) == 0:
            logger.error("❌ Teste de cálculo nutricional: FALHA - Nenhum alimento encontrado para teste")
            return False
        
        item = results['items'][0]
        nutrients_base = item['nutrients_per_100g']
        
        # Testar cálculo para diferentes porções
        portions = [50, 100, 150, 200]
        success_count = 0
        
        for portion in portions:
            try:
                result = await calculator.calculate_portion_nutrition(
                    nutrients_base, portion, "g", "100g"
                )
                
                logger.info(f"Cálculo para {portion}g de {item['name']}:")
                logger.info(f"  Fator de conversão: {result['conversion_factor']}")
                logger.info(f"  Carboidratos: {result['nutrients'].get('carbohydrates')}")
                logger.info(f"  Calorias: {result['nutrients'].get('energy_kcal')}")
                
                # Verificar se o cálculo está correto
                expected_factor = portion / 100
                actual_factor = result['conversion_factor']
                
                if abs(expected_factor - actual_factor) < 0.01:  # Tolerância de 1%
                    success_count += 1
                else:
                    logger.warning(f"  Fator de conversão incorreto: esperado {expected_factor}, obtido {actual_factor}")
            
            except Exception as e:
                logger.error(f"  Erro no cálculo para {portion}g: {e}")
        
        success_rate = success_count / len(portions)
        logger.info(f"Taxa de sucesso no cálculo: {success_rate * 100:.1f}%")
        
        if success_rate >= 0.75:  # 75% de sucesso
            logger.info("✅ Teste de cálculo nutricional: SUCESSO")
            return True
        else:
            logger.error("❌ Teste de cálculo nutricional: FALHA - Taxa de sucesso abaixo de 75%")
            return False
    
    except Exception as e:
        logger.error(f"❌ Teste de cálculo nutricional: FALHA - {e}")
        return False

async def test_meal_log():
    """Teste de registro de refeições"""
    logger.info("=== Teste de Registro de Refeições ===")
    
    try:
        # Criar refeição de teste
        meal_time = "lunch"
        meal_date = datetime.now()
        items = [
            {
                "id": "test_item_1",
                "name": "Arroz branco",
                "source": "taco_db",
                "grams": 100,
                "nutrients": {
                    "energy_kcal": 128.0,
                    "carbohydrates": 28.1,
                    "proteins": 2.5,
                    "fat": 0.2,
                    "fiber": 1.6,
                    "sodium": 1.0
                }
            },
            {
                "id": "test_item_2",
                "name": "Feijão preto",
                "source": "taco_db",
                "grams": 80,
                "nutrients": {
                    "energy_kcal": 77.0,
                    "carbohydrates": 14.0,
                    "proteins": 4.5,
                    "fat": 0.5,
                    "fiber": 8.4,
                    "sodium": 2.0
                }
            }
        ]
        total_nutrients = {
            "energy_kcal": 205.0,
            "carbohydrates": 42.1,
            "proteins": 7.0,
            "fat": 0.7,
            "fiber": 10.0,
            "sodium": 3.0
        }
        notes = "Refeição de teste"
        
        # Salvar refeição
        with Session(engine) as session:
            # Limpar refeições de teste anteriores
            test_meals = session.exec(
                select(MealLog).where(MealLog.user_id == TEST_USER_ID)
            ).all()
            
            for meal in test_meals:
                session.delete(meal)
            
            session.commit()
            
            # Criar nova refeição
            meal_log = MealLog(
                user_id=TEST_USER_ID,
                meal_time=meal_time,
                meal_date=meal_date,
                items=items,
                total_nutrients=total_nutrients,
                notes=notes
            )
            
            session.add(meal_log)
            session.commit()
            session.refresh(meal_log)
            
            logger.info(f"Refeição criada com ID: {meal_log.id}")
            
            # Verificar se a refeição foi salva corretamente
            saved_meal = session.get(MealLog, meal_log.id)
            
            if saved_meal and saved_meal.user_id == TEST_USER_ID:
                logger.info("✅ Teste de registro de refeições: SUCESSO")
                return True
            else:
                logger.error("❌ Teste de registro de refeições: FALHA - Refeição não encontrada após salvar")
                return False
    
    except Exception as e:
        logger.error(f"❌ Teste de registro de refeições: FALHA - {e}")
        return False

async def test_insulin_calculation():
    """Teste de cálculo de insulina"""
    logger.info("=== Teste de Cálculo de Insulina ===")
    
    try:
        # Casos de teste
        test_cases = [
            {"carbs": 45, "sensitivity": 15, "adjustment": 0, "expected_dose": 3.0},
            {"carbs": 45, "sensitivity": 15, "adjustment": 20, "expected_dose": 3.6},
            {"carbs": 60, "sensitivity": 10, "adjustment": 0, "expected_dose": 6.0},
            {"carbs": 60, "sensitivity": 10, "adjustment": 30, "expected_dose": 7.8},
            {"carbs": 30, "sensitivity": 20, "adjustment": 10, "expected_dose": 1.65}
        ]
        
        success_count = 0
        
        for i, case in enumerate(test_cases):
            carbs = case["carbs"]
            sensitivity = case["sensitivity"]
            adjustment = case["adjustment"]
            expected_dose = case["expected_dose"]
            
            logger.info(f"Caso {i+1}: {carbs}g carbs, sensibilidade {sensitivity}g/U, ajuste {adjustment}%")
            
            # Cálculo manual para verificação
            base_dose = carbs / sensitivity
            correction_dose = (carbs * (adjustment / 100)) / sensitivity if adjustment > 0 else 0
            total_dose = base_dose + correction_dose
            
            logger.info(f"  Dose básica: {base_dose:.1f}U")
            logger.info(f"  Dose de correção: {correction_dose:.1f}U")
            logger.info(f"  Dose total: {total_dose:.1f}U")
            logger.info(f"  Dose esperada: {expected_dose:.1f}U")
            
            # Verificar se o cálculo está correto
            if abs(total_dose - expected_dose) < 0.1:  # Tolerância de 0.1U
                logger.info("  ✅ Cálculo correto")
                success_count += 1
            else:
                logger.warning(f"  ❌ Cálculo incorreto: esperado {expected_dose:.1f}U, obtido {total_dose:.1f}U")
        
        success_rate = success_count / len(test_cases)
        logger.info(f"Taxa de sucesso no cálculo de insulina: {success_rate * 100:.1f}%")
        
        if success_rate >= 0.8:  # 80% de sucesso
            logger.info("✅ Teste de cálculo de insulina: SUCESSO")
            return True
        else:
            logger.error("❌ Teste de cálculo de insulina: FALHA - Taxa de sucesso abaixo de 80%")
            return False
    
    except Exception as e:
        logger.error(f"❌ Teste de cálculo de insulina: FALHA - {e}")
        return False

async def run_all_tests():
    """Executa todos os testes"""
    logger.info("Iniciando testes do módulo de Nutrição...")
    
    tests = [
        ("Ingestão da Tabela TACO", test_taco_ingest),
        ("Busca de Alimentos", test_food_search),
        ("Cálculo Nutricional", test_nutrition_calculation),
        ("Cálculo de Insulina", test_insulin_calculation),
        ("Registro de Refeições", test_meal_log)
    ]
    
    results = []
    
    for name, test_func in tests:
        logger.info(f"\nExecutando teste: {name}")
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            logger.error(f"Erro ao executar teste {name}: {e}")
            results.append((name, False))
    
    # Resumo dos resultados
    logger.info("\n=== Resumo dos Testes ===")
    success_count = 0
    
    for name, result in results:
        status = "✅ SUCESSO" if result else "❌ FALHA"
        logger.info(f"{name}: {status}")
        
        if result:
            success_count += 1
    
    success_rate = success_count / len(tests)
    logger.info(f"\nTaxa de sucesso geral: {success_rate * 100:.1f}%")
    
    if success_rate == 1.0:
        logger.info("🎉 Todos os testes foram bem-sucedidos!")
    else:
        logger.warning(f"⚠️ {len(tests) - success_count} teste(s) falhou(aram).")

if __name__ == "__main__":
    asyncio.run(run_all_tests())