"""
Configurações centralizadas do MelitusGym Backend
"""

import os
from typing import List, Optional
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings
    from pydantic import validator
except ImportError:
    from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Aplicação
    app_name: str = "MelitusGym API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    timezone: str = "America/Sao_Paulo"
    
    # Servidor
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Banco de dados
    use_sqlite: bool = True
    database_url: Optional[str] = None
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_host: str = "localhost"
    postgres_port: str = "5432"
    postgres_db: str = "melitusgym"
    
    # JWT
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # CORS
    cors_origins: List[str] = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://melitusgym.vercel.app"
    ]
    
    # Logging
    log_level: str = "INFO"
    
    # APIs externas
    fdc_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Firebase
    fcm_project_id: Optional[str] = None
    fcm_private_key: Optional[str] = None
    fcm_client_email: Optional[str] = None
    fcm_credentials_path: Optional[str] = None
    
    # Cache
    redis_url: Optional[str] = None
    cache_ttl: int = 300  # 5 minutos
    
    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # 1 minuto
    
    @validator("environment")
    def validate_environment(cls, v):
        if v not in ["development", "production", "testing"]:
            raise ValueError("Environment must be development, production, or testing")
        return v
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @property
    def is_development(self) -> bool:
        return self.environment == "development"
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
    
    @property
    def is_testing(self) -> bool:
        return self.environment == "testing"
    
    def get_database_url(self) -> str:
        """Obtém a URL do banco de dados baseada na configuração"""
        
        # Se DATABASE_URL está definida, usar ela
        if self.database_url:
            return self.database_url
        
        # Para desenvolvimento local, usar SQLite por padrão
        if self.use_sqlite:
            return "sqlite:///./melitusgym.db"
        
        # Construir URL PostgreSQL
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # Permitir campos extras


@lru_cache()
def get_settings() -> Settings:
    """Obtém as configurações da aplicação (cached)"""
    return Settings()


# Instância global das configurações
settings = get_settings()