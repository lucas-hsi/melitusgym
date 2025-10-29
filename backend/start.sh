#!/bin/bash

# Script otimizado para Render deployment com wheels binários
echo "🚀 Iniciando MelitusGym Backend..."

# Instalar dependências com otimizações para wheels binários
echo "📦 Instalando dependências (preferindo wheels binários)..."
pip install --prefer-binary --no-cache-dir --no-compile -r requirements.txt

# Verificar se o banco está acessível (opcional)
echo "🔍 Verificando conectividade do banco..."
# python -c "from app.database import engine; print('✅ Banco conectado!')" || echo "⚠️ Banco não acessível"

# Executar migrações (descomente quando necessário)
# echo "🔄 Executando migrações..."
# alembic upgrade head

# Iniciar aplicação
echo "🎯 Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}