from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import health, auth, clinical, alarms, notifications, nutrition, nutrition_v2
from app.services.database import create_db_and_tables
from app.services.fcm_service import start_alarm_scheduler
import os
import asyncio
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

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
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Melitus Gym API",
        "url": "http://127.0.0.1:8000",
    },
    license_info={
        "name": "MIT",
    },
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
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
    create_db_and_tables()
    # Iniciar agendador de alarmes FCM em background
    asyncio.create_task(start_alarm_scheduler())

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
            "message": "HealthTrack Pro API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )