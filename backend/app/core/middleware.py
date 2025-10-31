from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
import time
import uuid
from typing import Callable
import asyncio

from app.core.logging_config import get_logger
from app.core.cache import MemoryCache

logger = get_logger("middleware")

# Cache para métricas de performance
performance_cache = MemoryCache(max_size=1000, default_ttl=3600)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware para monitoramento de performance das requisições"""
    
    def __init__(self, app, slow_request_threshold: float = 1.0):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Gerar ID único para a requisição
        request_id = str(uuid.uuid4())[:8]
        
        # Adicionar contexto à requisição
        request.state.request_id = request_id
        request.state.start_time = time.time()
        
        # Log de início da requisição
        logger.debug(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")
            }
        )
        
        try:
            # Processar requisição
            response = await call_next(request)
            
            # Calcular tempo de resposta
            process_time = time.time() - request.state.start_time
            
            # Adicionar headers de performance
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            
            # Log de fim da requisição
            log_level = "warning" if process_time > self.slow_request_threshold else "info"
            getattr(logger, log_level)(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time * 1000, 2),
                    "slow_request": process_time > self.slow_request_threshold
                }
            )
            
            # Armazenar métricas no cache
            await self._store_metrics(request, response, process_time)
            
            return response
            
        except Exception as e:
            process_time = time.time() - request.state.start_time
            
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "error": str(e),
                    "process_time_ms": round(process_time * 1000, 2)
                }
            )
            raise
    
    async def _store_metrics(self, request: Request, response: Response, process_time: float):
        """Armazenar métricas de performance no cache"""
        try:
            endpoint = f"{request.method} {request.url.path}"
            
            # Obter métricas existentes ou criar novas
            metrics = performance_cache.get(f"metrics_{endpoint}") or {
                "count": 0,
                "total_time": 0,
                "min_time": float('inf'),
                "max_time": 0,
                "status_codes": {},
                "errors": 0
            }
            
            # Atualizar métricas
            metrics["count"] += 1
            metrics["total_time"] += process_time
            metrics["min_time"] = min(metrics["min_time"], process_time)
            metrics["max_time"] = max(metrics["max_time"], process_time)
            
            # Contabilizar status codes
            status_code = str(response.status_code)
            metrics["status_codes"][status_code] = metrics["status_codes"].get(status_code, 0) + 1
            
            # Contabilizar erros
            if response.status_code >= 400:
                metrics["errors"] += 1
            
            # Salvar no cache
            performance_cache.set(f"metrics_{endpoint}", metrics, ttl=3600)
            
        except Exception as e:
            logger.warning(f"Failed to store metrics: {str(e)}")

class CORSMiddleware(BaseHTTPMiddleware):
    """Middleware customizado para CORS"""
    
    def __init__(self, app, allowed_origins: list = None, allowed_methods: list = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["http://127.0.0.1:3000", "http://localhost:3000"]
        self.allowed_methods = allowed_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Verificar se é uma requisição OPTIONS (preflight)
        if request.method == "OPTIONS":
            response = Response()
        else:
            response = await call_next(request)
        
        # Adicionar headers CORS
        origin = request.headers.get("origin")
        if origin in self.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        
        response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allowed_methods)
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "86400"  # 24 horas
        
        return response

class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware para headers de segurança"""
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        # Headers de segurança
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        # Remover headers que expõem informações do servidor
        if "Server" in response.headers:
            del response.headers["Server"]
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware simples de rate limiting"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_cache = MemoryCache(max_size=10000, default_ttl=60)
        
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Obter IP do cliente
        client_ip = request.client.host if request.client else "unknown"
        
        # Verificar rate limit
        current_requests = self.request_cache.get(f"rate_limit_{client_ip}") or 0
        
        if current_requests >= self.requests_per_minute:
            logger.warning(
                f"Rate limit exceeded",
                extra={
                    "client_ip": client_ip,
                    "requests": current_requests,
                    "limit": self.requests_per_minute
                }
            )
            
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Incrementar contador
        self.request_cache.set(f"rate_limit_{client_ip}", current_requests + 1, ttl=60)
        
        return await call_next(request)

def get_performance_metrics() -> dict:
    """Obter métricas de performance agregadas"""
    try:
        all_metrics = {}
        
        # Iterar sobre todas as métricas no cache
        for key in performance_cache._cache.keys():
            if key.startswith("metrics_"):
                endpoint = key.replace("metrics_", "")
                metrics = performance_cache.get(key)
                
                if metrics and metrics["count"] > 0:
                    all_metrics[endpoint] = {
                        "requests": metrics["count"],
                        "avg_time_ms": round((metrics["total_time"] / metrics["count"]) * 1000, 2),
                        "min_time_ms": round(metrics["min_time"] * 1000, 2),
                        "max_time_ms": round(metrics["max_time"] * 1000, 2),
                        "error_rate": round((metrics["errors"] / metrics["count"]) * 100, 2),
                        "status_codes": metrics["status_codes"]
                    }
        
        return all_metrics
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        return {}

def clear_performance_metrics():
    """Limpar métricas de performance"""
    try:
        keys_to_remove = [key for key in performance_cache._cache.keys() if key.startswith("metrics_")]
        for key in keys_to_remove:
            performance_cache.delete(key)
        
        logger.info("Performance metrics cleared")
        
    except Exception as e:
        logger.error(f"Error clearing performance metrics: {str(e)}")