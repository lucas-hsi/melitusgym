import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import os

class NutritionLogger:
    """Logger especializado para observabilidade de nutrição"""
    
    def __init__(self, log_level: str = "INFO"):
        self.logger = logging.getLogger("nutrition_service")
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # Configurar handler se não existir
        if not self.logger.handlers:
            self._setup_logger()
    
    def _setup_logger(self):
        """Configura o logger com formatação estruturada"""
        
        # Criar diretório de logs se não existir
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Handler para arquivo
        file_handler = logging.FileHandler(
            log_dir / "nutrition_service.log",
            encoding="utf-8"
        )
        
        # Handler para console
        console_handler = logging.StreamHandler()
        
        # Formatação estruturada
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def log_search_request(self, term: str, source: str, page_size: int):
        """Log de requisição de busca"""
        self.logger.info(
            f"SEARCH_REQUEST - term: {term}, source: {source}, page_size: {page_size}"
        )
    
    def log_search_response(
        self, 
        term: str, 
        source: str, 
        results_count: int, 
        latency_ms: float,
        success: bool = True
    ):
        """Log de resposta de busca"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(
            f"SEARCH_RESPONSE - {status} - term: {term}, source: {source}, "
            f"results: {results_count}, latency: {latency_ms:.2f}ms"
        )
    
    def log_fallback_attempt(self, primary_source: str, fallback_source: str, term: str):
        """Log de tentativa de fallback"""
        self.logger.warning(
            f"FALLBACK_ATTEMPT - primary: {primary_source} failed, "
            f"trying: {fallback_source}, term: {term}"
        )
    
    def log_calculation_request(
        self, 
        portion_value: float, 
        portion_unit: str, 
        base_unit: str
    ):
        """Log de requisição de cálculo"""
        self.logger.info(
            f"CALC_REQUEST - portion: {portion_value}{portion_unit}, base: {base_unit}"
        )
    
    def log_calculation_response(
        self, 
        conversion_factor: float, 
        method: str, 
        latency_ms: float,
        success: bool = True
    ):
        """Log de resposta de cálculo"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(
            f"CALC_RESPONSE - {status} - factor: {conversion_factor:.4f}, "
            f"method: {method}, latency: {latency_ms:.2f}ms"
        )
    
    def log_api_error(
        self, 
        endpoint: str, 
        source: str, 
        error_type: str, 
        error_message: str,
        request_params: Optional[Dict[str, Any]] = None
    ):
        """Log de erro de API"""
        params_str = json.dumps(request_params) if request_params else "N/A"
        self.logger.error(
            f"API_ERROR - endpoint: {endpoint}, source: {source}, "
            f"type: {error_type}, message: {error_message}, params: {params_str}"
        )
    
    def log_rate_limit(self, source: str, retry_after: Optional[int] = None):
        """Log de rate limiting"""
        retry_info = f", retry_after: {retry_after}s" if retry_after else ""
        self.logger.warning(f"RATE_LIMIT - source: {source}{retry_info}")
    
    def log_cache_hit(self, cache_key: str, source: str):
        """Log de cache hit"""
        self.logger.debug(f"CACHE_HIT - key: {cache_key}, source: {source}")
    
    def log_cache_miss(self, cache_key: str, source: str):
        """Log de cache miss"""
        self.logger.debug(f"CACHE_MISS - key: {cache_key}, source: {source}")
    
    def log_service_health(self, service: str, status: str, details: Optional[str] = None):
        """Log de health check de serviço"""
        details_str = f", details: {details}" if details else ""
        self.logger.info(f"SERVICE_HEALTH - {service}: {status}{details_str}")
    
    def log_performance_metrics(
        self, 
        operation: str, 
        metrics: Dict[str, Any]
    ):
        """Log de métricas de performance"""
        metrics_str = json.dumps(metrics, default=str)
        self.logger.info(f"PERFORMANCE - {operation} - {metrics_str}")
    
    def log_data_quality_issue(
        self, 
        source: str, 
        item_id: str, 
        issue_type: str, 
        description: str
    ):
        """Log de problemas de qualidade de dados"""
        self.logger.warning(
            f"DATA_QUALITY - source: {source}, item: {item_id}, "
            f"issue: {issue_type}, desc: {description}"
        )
    
    def log_user_behavior(
        self, 
        action: str, 
        search_term: Optional[str] = None, 
        selected_item: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Log de comportamento do usuário (anonimizado)"""
        context = []
        if search_term:
            context.append(f"term: {search_term}")
        if selected_item:
            context.append(f"item: {selected_item}")
        if session_id:
            context.append(f"session: {session_id[:8]}...")  # Apenas primeiros 8 chars
        
        context_str = ", ".join(context) if context else "N/A"
        self.logger.info(f"USER_BEHAVIOR - {action} - {context_str}")

class NutritionMetrics:
    """Coletor de métricas de performance"""
    
    def __init__(self):
        self.metrics = {
            "search_requests": 0,
            "search_successes": 0,
            "search_failures": 0,
            "calculation_requests": 0,
            "calculation_successes": 0,
            "calculation_failures": 0,
            "api_calls_off": 0,
            "api_calls_fdc": 0,
            "fallback_attempts": 0,
            "total_latency_ms": 0.0,
            "avg_latency_ms": 0.0
        }
        self.logger = NutritionLogger()
    
    def increment_counter(self, metric_name: str, value: int = 1):
        """Incrementa contador de métrica"""
        if metric_name in self.metrics:
            self.metrics[metric_name] += value
    
    def add_latency(self, latency_ms: float):
        """Adiciona latência e recalcula média"""
        self.metrics["total_latency_ms"] += latency_ms
        total_requests = (
            self.metrics["search_requests"] + 
            self.metrics["calculation_requests"]
        )
        if total_requests > 0:
            self.metrics["avg_latency_ms"] = (
                self.metrics["total_latency_ms"] / total_requests
            )
    
    def get_success_rate(self, operation: str) -> float:
        """Calcula taxa de sucesso para operação"""
        if operation == "search":
            total = self.metrics["search_requests"]
            success = self.metrics["search_successes"]
        elif operation == "calculation":
            total = self.metrics["calculation_requests"]
            success = self.metrics["calculation_successes"]
        else:
            return 0.0
        
        return (success / total * 100) if total > 0 else 0.0
    
    def log_current_metrics(self):
        """Log das métricas atuais"""
        self.logger.log_performance_metrics("current_state", self.metrics)
    
    def reset_metrics(self):
        """Reset das métricas"""
        for key in self.metrics:
            if isinstance(self.metrics[key], (int, float)):
                self.metrics[key] = 0 if isinstance(self.metrics[key], int) else 0.0
        
        self.logger.logger.info("METRICS_RESET - All metrics reset to zero")

# Instância global para uso nos serviços
nutrition_logger = NutritionLogger()
nutrition_metrics = NutritionMetrics()