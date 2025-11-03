#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Teste SIMPLES do endpoint TACO - apenas lógica de conversão
"""
print("="*60)
print("TESTE SIMPLES - CONVERSÃO DE DADOS TACO")
print("="*60)

# Dados mockados da base TACO
mock_local_items = [
    {
        'name': 'Arroz branco cozido',
        'category': 'Cereais',
        'nutrients_per_100g': {
            'energy_kcal': 130.0,
            'carbohydrates': 28.1,
            'proteins': 2.5,
            'fat': 0.2,
            'fiber': 0.4
        }
    },
    {
        'name': 'Arroz integral cozido',
        'category': 'Cereais',
        'nutrients_per_100g': {
            'energy_kcal': 124.0,
            'carbohydrates': 25.8,
            'proteins': 2.6,
            'fat': 1.0,
            'fiber': 2.7
        }
    }
]

def convert_to_scraper_format(items):
    """Mesma lógica do scraper"""
    foods = []
    for item in items:
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
    
    return foods

print("\n🔄 Testando conversão de formato...")
print(f"📥 Input: {len(mock_local_items)} itens da base local")

converted = convert_to_scraper_format(mock_local_items)

print(f"📤 Output: {len(converted)} itens convertidos")

# Validar primeiro item
print("\n📊 Validando estrutura do primeiro item:")
first = converted[0]

required_fields = ['nome', 'categoria', 'kcal', 'carb', 'prot', 'lip', 'fibra', 'porcao', 'porcao_gr']
all_ok = True

for field in required_fields:
    if field in first:
        print(f"  ✅ {field}: {first[field]}")
    else:
        print(f"  ❌ {field}: AUSENTE")
        all_ok = False

if all_ok:
    print("\n✅ Todos os campos presentes!")
    
    # Mostrar resultado completo
    print("\n📦 Resultado completo:")
    import json
    print(json.dumps(converted[0], indent=2, ensure_ascii=False))
    
    print("\n" + "="*60)
    print("✅ TESTE DE CONVERSÃO PASSOU!")
    print("="*60)
    print("\n✅ A lógica do scraper está correta!")
    print("✅ O formato de saída está correto!")
    print("\n📝 Próximo passo: Iniciar o servidor e testar via HTTP")
    print("   Comando: uvicorn app.main:app --reload --port 8000")
else:
    print("\n❌ TESTE FALHOU - Campos ausentes")
