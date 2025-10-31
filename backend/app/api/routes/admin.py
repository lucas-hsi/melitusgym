from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session
from sqlmodel import text
from app.services.database import get_session
from app.core.logging_config import get_logger
import os

logger = get_logger("api.admin")

router = APIRouter(tags=["admin"])

@router.post("/reset-users")
async def reset_users(request: Request, session: Session = Depends(get_session)):
    """Reseta/limpa completamente a tabela de usuários.

    Segurança:
    - Requer header `X-Admin-Reset` com token igual a `ADMIN_RESET_TOKEN`.
    - Só habilitado quando `ENABLE_ADMIN_RESET=true` no ambiente.
    - Em produção, desabilitar após inicialização.
    """
    # Verificar habilitação explícita
    if os.getenv("ENABLE_ADMIN_RESET", "false").lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reset desabilitado pelo ambiente"
        )

    # Validar token do header
    token = request.headers.get("X-Admin-Reset")
    expected = os.getenv("ADMIN_RESET_TOKEN")
    if not token or not expected or token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de reset inválido"
        )

    try:
        # PostgreSQL: TRUNCATE com CASCADE para limpar dependências e reiniciar IDs
        session.exec(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
        session.commit()
        logger.warning("ADMIN RESET: Tabela 'users' foi limpa. Desabilite o reset após uso inicial.")
        return {"status": "ok", "message": "Users table wiped (RESTART IDENTITY CASCADE)"}
    except Exception as e:
        session.rollback()
        logger.error(f"Erro ao resetar tabela users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao resetar tabela de usuários"
        )