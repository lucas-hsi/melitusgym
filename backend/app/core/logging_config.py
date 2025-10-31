"""
Configuração centralizada de logging estruturado
Implementa logging com contexto, correlation IDs e diferentes níveis
"""
import logging
import logging.config
import os
import sys
from typing import Dict, Any
import json
from datetime import datetime

class StructuredFormatter(logging.Formatter):
    """Formatter que produz logs estruturados em JSON"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Dados base do log
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Adicionar contexto extra se disponível
        if hasattr(record, 'correlation_id'):
            log_data["correlation_id"] = record.correlation_id
        
        if hasattr(record, 'user_id'):
            log_data["user_id"] = record.user_id
        
        if hasattr(record, 'request_id'):
            log_data["request_id"] = record.request_id
        
        # Adicionar dados extras do record
        extra_data = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'message', 'exc_info', 'exc_text', 
                          'stack_info', 'correlation_id', 'user_id', 'request_id']:
                extra_data[key] = value
        
        if extra_data:
            log_data["extra"] = extra_data
        
        # Adicionar informações de exceção se disponível
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info) if record.exc_info else None
            }
        
        return json.dumps(log_data, ensure_ascii=False, default=str)

class SimpleFormatter(logging.Formatter):
    """Formatter simples para desenvolvimento"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Formato simples para desenvolvimento
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        correlation_id = getattr(record, 'correlation_id', '')
        correlation_part = f" [{correlation_id[:8]}]" if correlation_id else ""
        
        return f"{timestamp} - {record.levelname:8} - {record.name:20} - {record.getMessage()}{correlation_part}"

def setup_logging() -> None:
    """Configura o sistema de logging da aplicação"""
    
    # Determinar ambiente
    environment = os.getenv("ENVIRONMENT", "development")
    log_level = os.getenv("LOG_LEVEL", "INFO" if environment == "production" else "DEBUG")
    
    # Configuração base
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
            },
            "simple": {
                "()": SimpleFormatter,
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "structured" if environment == "production" else "simple",
                "level": log_level
            }
        },
        "loggers": {
            # Logger da aplicação
            "app": {
                "level": log_level,
                "handlers": ["console"],
                "propagate": False
            },
            # Logger do FastAPI
            "fastapi": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            # Logger do SQLAlchemy (apenas warnings e errors em produção)
            "sqlalchemy": {
                "level": "WARNING" if environment == "production" else "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            # Logger do Uvicorn
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO" if environment == "production" else "DEBUG",
                "handlers": ["console"],
                "propagate": False
            }
        },
        "root": {
            "level": log_level,
            "handlers": ["console"]
        }
    }
    
    # Aplicar configuração
    logging.config.dictConfig(logging_config)
    
    # Log de inicialização
    logger = logging.getLogger("app.core.logging")
    logger.info(
        "Logging system initialized",
        extra={
            "environment": environment,
            "log_level": log_level,
            "formatter": "structured" if environment == "production" else "simple"
        }
    )

def get_logger(name: str) -> logging.Logger:
    """Obtém logger configurado para um módulo específico"""
    return logging.getLogger(f"app.{name}")

class LoggerAdapter(logging.LoggerAdapter):
    """Adapter que adiciona contexto automático aos logs"""
    
    def __init__(self, logger: logging.Logger, extra: Dict[str, Any] = None):
        super().__init__(logger, extra or {})
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        # Mesclar contexto extra com kwargs
        if 'extra' in kwargs:
            kwargs['extra'].update(self.extra)
        else:
            kwargs['extra'] = self.extra.copy()
        
        return msg, kwargs

def get_context_logger(name: str, **context) -> LoggerAdapter:
    """Obtém logger com contexto automático"""
    logger = get_logger(name)
    return LoggerAdapter(logger, context)

# Configurar logging na importação
setup_logging()