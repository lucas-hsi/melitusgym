"""
Sistema centralizado de exceções e tratamento de erros
Implementa padrões consistentes para toda a aplicação
"""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from typing import Dict, Any
import logging
import traceback
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class MelitusException(Exception):
    """Exceção base para o sistema Melitus"""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code or "MELITUS_ERROR"
        self.details = details or {}
        self.correlation_id = str(uuid.uuid4())
        super().__init__(self.message)

class ValidationError(MelitusException):
    """Erro de validação de dados"""
    def __init__(self, message: str, field: str = None, details: Dict[str, Any] = None):
        super().__init__(message, "VALIDATION_ERROR", details)
        self.field = field

class BusinessLogicError(MelitusException):
    """Erro de lógica de negócio"""
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, "BUSINESS_LOGIC_ERROR", details)

class DatabaseError(MelitusException):
    """Erro de banco de dados"""
    def __init__(self, message: str, original_error: Exception = None, details: Dict[str, Any] = None):
        super().__init__(message, "DATABASE_ERROR", details)
        self.original_error = original_error

class AuthenticationError(MelitusException):
    """Erro de autenticação"""
    def __init__(self, message: str = "Authentication failed", details: Dict[str, Any] = None):
        super().__init__(message, "AUTHENTICATION_ERROR", details)

class AuthorizationError(MelitusException):
    """Erro de autorização"""
    def __init__(self, message: str = "Access denied", details: Dict[str, Any] = None):
        super().__init__(message, "AUTHORIZATION_ERROR", details)

class ExternalServiceError(MelitusException):
    """Erro de serviço externo"""
    def __init__(self, service_name: str, message: str, details: Dict[str, Any] = None):
        super().__init__(f"External service error ({service_name}): {message}", "EXTERNAL_SERVICE_ERROR", details)
        self.service_name = service_name

def create_error_response(
    status_code: int,
    message: str,
    error_code: str = None,
    details: Dict[str, Any] = None,
    correlation_id: str = None
) -> JSONResponse:
    """Cria resposta de erro padronizada"""
    
    error_response = {
        "error": {
            "message": message,
            "code": error_code or "UNKNOWN_ERROR",
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": correlation_id or str(uuid.uuid4())
        }
    }
    
    if details:
        error_response["error"]["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

async def melitus_exception_handler(request: Request, exc: MelitusException) -> JSONResponse:
    """Handler para exceções customizadas do Melitus"""
    
    # Log do erro com contexto
    logger.error(
        f"MelitusException: {exc.error_code} - {exc.message}",
        extra={
            "correlation_id": exc.correlation_id,
            "error_code": exc.error_code,
            "details": exc.details,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    # Mapear tipos de erro para status codes
    status_code_map = {
        "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
        "BUSINESS_LOGIC_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "AUTHENTICATION_ERROR": status.HTTP_401_UNAUTHORIZED,
        "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
        "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "EXTERNAL_SERVICE_ERROR": status.HTTP_503_SERVICE_UNAVAILABLE,
    }
    
    status_code = status_code_map.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return create_error_response(
        status_code=status_code,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details,
        correlation_id=exc.correlation_id
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler para HTTPException do FastAPI"""
    
    correlation_id = str(uuid.uuid4())
    
    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail}",
        extra={
            "correlation_id": correlation_id,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return create_error_response(
        status_code=exc.status_code,
        message=str(exc.detail),
        error_code="HTTP_ERROR",
        correlation_id=correlation_id
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handler para erros de validação do Pydantic"""
    
    correlation_id = str(uuid.uuid4())
    
    # Extrair detalhes dos erros de validação
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"Validation error: {len(validation_errors)} field(s) failed validation",
        extra={
            "correlation_id": correlation_id,
            "validation_errors": validation_errors,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation failed",
        error_code="VALIDATION_ERROR",
        details={"validation_errors": validation_errors},
        correlation_id=correlation_id
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handler para erros do SQLAlchemy"""
    
    correlation_id = str(uuid.uuid4())
    
    # Log completo do erro para debugging
    logger.error(
        f"Database error: {type(exc).__name__}",
        extra={
            "correlation_id": correlation_id,
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    # Mensagem genérica para o usuário (não expor detalhes internos)
    if isinstance(exc, IntegrityError):
        message = "Data integrity constraint violation"
        error_code = "INTEGRITY_ERROR"
    else:
        message = "Database operation failed"
        error_code = "DATABASE_ERROR"
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        error_code=error_code,
        correlation_id=correlation_id
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handler geral para exceções não tratadas"""
    
    correlation_id = str(uuid.uuid4())
    
    # Log completo do erro
    logger.error(
        f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "correlation_id": correlation_id,
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Internal server error",
        error_code="INTERNAL_ERROR",
        correlation_id=correlation_id
    )

def setup_exception_handlers(app: FastAPI) -> None:
    """Configura todos os handlers de exceção da aplicação"""
    
    # Handler para exceções customizadas do Melitus
    app.add_exception_handler(MelitusException, melitus_exception_handler)
    
    # Handler para HTTPException do FastAPI
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Handler para erros de validação
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Handler para erros do SQLAlchemy
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    
    # Handler geral para exceções não tratadas
    app.add_exception_handler(Exception, general_exception_handler)
    
    logger.info("Exception handlers configured successfully")