"""
Configurações centralizadas do MelitusGym Backend
"""

import os
import json
from typing import List, Optional
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import field_validator
except ImportError:
    # Compatibilidade com Pydantic v1
    from pydantic import BaseSettings, validator as field_validator
    SettingsConfigDict = None


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
    # Aceita str (CSV/JSON) ou List[str] para compatibilidade com EnvSettingsSource
    cors_origins: List[str] | str = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://tranquil-vitality-production-15a2.up.railway.app"
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
    
    # Validador de ambiente (executa após parsing)
    @field_validator("environment")
    def validate_environment(cls, v):
        if v not in ["development", "production", "testing"]:
            raise ValueError("Environment must be development, production, or testing")
        return v
    
    # Validador de CORS (executa antes para aceitar CSV/JSON/lista)
    @field_validator("cors_origins", mode="before")
    def parse_cors_origins(cls, v):
        """Aceita formatos:
        - String separada por vírgulas: "http://127.0.0.1:3000,http://localhost:3000"
        - Lista JSON em string: "[\"http://127.0.0.1:3000\",\"http://localhost:3000\"]"
        - Lista Python: ["http://127.0.0.1:3000", "http://localhost:3000"]
        """
        default_origins = [
            "http://127.0.0.1:3000",
            "http://localhost:3000",
            "https://tranquil-vitality-production-15a2.up.railway.app"
        ]
        
        try:
            # Se já é uma lista, retorna como está
            if isinstance(v, list):
                return [str(origin).strip() for origin in v if origin]
            
            # Se é None ou string vazia, retorna lista padrão
            if not v or (isinstance(v, str) and not v.strip()):
                return default_origins
            
            if isinstance(v, str):
                s = v.strip()
                
                # Se string vazia após strip, retorna padrão
                if not s:
                    return default_origins
                
                # Tentar parse como JSON array apenas se parece com JSON válido
                if s.startswith("[") and s.endswith("]") and len(s) > 2:
                    try:
                        arr = json.loads(s)
                        if isinstance(arr, list):
                            origins = [str(origin).strip() for origin in arr if origin]
                            return origins if origins else default_origins
                    except (json.JSONDecodeError, ValueError, TypeError):
                        # Se falhar o JSON parse, tenta como CSV removendo colchetes
                        s = s.strip("[]").replace('"', '').replace("'", "")
                
                # Parse como CSV (formato recomendado para Railway)
                origins = [origin.strip() for origin in s.split(",") if origin.strip()]
                return origins if origins else default_origins
            
            # Fallback para qualquer outro tipo
            return default_origins
            
        except Exception:
            # Em caso de qualquer erro, retorna configuração padrão
            return default_origins
    
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
    
    # Configuração de Settings
    if SettingsConfigDict:
        # Pydantic v2
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="allow",
        )
    else:
        # Pydantic v1
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            case_sensitive = False
            extra = "allow"  # Permitir campos extras


@lru_cache()
def get_settings() -> Settings:
    """Obtém as configurações da aplicação (cached)"""
    return Settings()


# Função para obter configurações sem cache (para testes)
def get_settings_no_cache() -> Settings:
    """Obtém as configurações da aplicação sem cache"""
    return Settings()


# Instância global das configurações (lazy loading)
_settings = None

def settings() -> Settings:
    """Obtém a instância global das configurações"""
    global _settings
    if _settings is None:
        _settings = get_settings()
    return _settings