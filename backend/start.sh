#!/bin/bash

# Script de inicialização para Render
echo "Iniciando aplicação MelitusGym Backend..."

# Instalar dependências
echo "Instalando dependências..."
pip install --no-cache-dir -r requirements.txt

# Executar migrações se necessário
echo "Verificando banco de dados..."

# Iniciar aplicação
echo "Iniciando servidor FastAPI..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT