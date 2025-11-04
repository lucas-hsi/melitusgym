from typing import Dict, List
from sqlalchemy import inspect, text
from app.core.logging_config import get_logger
from .database import get_engine, DATABASE_URL

logger = get_logger("schema_guard")

# Colunas esperadas para a tabela meal_logs
EXPECTED_MEAL_LOG_COLUMNS: Dict[str, str] = {
    # nome: DDL
    "carbohydrates_total": "DOUBLE PRECISION",
    "glucose_value": "DOUBLE PRECISION",
    "glucose_measured": "BOOLEAN DEFAULT FALSE NOT NULL",
    "glucose_measure_timing": "VARCHAR(16)",
    "insulin_recommended_units": "DOUBLE PRECISION",
    "insulin_applied_units": "DOUBLE PRECISION",
    "recorded_at": "TIMESTAMP"
}


def _is_sqlite() -> bool:
    return DATABASE_URL.startswith("sqlite") or "sqlite" in DATABASE_URL


def verify_and_migrate_meal_logs() -> Dict[str, List[str]]:
    """
    Verifica se a tabela 'meal_logs' contém todas as colunas necessárias e cria
    automaticamente as que estiverem faltando. Compatível com PostgreSQL (Railway) e SQLite.

    Retorna um dict com listas de 'missing' e 'created'.
    """
    engine = get_engine()
    inspector = inspect(engine)

    expected_columns = EXPECTED_MEAL_LOG_COLUMNS

    # Coletar colunas existentes
    try:
        existing_cols = {c["name"] for c in inspector.get_columns("meal_logs")}
    except Exception as e:
        logger.error(f"Erro ao inspecionar tabela meal_logs: {e}")
        return {"missing": list(expected_columns.keys()), "created": []}

    missing = [col for col in expected_columns.keys() if col not in existing_cols]
    created: List[str] = []

    if not missing:
        logger.info("Schema 'meal_logs' OK — nenhuma coluna faltando.")
        return {"missing": [], "created": []}

    logger.warning(f"Schema 'meal_logs' faltando colunas: {missing}")

    # Criar colunas faltantes de forma segura
    with engine.begin() as conn:
        for col in missing:
            ddl_type = expected_columns[col]
            try:
                if _is_sqlite():
                    # SQLite não suporta IF NOT EXISTS para ADD COLUMN
                    conn.execute(text(f"ALTER TABLE meal_logs ADD COLUMN {col} {ddl_type}"))
                else:
                    # Postgres: já verificamos colunas faltantes, então ADD COLUMN direto é seguro
                    conn.execute(text(f"ALTER TABLE meal_logs ADD COLUMN {col} {ddl_type}"))
                created.append(col)
                logger.info(f"Coluna criada: meal_logs.{col} ({ddl_type})")
            except Exception as e:
                logger.error(f"Falha ao criar coluna {col}: {e}")

    return {"missing": missing, "created": created}


def log_schema_status_on_startup() -> None:
    """Registra o status do schema ao iniciar a aplicação."""
    status = verify_and_migrate_meal_logs()
    if status["missing"]:
        logger.warning({
            "schema": "meal_logs",
            "missing": status["missing"],
            "created": status["created"]
        })
    else:
        logger.info({"schema": "meal_logs", "status": "OK"})


def get_meal_logs_schema_status() -> Dict[str, List[str]]:
    """Retorna status do schema da tabela meal_logs sem realizar migração."""
    engine = get_engine()
    inspector = inspect(engine)

    try:
        existing_cols = {c["name"] for c in inspector.get_columns("meal_logs")}
    except Exception as e:
        logger.error(f"Erro ao inspecionar tabela meal_logs: {e}")
        return {"missing": list(EXPECTED_MEAL_LOG_COLUMNS.keys()), "existing": []}

    missing = [col for col in EXPECTED_MEAL_LOG_COLUMNS.keys() if col not in existing_cols]
    return {"missing": missing, "existing": sorted(list(existing_cols))}