# Dockerfile otimizado para simular ambiente Render
FROM python:3.11.11-slim

# Definir diretório de trabalho
WORKDIR /app

# Configurar variáveis de ambiente para evitar builds nativos (igual ao Render)
ENV CRYPTOGRAPHY_DONT_BUILD_RUST=1
ENV BCRYPT_DONT_BUILD_RUST=1
ENV PIP_PREFER_BINARY=1
ENV PIP_NO_CACHE_DIR=1
ENV PYTHONUNBUFFERED=1

# Instalar dependências do sistema mínimas
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro (para cache do Docker)
COPY requirements.txt .

# Instalar dependências Python com flags otimizadas (igual ao start.sh)
RUN pip install --prefer-binary --no-cache-dir --no-compile --only-binary=all -r requirements.txt

# Copiar código da aplicação
COPY . .

# Copiar base TACO para dentro da imagem (build context deve conter o arquivo na raiz)
# Em Railway, assegure que o contexto de build é o root do repositório
COPY Taco-4a-Edicao.xlsx /app/Taco-4a-Edicao.xlsx

# Definir caminho do arquivo TACO via variável de ambiente
ENV TACO_FILE_PATH=/app/Taco-4a-Edicao.xlsx

# Criar usuário não-root para segurança
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando para iniciar a aplicação (igual ao Render)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]