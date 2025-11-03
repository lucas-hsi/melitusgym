#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Teste do endpoint TACO search
"""
import sys
import json

print("="*60)
print("TESTE DO ENDPOINT TACO SEARCH")
print("="*60)

try:
    from app.services.taco_scraper import get_taco_scraper
    
    print("\n✅ Import OK")
    
    # Criar instância
    scraper = get_taco_scraper()
    print("✅ Scraper instanciado")
    
    # Testar busca
    print("\n🔍 Testando busca por 'arroz'...")
    result = scraper.search_foods('arroz', 5)
    
    print("\n📊 RESULTADO:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    print("\n✅ TESTE CONCLUÍDO COM SUCESSO!")
    
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
