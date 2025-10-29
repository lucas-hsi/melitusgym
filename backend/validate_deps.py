#!/usr/bin/env python3
"""
Script para validar dependências antes do deploy no Render
Simula exatamente o ambiente de produção
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Executa comando e retorna resultado"""
    print(f"\n🔍 {description}")
    print(f"Executando: {cmd}")
    
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True,
            timeout=300  # 5 minutos timeout
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - SUCESSO")
            return True
        else:
            print(f"❌ {description} - ERRO")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT (5 min)")
        return False
    except Exception as e:
        print(f"💥 {description} - EXCEÇÃO: {e}")
        return False

def validate_python_version():
    """Valida versão do Python"""
    print("\n🐍 VALIDANDO VERSÃO PYTHON")
    
    version = sys.version_info
    expected_major, expected_minor = 3, 11
    
    if version.major == expected_major and version.minor == expected_minor:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - COMPATÍVEL")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - INCOMPATÍVEL")
        print(f"   Esperado: Python {expected_major}.{expected_minor}.x")
        return False

def validate_requirements():
    """Valida instalação de dependências"""
    print("\n📦 VALIDANDO DEPENDÊNCIAS")
    
    # Configurar variáveis de ambiente
    env_vars = {
        'CRYPTOGRAPHY_DONT_BUILD_RUST': '1',
        'BCRYPT_DONT_BUILD_RUST': '1',
        'PIP_PREFER_BINARY': '1',
        'PIP_NO_CACHE_DIR': '1'
    }
    
    for key, value in env_vars.items():
        os.environ[key] = value
        print(f"🔧 {key}={value}")
    
    # Comando de instalação (igual ao Render)
    install_cmd = "pip install --prefer-binary --no-cache-dir --no-compile --only-binary=all -r requirements.txt"
    
    return run_command(install_cmd, "Instalação de dependências")

def validate_imports():
    """Valida importação de módulos críticos"""
    print("\n🔗 VALIDANDO IMPORTAÇÕES")
    
    critical_modules = [
        'fastapi',
        'uvicorn',
        'sqlmodel',
        'psycopg2',
        'alembic',
        'cryptography',
        'jose',
        'bcrypt',
        'passlib',
        'httpx',
        'pydantic',
        'pydantic_settings'
    ]
    
    failed_imports = []
    
    for module in critical_modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError as e:
            print(f"❌ {module} - {e}")
            failed_imports.append(module)
    
    return len(failed_imports) == 0

def validate_app_startup():
    """Valida se a aplicação consegue inicializar"""
    print("\n🚀 VALIDANDO INICIALIZAÇÃO DA APP")
    
    try:
        # Importar app principal
        from app.main import app
        print("✅ Importação da app principal")
        
        # Verificar se FastAPI foi criado corretamente
        if hasattr(app, 'openapi'):
            print("✅ FastAPI configurado corretamente")
            return True
        else:
            print("❌ FastAPI não configurado")
            return False
            
    except Exception as e:
        print(f"❌ Erro na inicialização: {e}")
        return False

def main():
    """Função principal de validação"""
    print("🔥 MELITUS GYM - VALIDAÇÃO PRÉ-DEPLOY")
    print("=" * 50)
    
    # Lista de validações
    validations = [
        ("Versão Python", validate_python_version),
        ("Dependências", validate_requirements),
        ("Importações", validate_imports),
        ("Inicialização App", validate_app_startup)
    ]
    
    results = []
    
    for name, validation_func in validations:
        try:
            success = validation_func()
            results.append((name, success))
        except Exception as e:
            print(f"💥 Erro inesperado em {name}: {e}")
            results.append((name, False))
    
    # Relatório final
    print("\n" + "=" * 50)
    print("📊 RELATÓRIO FINAL")
    print("=" * 50)
    
    all_passed = True
    for name, success in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{name:20} {status}")
        if not success:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 TODAS AS VALIDAÇÕES PASSARAM!")
        print("🚀 Pronto para deploy no Render!")
        return 0
    else:
        print("⚠️  ALGUMAS VALIDAÇÕES FALHARAM!")
        print("🔧 Corrija os problemas antes do deploy")
        return 1

if __name__ == "__main__":
    sys.exit(main())