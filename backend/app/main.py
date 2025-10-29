from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import health, auth, clinical, alarms, notifications, nutrition, nutrition_v2
from app.services.database import create_db_and_tables
from app.services.fcm_service import start_alarm_scheduler
import os
import asyncio
import logging
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar logging para produção
logging.basicConfig(
    level=logging.INFO if os.getenv("ENVIRONMENT") == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Criar instância do FastAPI
app = FastAPI(
    title="Melitus Gym API",
    description="""API completa para controle de diabetes, hipertensão e performance física.
    
    ## Funcionalidades
    
    * **Autenticação**: Sistema de login JWT para usuário único
    * **Registros Clínicos**: Controle de glicemia, pressão arterial e insulina
    * **Estatísticas**: Análise de tendências e métricas de saúde
    * **Filtros Avançados**: Busca por período, tipo de medição e paginação
    
    ## Endpoints Principais
    
    * `/api/auth/*` - Autenticação e gerenciamento de usuário
    * `/api/clinical/*` - Registros e consultas clínicas
    * `/api/health/*` - Verificação de saúde da API
    """,
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    contact={
        "name": "Melitus Gym API",
        "url": "https://melitusgym-backend.onrender.com" if os.getenv("ENVIRONMENT") == "production" else "http://127.0.0.1:8000",
    },
    license_info={
        "name": "MIT",
    },
)

"""
Configuração de CORS
- Lê origens permitidas da variável de ambiente `ALLOWED_ORIGINS` (separadas por vírgula)
- Mantém fallback seguro para ambiente local
"""
cors_origins_env = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000")
allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

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
        "X-Requested-With"
    ],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Iniciando aplicação MelitusGym...")
    try:
        create_db_and_tables()
        logger.info("Banco de dados inicializado com sucesso")
        
        # Iniciar agendador de alarmes FCM em background
        asyncio.create_task(start_alarm_scheduler())
        logger.info("Agendador de alarmes iniciado")
        
    except Exception as e:
        logger.error(f"Erro durante inicialização: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Encerrando aplicação MelitusGym...")

# Incluir rotas
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(clinical.router, prefix="/api", tags=["clinical"])
app.include_router(alarms.router, prefix="/api", tags=["alarms"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(nutrition.router, prefix="/api", tags=["nutrition"])
app.include_router(nutrition_v2.router, prefix="/api", tags=["nutrition_v2"])

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
        # Verificar conexão com banco seria ideal aqui
        return JSONResponse(
            content={
                "status": "healthy",
                "timestamp": "2024-01-01T00:00:00Z",
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT") != "production"
    )