#!/bin/bash

# Script otimizado para Render deployment - BUILD ONLY
echo "🚀 MelitusGym Backend Build Script..."

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
echo "📦 Instalando dependências (APENAS wheels binários)..."
pip install --prefer-binary --no-cache-dir --no-compile --only-binary=all -r requirements.txt

echo "✅ Build concluído com sucesso!"