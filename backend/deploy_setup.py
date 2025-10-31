#!/usr/bin/env python3
"""
Script de Configuração para Deploy - MelitusGym Backend
======================================================

Este script ajuda a configurar o ambiente de produção do MelitusGym
com PostgreSQL na Railway ou outro provedor.

Uso:
    python deploy_setup.py --check-env
    python deploy_setup.py --generate-jwt-secret
    python deploy_setup.py --test-postgres --url "postgresql://..."
"""

import os
import sys
import secrets
import argparse
from typing import Optional
import psycopg2
from urllib.parse import urlparse

def generate_jwt_secret() -> str:
    """Gera uma chave JWT segura"""
    return secrets.token_urlsafe(32)

def check_environment_variables():
    """Verifica se todas as variáveis de ambiente necessárias estão configuradas"""
    required_vars = [
        'DATABASE_URL',
        'JWT_SECRET_KEY',
        'USE_SQLITE'
    ]
    
    optional_vars = [
        'FDC_API_KEY',
        'FCM_CREDENTIALS_PATH',
        'ALLOWED_ORIGINS',
        'CORS_ORIGINS'
    ]
    
    print("🔍 VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE")
    print("=" * 50)
    
    missing_required = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if var == 'DATABASE_URL':
                # Mascarar senha na URL
                parsed = urlparse(value)
                masked_url = f"{parsed.scheme}://{parsed.username}:***@{parsed.hostname}:{parsed.port}{parsed.path}"
                print(f"✅ {var}: {masked_url}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NÃO CONFIGURADA")
            missing_required.append(var)
    
    print("\n📋 VARIÁVEIS OPCIONAIS:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Não configurada (opcional)")
    
    if missing_required:
        print(f"\n❌ ERRO: {len(missing_required)} variáveis obrigatórias não configuradas:")
        for var in missing_required:
            print(f"   - {var}")
        return False
    else:
        print("\n✅ SUCESSO: Todas as variáveis obrigatórias estão configuradas!")
        return True

def test_postgres_connection(database_url: str) -> bool:
    """Testa a conexão com PostgreSQL"""
    print(f"🔗 TESTANDO CONEXÃO POSTGRESQL")
    print("=" * 50)
    
    try:
        # Parse da URL
        parsed = urlparse(database_url)
        print(f"🏠 Host: {parsed.hostname}")
        print(f"🔌 Porta: {parsed.port}")
        print(f"🗄️  Database: {parsed.path[1:]}")  # Remove a barra inicial
        print(f"👤 Usuário: {parsed.username}")
        
        # Teste de conexão
        print("\n🔄 Conectando...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Verificar versão
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Conexão estabelecida!")
        print(f"📊 Versão: {version}")
        
        # Verificar tabelas existentes
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"\n📋 Tabelas encontradas ({len(tables)}):")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("\n⚠️  Nenhuma tabela encontrada (execute as migrações)")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ERRO na conexão: {e}")
        return False

def create_railway_env_template():
    """Cria um template de variáveis para Railway"""
    template = """
# Copie estas variáveis para o Railway Dashboard
# ============================================

# 1. No serviço PostgreSQL:
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[gerado automaticamente]
POSTGRES_HOST=[gerado automaticamente]
POSTGRES_PORT=5432

# 2. No serviço Backend:
USE_SQLITE=false
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/railway
JWT_SECRET_KEY={jwt_secret}
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://tranquil-vitality-production-15a2.up.railway.app
LOG_LEVEL=INFO
DEBUG=false
TIMEZONE=America/Sao_Paulo

# Opcional:
FDC_API_KEY=[sua_chave_fdc]
FCM_CREDENTIALS_PATH=./firebase-credentials.json
""".format(jwt_secret=generate_jwt_secret())
    
    with open('railway_env_template.txt', 'w') as f:
        f.write(template)
    
    print("📄 Template criado: railway_env_template.txt")
    print("💡 Copie as variáveis para o Railway Dashboard")

def main():
    parser = argparse.ArgumentParser(description='Setup de Deploy MelitusGym')
    parser.add_argument('--check-env', action='store_true', help='Verificar variáveis de ambiente')
    parser.add_argument('--generate-jwt-secret', action='store_true', help='Gerar chave JWT')
    parser.add_argument('--test-postgres', action='store_true', help='Testar conexão PostgreSQL')
    parser.add_argument('--url', type=str, help='URL do PostgreSQL para teste')
    parser.add_argument('--create-railway-template', action='store_true', help='Criar template Railway')
    
    args = parser.parse_args()
    
    if args.generate_jwt_secret:
        secret = generate_jwt_secret()
        print(f"🔑 JWT Secret gerado: {secret}")
        print("💡 Adicione esta chave à variável JWT_SECRET_KEY")
    
    elif args.check_env:
        # Carregar .env se existir
        env_file = '.env'
        if os.path.exists(env_file):
            print(f"📁 Carregando {env_file}...")
            from dotenv import load_dotenv
            load_dotenv(env_file)
        
        check_environment_variables()
    
    elif args.test_postgres:
        if not args.url:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                print("❌ ERRO: Forneça --url ou configure DATABASE_URL")
                sys.exit(1)
        else:
            database_url = args.url
        
        test_postgres_connection(database_url)
    
    elif args.create_railway_template:
        create_railway_env_template()
    
    else:
        print("🚀 MELITUSGYM DEPLOY SETUP")
        print("=" * 30)
        print("Comandos disponíveis:")
        print("  --check-env              Verificar variáveis")
        print("  --generate-jwt-secret    Gerar chave JWT")
        print("  --test-postgres --url    Testar PostgreSQL")
        print("  --create-railway-template Criar template Railway")
        print("\nExemplo:")
        print("  python deploy_setup.py --check-env")

if __name__ == "__main__":
    main()