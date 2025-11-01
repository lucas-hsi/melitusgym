#!/usr/bin/env python3
"""
Script de teste para validar configurações antes do deploy
Simula as variáveis de ambiente do Railway para detectar problemas
"""

import os
import sys
import json
from pathlib import Path

# Adicionar o diretório do app ao path
sys.path.insert(0, str(Path(__file__).parent / "app"))

def test_cors_parsing():
    """Testa diferentes formatos de CORS_ORIGINS"""
    print("🧪 Testando parsing de CORS_ORIGINS...")
    
    test_cases = [
        # Formato CSV (recomendado para Railway)
        "http://127.0.0.1:3000,http://localhost:3000,https://tranquil-vitality-production-15a2.up.railway.app",
        
        # Formato JSON válido
        '["http://127.0.0.1:3000","http://localhost:3000","https://tranquil-vitality-production-15a2.up.railway.app"]',
        
        # String vazia (deve usar padrão)
        "",
        
        # None (deve usar padrão)
        None,
        
        # Formato JSON malformado (deve fazer fallback)
        '["http://127.0.0.1:3000","http://localhost:3000"',
    ]
    
    for i, test_value in enumerate(test_cases):
        print(f"\n  Teste {i+1}: {repr(test_value)}")
        
        # Configurar variável de ambiente
        if test_value is not None:
            os.environ["CORS_ORIGINS"] = test_value
        else:
            os.environ.pop("CORS_ORIGINS", None)
        
        try:
            # Importar e testar configuração
            from app.core.config import Settings
            settings = Settings()
            print(f"    ✅ Resultado: {settings.cors_origins}")
        except Exception as e:
            print(f"    ❌ Erro: {e}")

def test_database_url():
    """Testa configuração de DATABASE_URL"""
    print("\n🧪 Testando configuração de DATABASE_URL...")
    
    # Simular variáveis do Railway
    railway_vars = {
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/melitusgym",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": "password", 
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_DB": "melitusgym"
    }
    
    for key, value in railway_vars.items():
        os.environ[key] = value
    
    try:
        from app.core.config import Settings
        settings = Settings()
        db_url = settings.get_database_url()
        print(f"    ✅ DATABASE_URL: {db_url}")
    except Exception as e:
        print(f"    ❌ Erro: {e}")

def test_jwt_config():
    """Testa configuração JWT"""
    print("\n🧪 Testando configuração JWT...")
    
    jwt_vars = {
        "JWT_SECRET_KEY": "test-secret-key-minimum-32-characters-long",
        "JWT_ALGORITHM": "HS256",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": "30"
    }
    
    for key, value in jwt_vars.items():
        os.environ[key] = value
    
    try:
        from app.core.config import Settings
        settings = Settings()
        print(f"    ✅ JWT Secret: {settings.jwt_secret_key[:10]}...")
        print(f"    ✅ JWT Algorithm: {settings.jwt_algorithm}")
        print(f"    ✅ JWT Expire: {settings.jwt_access_token_expire_minutes} min")
    except Exception as e:
        print(f"    ❌ Erro: {e}")

def test_full_config():
    """Testa configuração completa simulando Railway"""
    print("\n🧪 Testando configuração completa (simulando Railway)...")
    
    # Variáveis típicas do Railway
    railway_env = {
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/melitusgym",
        "JWT_SECRET_KEY": "production-secret-key-minimum-32-characters-long",
        "CORS_ORIGINS": "https://tranquil-vitality-production-15a2.up.railway.app,http://127.0.0.1:3000",
        "LOG_LEVEL": "INFO",
        "DEBUG": "false"
    }
    
    # Limpar variáveis existentes
    for key in list(os.environ.keys()):
        if key.startswith(("CORS_", "JWT_", "DATABASE_", "POSTGRES_")):
            del os.environ[key]
    
    # Configurar variáveis do Railway
    for key, value in railway_env.items():
        os.environ[key] = value
    
    try:
        from app.core.config import Settings
        settings = Settings()
        
        print(f"    ✅ Environment: {settings.environment}")
        print(f"    ✅ CORS Origins: {settings.cors_origins}")
        print(f"    ✅ Database URL: {settings.get_database_url()[:30]}...")
        print(f"    ✅ JWT configured: {'Yes' if settings.jwt_secret_key else 'No'}")
        print(f"    ✅ Debug mode: {settings.debug}")
        
    except Exception as e:
        print(f"    ❌ Erro na configuração completa: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Executa todos os testes de configuração"""
    print("🔍 AUDITORIA DE CONFIGURAÇÃO - MELITUS GYM")
    print("=" * 50)
    
    test_cors_parsing()
    test_database_url()
    test_jwt_config()
    test_full_config()
    
    print("\n" + "=" * 50)
    print("✅ Auditoria de configuração concluída!")
    print("\n📋 CHECKLIST PARA RAILWAY:")
    print("1. Configure CORS_ORIGINS como CSV: https://seu-app.railway.app,http://127.0.0.1:3000")
    print("2. Configure DATABASE_URL com a string completa do PostgreSQL")
    print("3. Configure JWT_SECRET_KEY com pelo menos 32 caracteres")
    print("4. Configure ENVIRONMENT=production")
    print("5. Configure LOG_LEVEL=INFO")

if __name__ == "__main__":
    main()