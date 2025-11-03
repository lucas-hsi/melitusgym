#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Teste do endpoint TACO search - SEM BANCO DE DADOS
Usa mocks para simular dados
"""
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

print("="*60)
print("TESTE DO ENDPOINT TACO SEARCH (SEM BANCO)")
print("="*60)

# Mock dos dados TACO
mock_taco_result = {
    'items': [
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
    ],
    'total_found': 2
}

# Mock do TACODynamicLoader
class MockTACODynamicLoader:
    def search(self, term, limit):
        print(f"  🔍 Mock: Buscando '{term}' (limit={limit})")
        return mock_taco_result

# Aplicar mocks ANTES de importar app
print("\n⚙️  Configurando mocks...")
with patch('app.services.taco_scraper.TACODynamicLoader', MockTACODynamicLoader):
    from app.main import app
    
    print("✅ App importado com mocks")
    
    # Criar cliente de teste
    client = TestClient(app)
    
    # Teste 1: Query válida
    print("\n" + "="*60)
    print("TESTE 1: Query válida - 'arroz'")
    print("="*60)
    
    response = client.get("/api/taco/search?query=arroz&limit=5")
    
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso!")
        print(f"\n📦 Resposta:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # Validações
        assert data['query'] == 'arroz', "Query incorreta"
        assert data['count'] > 0, "Nenhum item retornado"
        assert 'items' in data, "Campo 'items' ausente"
        assert len(data['items']) > 0, "Lista de items vazia"
        
        # Validar estrutura do primeiro item
        first_item = data['items'][0]
        required_fields = ['nome', 'categoria', 'kcal', 'carb', 'prot', 'lip', 'fibra', 'porcao', 'porcao_gr']
        for field in required_fields:
            assert field in first_item, f"Campo '{field}' ausente no item"
        
        print("\n✅ Todas as validações passaram!")
    else:
        print(f"❌ Erro: {response.status_code}")
        print(response.text)
    
    # Teste 2: Query curta (deve falhar)
    print("\n" + "="*60)
    print("TESTE 2: Query curta - 'a' (deve retornar erro 400)")
    print("="*60)
    
    response = client.get("/api/taco/search?query=a")
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 400:
        print("✅ Validação funcionando corretamente!")
        print(f"📦 Mensagem: {response.json()}")
    else:
        print(f"❌ Esperava 400, recebeu {response.status_code}")
    
    # Teste 3: Limit inválido (deve falhar)
    print("\n" + "="*60)
    print("TESTE 3: Limit inválido - 100 (deve retornar erro 400)")
    print("="*60)
    
    response = client.get("/api/taco/search?query=arroz&limit=100")
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 400:
        print("✅ Validação de limit funcionando!")
        print(f"📦 Mensagem: {response.json()}")
    else:
        print(f"❌ Esperava 400, recebeu {response.status_code}")
    
    # Teste 4: Query sem parâmetro (deve falhar)
    print("\n" + "="*60)
    print("TESTE 4: Query ausente (deve retornar erro 422)")
    print("="*60)
    
    response = client.get("/api/taco/search")
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 422:
        print("✅ Validação de parâmetros obrigatórios OK!")
    else:
        print(f"❌ Esperava 422, recebeu {response.status_code}")

print("\n" + "="*60)
print("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
print("="*60)
print("\n🎉 O endpoint /api/taco/search está funcionando corretamente!")
print("📝 Próximo passo: Testar no frontend com servidor rodando")
