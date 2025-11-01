from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import QueuePool
from sqlalchemy import event
from app.core.logging_config import get_logger
from typing import Generator
import time
import os

logger = get_logger("database")

def get_database_url() -> str:
    """Obtém a URL do banco de dados baseada na configuração"""
    
    # Para desenvolvimento local, usar SQLite
    # Para produção/Railway, usar PostgreSQL
    if os.getenv("USE_SQLITE", "true").lower() == "true":
        return "sqlite:///./healthtrack.db"
    else:
        # Usar DATABASE_URL do Railway ou fallback para configuração manual
        database_url = os.getenv("DATABASE_URL")
        
        if database_url:
            return database_url
        
        # Fallback: construir URL a partir de variáveis individuais
        postgres_user = os.getenv("POSTGRES_USER", "postgres")
        postgres_password = os.getenv("POSTGRES_PASSWORD", "")
        postgres_host = os.getenv("POSTGRES_HOST", "localhost")
        postgres_port = os.getenv("POSTGRES_PORT", "5432")
        postgres_db = os.getenv("POSTGRES_DB", "healthtrack")
        
        return f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"

def get_engine_kwargs() -> dict:
    """Obtém configurações do engine baseadas no tipo de banco"""
    
    base_kwargs = {
        "echo": os.getenv("ENVIRONMENT") == "development",
        "pool_pre_ping": True,
    }
    
    # Configurações específicas para PostgreSQL
    if os.getenv("USE_SQLITE", "true").lower() != "true":
        base_kwargs.update({
            "poolclass": QueuePool,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 3600,  # 1 hora
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "melitus_gym_api",
                "options": "-c timezone=UTC -c statement_timeout=30000"  # 30s timeout
            }
        })
    else:
        # Configurações para SQLite
        base_kwargs.update({
            "connect_args": {
                "check_same_thread": False
            }
        })
    
    return base_kwargs

# URL de conexão com o banco
DATABASE_URL = get_database_url()

# Configurações do engine
engine_kwargs = get_engine_kwargs()

# Criar engine otimizado
engine = create_engine(DATABASE_URL, **engine_kwargs)

# Event listeners para monitoramento
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Configurações específicas por tipo de banco"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=10000")
        cursor.close()

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log quando uma conexão é retirada do pool"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log quando uma conexão retorna ao pool"""
    logger.debug("Connection checked in to pool")

def get_engine():
    """Obter engine do banco de dados"""
    return engine

def create_db_and_tables():
    """Criar banco de dados e tabelas"""
    try:
        logger.info("Creating database tables...")
        SQLModel.metadata.create_all(engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Error creating database tables: {str(e)}")
        raise

def get_session() -> Generator[Session, None, None]:
    """Obter sessão do banco de dados com monitoramento"""
    start_time = time.time()
    
    try:
        with Session(engine) as session:
            logger.debug("Database session created")
            yield session
            
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        duration = time.time() - start_time
        if duration > 1.0:  # Log sessões lentas
            logger.warning(f"Slow database session: {duration:.2f}s")
        else:
            logger.debug(f"Database session completed in {duration:.3f}s")

def get_db_stats():
    """Obter estatísticas do pool de conexões"""
    try:
        pool = engine.pool
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid()
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {str(e)}")
        return {}

def health_check():
    """Verificar saúde da conexão com o banco"""
    try:
        from sqlmodel import text
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return False