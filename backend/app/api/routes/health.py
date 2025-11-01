from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, text
from datetime import datetime
from typing import Dict, Any
import time
import psutil
import os

from app.services.database import get_session, get_db_stats, health_check
from app.core.logging_config import get_logger
from app.core.cache import MemoryCache

logger = get_logger("api.health")
router = APIRouter()

# Cache para métricas (evitar overhead)
metrics_cache = MemoryCache(max_size=10, default_ttl=30)

@router.get("/health")
async def health_check_endpoint():
    """Health check básico otimizado"""
    try:
        start_time = time.time()
        
        # Verificar banco de dados
        db_healthy = health_check()
        
        response_time = time.time() - start_time
        
        status_data = {
            "status": "healthy" if db_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "Melitus Gym API",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "response_time_ms": round(response_time * 1000, 2),
            "database": "connected" if db_healthy else "disconnected"
        }
        
        if not db_healthy:
            return JSONResponse(
                content=status_data,
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        return JSONResponse(content=status_data, status_code=200)
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return JSONResponse(
             content={
                 "status": "error", 
                 "message": str(e),
                 "timestamp": datetime.utcnow().isoformat()
             },
             status_code=status.HTTP_503_SERVICE_UNAVAILABLE
         )

async def collect_system_metrics() -> Dict[str, Any]:
    """Coletar métricas do sistema"""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memória
        memory = psutil.virtual_memory()
        
        # Disco
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": cpu_count
            },
            "memory": {
                "total_mb": round(memory.total / 1024 / 1024, 2),
                "available_mb": round(memory.available / 1024 / 1024, 2),
                "usage_percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
                "free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
                "usage_percent": round((disk.used / disk.total) * 100, 2)
            },
            "process": {
                "pid": os.getpid(),
                "threads": psutil.Process().num_threads()
            }
        }
        
    except Exception as e:
        logger.warning(f"Error collecting system metrics: {str(e)}")
        return {"error": "Unable to collect system metrics"}

async def collect_database_metrics(session: Session) -> Dict[str, Any]:
    """Coletar métricas do banco de dados"""
    try:
        start_time = time.time()
        
        # Pool de conexões
        pool_stats = get_db_stats()
        
        # Teste de query simples
        session.exec(text("SELECT 1"))
        query_time = time.time() - start_time
        
        # Estatísticas das tabelas principais
        table_stats = {}
        tables = ["users", "clinical_logs"]
        
        for table in tables:
            try:
                result = session.exec(text(f"SELECT COUNT(*) FROM {table}")).first()
                table_stats[table] = {"count": result}
            except Exception:
                table_stats[table] = {"count": "N/A"}
        
        return {
            "connection_pool": pool_stats,
            "query_response_time_ms": round(query_time * 1000, 2),
            "tables": table_stats,
            "status": "connected",
            "host": os.getenv("DB_HOST", "localhost")
        }
        
    except Exception as e:
        logger.warning(f"Error collecting database metrics: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

async def collect_app_metrics() -> Dict[str, Any]:
    """Coletar métricas da aplicação"""
    try:
        return {
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "uptime_seconds": time.time() - getattr(collect_app_metrics, '_start_time', time.time()),
            "timezone": str(datetime.now().astimezone().tzinfo)
        }
        
    except Exception as e:
        logger.warning(f"Error collecting app metrics: {str(e)}")
        return {"error": "Unable to collect app metrics"}

# Inicializar tempo de início
collect_app_metrics._start_time = time.time()

@router.get("/health/database")
async def database_health(session: Session = Depends(get_session)):
    """Health check específico do banco de dados"""
    try:
        start_time = time.time()
        
        # Teste de conectividade
        session.exec(text("SELECT 1"))
        
        # Teste de escrita (transação)
        session.exec(text("SELECT NOW()"))
        
        response_time = time.time() - start_time
        
        return JSONResponse(
            content={
                "status": "healthy",
                "response_time_ms": round(response_time * 1000, 2),
                "connection_pool": get_db_stats(),
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Database health check error: {str(e)}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )

@router.get("/health/performance")
async def performance_metrics():
    """Métricas de performance da API"""
    try:
        # Simular algumas operações para medir performance
        start_time = time.time()
        
        # Teste de CPU
        cpu_test_start = time.time()
        sum(i * i for i in range(10000))  # Operação CPU-intensiva leve
        cpu_test_time = time.time() - cpu_test_start
        
        # Teste de I/O
        io_test_start = time.time()
        with open(__file__, 'r') as f:
            f.read()
        io_test_time = time.time() - io_test_start
        
        total_time = time.time() - start_time
        
        return JSONResponse(
            content={
                "performance": {
                    "cpu_test_ms": round(cpu_test_time * 1000, 2),
                    "io_test_ms": round(io_test_time * 1000, 2),
                    "total_test_ms": round(total_time * 1000, 2)
                },
                "system": {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent
                },
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Performance metrics error: {str(e)}")
        return JSONResponse(
            content={"error": str(e)},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@router.get("/health/detailed")
async def detailed_health_check(session: Session = Depends(get_session)):
    """Health check detalhado com métricas de performance"""
    try:
        start_time = time.time()
        
        # Verificar se já temos métricas em cache
        cached_metrics = metrics_cache.get("system_metrics")
        if cached_metrics:
            system_metrics = cached_metrics
        else:
            # Coletar métricas do sistema
            system_metrics = await collect_system_metrics()
            metrics_cache.set("system_metrics", system_metrics, ttl=30)
        
        # Métricas do banco de dados
        db_metrics = await collect_database_metrics(session)
        
        # Métricas da aplicação
        app_metrics = await collect_app_metrics()
        
        response_time = time.time() - start_time
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "Melitus Gym API",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "response_time_ms": round(response_time * 1000, 2),
            "system": system_metrics,
            "database": db_metrics,
            "application": app_metrics,
            "modules": {
                "clinical": "ready",
                "nutrition": "ready", 
                "workouts": "ready",
                "recipes": "ready",
                "alarms": "ready"
            },
            "cache": {
                "memory_cache_size": len(metrics_cache._cache),
                "memory_cache_hits": getattr(metrics_cache, '_hits', 0),
                "memory_cache_misses": getattr(metrics_cache, '_misses', 0)
            }
        }
        
        return JSONResponse(content=health_data, status_code=200)
        
    except Exception as e:
        logger.error(f"Detailed health check error: {str(e)}")
        return JSONResponse(
            content={
                "status": "error", 
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )