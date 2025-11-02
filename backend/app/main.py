from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
from app.api.routes import health, auth, clinical, alarms, nutrition, nutrition_v2, admin, meal_logs
from app.services.database import create_db_and_tables
from app.services.taco_dynamic_loader import TACODynamicLoader
from app.services.etl_taco import ingest_taco_excel
import os
import asyncio
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Importar sistema de logging e exceções
from app.core.logging_config import setup_logging, get_logger
from app.core.exceptions import setup_exception_handlers

# Importar middlewares customizados
from app.core.middleware import (
    PerformanceMiddleware,
    SecurityMiddleware,
    RateLimitMiddleware,
    get_performance_metrics,
    clear_performance_metrics
)

# Configurar logging
setup_logging()
logger = get_logger("main")

# Criar instância do FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Iniciando aplicação Melitus Gym...")
    
    # Criar tabelas do banco de dados
    try:
        create_db_and_tables()
        logger.info("✅ Banco de dados inicializado com sucesso")
    except Exception as e:
        logger.error(f"❌ Erro ao inicializar banco de dados: {e}")
        raise
    
    # Ingestão automática da TACO em produção Railway
    if os.getenv("ENVIRONMENT") == "production":
        try:
            logger.info("📊 Iniciando ingestão automática da base TACO...")
            taco_file_path = "Taco-4a-Edicao.xlsx"
            if os.path.exists(taco_file_path):
                ingest_taco_excel(taco_file_path)
                logger.info("✅ Ingestão automática da TACO concluída com sucesso")
            else:
                logger.warning(f"⚠️ Arquivo TACO não encontrado: {taco_file_path}")
        except Exception as e:
            logger.warning(f"⚠️ Erro na ingestão automática da TACO (não crítico): {e}")
    
    # Pré-carregar dados TACO para otimizar performance
    try:
        logger.info("📊 Iniciando pré-carregamento da base TACO...")
        taco_loader = TACODynamicLoader()
        
        # Verificar se o arquivo TACO existe
        taco_file_path = taco_loader._resolve_taco_file_path()
        if not os.path.exists(taco_file_path):
            logger.warning(f"⚠️ Arquivo TACO não encontrado: {taco_file_path}")
            logger.warning("⚠️ Sistema funcionará com busca dinâmica apenas")
        else:
            logger.info(f"✅ Arquivo TACO encontrado: {taco_file_path}")
            
            # Executar busca inicial para popular cache
            # Isso força a leitura do arquivo e população do cache
            initial_search = taco_loader.search("arroz", 5)
            logger.info(f"✅ Cache TACO inicializado - {initial_search.get('total_found', 0)} itens encontrados para 'arroz'")
            
    except Exception as e:
        logger.warning(f"⚠️ Erro no pré-carregamento TACO (não crítico): {e}")
        logger.info("ℹ️ Sistema continuará com carregamento dinâmico sob demanda")
    
    # Scheduler de FCM desativado (Firebase removido)
    # Mantido vazio para evitar efeitos colaterais no startup
    
    yield
    
    # Shutdown
    logger.info("🛑 Encerrando aplicação Melitus Gym...")

app = FastAPI(
    title="Melitus Gym API",
    description="API para controle de diabetes, hipertensão e fitness",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    contact={
        "name": "Melitus Gym API",
        "url": "https://melitusgym-production.up.railway.app" if os.getenv("ENVIRONMENT") == "production" else "http://127.0.0.1:8000",
    },
    license_info={
        "name": "MIT",
    },
)

# Configurar handlers de exceção
setup_exception_handlers(app)

"""
Configuração de CORS
- Lê origens permitidas das variáveis de ambiente `ALLOWED_ORIGINS` ou `CORS_ORIGINS` (separadas por vírgula)
- Em produção, se não configurado via env, usa exatamente o domínio do frontend
- Em desenvolvimento, mantém fallback para localhost
"""
cors_env = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS")
if not cors_env:
    if os.getenv("ENVIRONMENT") == "production":
        cors_env = "https://tranquil-vitality-production-15a2.up.railway.app"
    else:
        cors_env = "http://127.0.0.1:3000,http://localhost:3000"

allow_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
logger.info(f"CORS configurado para: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Allow-Origin"
    ],
)

# Adicionar middlewares customizados (ordem importa!)
# 1. Security headers (primeiro)
app.add_middleware(SecurityMiddleware)

# 2. Rate limiting (antes de performance para evitar overhead)
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120)
else:
    # Mais permissivo em desenvolvimento
    app.add_middleware(RateLimitMiddleware, requests_per_minute=300)

# 3. Performance monitoring (último para capturar tudo)
app.add_middleware(PerformanceMiddleware, slow_request_threshold=2.0)

# Incluir rotas
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(clinical.router, prefix="/api", tags=["clinical"])
app.include_router(alarms.router, prefix="/api", tags=["alarms"])
app.include_router(nutrition.router, prefix="/api", tags=["nutrition"])
app.include_router(nutrition_v2.router, prefix="/api", tags=["nutrition_v2"])
app.include_router(meal_logs.router, prefix="/api", tags=["meal_logs"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"]) 

# Rota raiz
@app.get("/")
async def root():
    return JSONResponse(
        content={
            "message": "MelitusGym API",
            "version": "1.0.0",
            "status": "running",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "disabled"
        }
    )

# Health check robusto
@app.get("/health")
async def health_check():
    try:
        from datetime import datetime
        # Verificar conexão com banco seria ideal aqui
        return JSONResponse(
            content={
                "status": "ok",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0",
                "environment": os.getenv("ENVIRONMENT", "development")
            }
        )
    except Exception as e:
        logger.error(f"Health check falhou: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )

# Endpoint para métricas de performance (apenas em desenvolvimento)
@app.get("/metrics")
async def get_metrics():
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    try:
        metrics = get_performance_metrics()
        return JSONResponse(content={
            "performance_metrics": metrics,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Erro ao obter métricas: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving metrics")

# Endpoint para limpar métricas (apenas em desenvolvimento)
@app.delete("/metrics")
async def clear_metrics():
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    try:
        clear_performance_metrics()
        return JSONResponse(content={"message": "Metrics cleared successfully"})
    except Exception as e:
        logger.error(f"Erro ao limpar métricas: {e}")
        raise HTTPException(status_code=500, detail="Error clearing metrics")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT") != "production"
    )
