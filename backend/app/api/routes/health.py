from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Endpoint de health check para verificar se a API está funcionando
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "HealthTrack Pro API",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development")
        },
        status_code=200
    )

@router.get("/health/detailed")
async def detailed_health_check():
    """
    Health check detalhado com informações do sistema
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "HealthTrack Pro API",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "database": {
                "status": "connected",  # TODO: Implementar verificação real do DB
                "host": os.getenv("DB_HOST", "localhost")
            },
            "modules": {
                "clinical": "ready",
                "nutrition": "ready", 
                "workouts": "ready",
                "recipes": "ready",
                "alarms": "ready"
            }
        },
        status_code=200
    )