#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para configurar ambiente local de desenvolvimento
Cria arquivo .env com SQLite local SEM AFETAR NUVEM
"""
import os

print("="*60)
print("🔧 CONFIGURAÇÃO DE AMBIENTE LOCAL")
print("="*60)

# Caminho do arquivo .env
env_file = os.path.join(os.path.dirname(__file__), '.env')

# Conteúdo do .env para desenvolvimento local
env_content = """# ============================================================
# AMBIENTE LOCAL DE DESENVOLVIMENTO
# Este arquivo NÃO afeta a produção (nuvem)
# ============================================================

# Banco de dados LOCAL (SQLite para desenvolvimento)
DATABASE_URL=sqlite:///./healthtrack.db

# Ambiente
ENVIRONMENT=development

# JWT Secret (gere um novo para produção)
SECRET_KEY=dev-secret-key-change-in-production-12345678

# CORS (permite localhost)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Arquivo TACO (opcional - usar caminho relativo ou absoluto)
# TACO_FILE_PATH=../Taco-4a-Edicao.xlsx

# Logs
LOG_LEVEL=INFO

# ============================================================
# IMPORTANTE: 
# - Este .env é para DESENVOLVIMENTO LOCAL apenas
# - A nuvem usa suas próprias variáveis (Railway/Render)
# - Nunca commitar este arquivo (.gitignore já protege)
# ============================================================
"""

# Verificar se já existe
if os.path.exists(env_file):
    print(f"\n⚠️  Arquivo .env já existe em: {env_file}")
    response = input("Deseja sobrescrever? (s/N): ").strip().lower()
    if response not in ['s', 'sim', 'y', 'yes']:
        print("❌ Operação cancelada")
        exit(0)

# Criar .env
try:
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"\n✅ Arquivo .env criado com sucesso!")
    print(f"📁 Localização: {env_file}")
    print("\n📋 Configurações:")
    print("   - DATABASE_URL: sqlite:///./healthtrack.db (LOCAL)")
    print("   - ENVIRONMENT: development")
    print("   - SECRET_KEY: dev-secret-key (TROCAR EM PRODUÇÃO)")
    print("   - ALLOWED_ORIGINS: localhost:3000")
    
    print("\n" + "="*60)
    print("✅ AMBIENTE LOCAL CONFIGURADO!")
    print("="*60)
    
    print("\n🚀 Próximo passo: Inicie o servidor")
    print("   python -m uvicorn app.main:app --reload --port 8000")
    
    print("\n💡 Nota: A nuvem NÃO será afetada - ela usa suas próprias variáveis")
    
except Exception as e:
    print(f"\n❌ Erro ao criar .env: {e}")
    exit(1)
