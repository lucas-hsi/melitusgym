from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
import os

# URL de conexão com o banco
# Para desenvolvimento local, usar SQLite
# Para produção/Docker, usar PostgreSQL
if os.getenv("USE_SQLITE", "true").lower() == "true":
    DATABASE_URL = "sqlite:///./healthtrack.db"
    engine_kwargs = {"echo": True if os.getenv("ENVIRONMENT") == "development" else False}
else:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://healthtrack_user:healthtrack_pass@db:5432/healthtrack"
    )
    engine_kwargs = {
        "echo": True if os.getenv("ENVIRONMENT") == "development" else False
    }

# Criar engine do banco
engine = create_engine(DATABASE_URL, **engine_kwargs)

def create_db_and_tables():
    """Cria as tabelas no banco de dados"""
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    """Dependência para obter sessão do banco"""
    with Session(engine) as session:
        yield session