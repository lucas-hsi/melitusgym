from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import QueuePool
from sqlalchemy import event
from app.core.logging_config import get_logger
from typing import Generator
import time
import os

logger = get_logger("database")

def get_database_url() -> str:
    """Obtém a URL do banco de dados do ambiente.
    - Em testes, usa SQLite em memória.
    - Em qualquer outro caso, exige DATABASE_URL do ambiente (Railway ou local).
    """
    # Modo de testes força banco em memória
    if os.getenv("TESTING", "false").lower() == "true":
        return "sqlite:///:memory:"

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError("DATABASE_URL não configurado no ambiente!")

    return database_url

def get_engine_kwargs(database_url: str) -> dict:
    """Obtém configurações do engine baseadas no tipo de banco.
    Importante: nunca passar "check_same_thread" para PostgreSQL/psycopg2.
    """
    
    base_kwargs = {
        "echo": os.getenv("ENVIRONMENT") == "development",
        "pool_pre_ping": True,
    }
    
    is_sqlite = database_url.startswith("sqlite:") or "sqlite" in database_url

    if not is_sqlite:
        # Configurações específicas para PostgreSQL (psycopg2)
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
                # Apenas para SQLite local/testes; NÃO usar em PostgreSQL
                "check_same_thread": False
            }
        })
    
    return base_kwargs

# URL de conexão com o banco
DATABASE_URL = get_database_url()

# Aviso preventivo se apontar para localhost
if "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
    logger.warning("⚠️  Atenção: DATABASE_URL está apontando para localhost. Ajuste nas variáveis do Railway.")

# Aviso leve sobre arquivo TACO ausente (não impede startup)
try:
    if not os.path.exists("Taco-4a-Edicao.xlsx"):
        logger.warning("⚠️  Aviso: arquivo Taco-4a-Edicao.xlsx não encontrado, continuando normalmente.")
except Exception:
    # Silenciar qualquer erro inesperado nesta verificação opcional
    pass

# Configurações do engine (decididas pelo DATABASE_URL resolvido)
engine_kwargs = get_engine_kwargs(DATABASE_URL)

# Criar engine otimizado com tratamento de erro
try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    logger.info("✅ Banco conectado com sucesso.")
except Exception as e:
    logger.error(f"❌ Erro ao conectar ao banco: {e}")
    raise

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