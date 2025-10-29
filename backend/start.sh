#!/bin/bash

# Script otimizado para Render deployment com wheels binários
echo "🚀 Iniciando MelitusGym Backend..."

# Verificar versão Python (deve ser 3.11.x)
echo "🐍 Verificando versão Python..."
python --version
python -c "import sys; print(f'Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"

# Configurar variáveis para evitar builds nativos
export CRYPTOGRAPHY_DONT_BUILD_RUST=1
export BCRYPT_DONT_BUILD_RUST=1
export PIP_PREFER_BINARY=1
export PIP_NO_CACHE_DIR=1

# Instalar dependências com otimizações para wheels binários
echo "📦 Instalando dependências (preferindo wheels binários)..."
pip install --prefer-binary --no-cache-dir --no-compile --only-binary=all -r requirements.txt

# Verificar se o banco está acessível (opcional)
echo "🔍 Verificando conectividade do banco..."
# python -c "from app.database import engine; print('✅ Banco conectado!')" || echo "⚠️ Banco não acessível"

# Executar migrações (descomente quando necessário)
# echo "🔄 Executando migrações..."
# alembic upgrade head

# Iniciar aplicação
echo "🎯 Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}