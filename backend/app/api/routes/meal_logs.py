from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.meal_log import MealLog
from ...schemas.meal_log import MealLogCreate, MealLogRead, MealLogUpdate
from ...services.database import get_session
from ...services.auth import get_current_user
from ...models.user import User
from ...core.logging_config import get_logger

router = APIRouter(prefix="/meal-logs", tags=["Meal Logs"])
logger = get_logger("api.meal_logs")


@router.post("/", response_model=MealLogRead)
async def create_meal_log(
    meal_log: MealLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Cria um novo registro de refeição"""
    # Garantir que os itens estejam em formato serializável (lista de dicts)
    try:
        serialized_items = [item.dict() for item in meal_log.items]
    except Exception:
        # Caso já venham como dicts
        serialized_items = meal_log.items

    db_meal_log = MealLog(
        user_id=str(current_user.id),
        meal_time=meal_log.meal_time,
        meal_date=meal_log.meal_date,
        items=serialized_items,
        total_nutrients=meal_log.total_nutrients,
        notes=meal_log.notes,
        carbohydrates_total=meal_log.carbohydrates_total if meal_log.carbohydrates_total is not None else (
            float(meal_log.total_nutrients.get("carbohydrates", 0)) if isinstance(meal_log.total_nutrients, dict) else None
        ),
        glucose_value=meal_log.glucose_value,
        glucose_measured=meal_log.glucose_measured or False,
        glucose_measure_timing=meal_log.glucose_measure_timing,
        insulin_recommended_units=meal_log.insulin_recommended_units,
        insulin_applied_units=meal_log.insulin_applied_units,
        recorded_at=meal_log.recorded_at or datetime.now()
    )
    
    session.add(db_meal_log)
    session.commit()
    session.refresh(db_meal_log)

    # Auditoria
    try:
        logger.info(
            f"MEAL_LOG_CREATE user_id={current_user.id} id={db_meal_log.id} "
            f"meal_time={db_meal_log.meal_time} carbs_total={db_meal_log.carbohydrates_total} "
            f"glucose_value={db_meal_log.glucose_value} glucose_measured={db_meal_log.glucose_measured} "
            f"glucose_timing={db_meal_log.glucose_measure_timing} insulin_rec={db_meal_log.insulin_recommended_units} "
            f"insulin_applied={db_meal_log.insulin_applied_units} recorded_at={db_meal_log.recorded_at}"
        )
    except Exception:
        # Evitar que falhas de logging quebrem a request
        pass
    
    return db_meal_log


@router.get("/", response_model=List[MealLogRead])
async def get_meal_logs(
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    meal_time: Optional[str] = Query(None, description="Momento da refeição"),
    limit: int = Query(10, ge=1, le=100, description="Limite de registros"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obtém registros de refeição do usuário atual"""
    query = select(MealLog).where(MealLog.user_id == str(current_user.id))
    
    if start_date:
        query = query.where(MealLog.meal_date >= start_date)
    
    if end_date:
        query = query.where(MealLog.meal_date <= end_date)
    
    if meal_time:
        query = query.where(MealLog.meal_time == meal_time)
    
    query = query.order_by(MealLog.meal_date.desc()).offset(offset).limit(limit)
    
    results = session.exec(query).all()
    # Auditoria leve (metric)
    try:
        logger.debug(
            f"MEAL_LOG_LIST user_id={current_user.id} count={len(results)} meal_time={meal_time or 'any'}"
        )
    except Exception:
        pass
    return results


@router.get("/recent", response_model=List[MealLogRead])
async def get_recent_meal_logs(
    days: int = Query(7, ge=1, le=30, description="Número de dias para buscar"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obtém registros de refeição recentes do usuário atual"""
    start_date = datetime.now() - timedelta(days=days)
    
    query = select(MealLog).where(
        MealLog.user_id == str(current_user.id),
        MealLog.meal_date >= start_date
    ).order_by(MealLog.meal_date.desc())
    
    results = session.exec(query).all()
    try:
        logger.debug(
            f"MEAL_LOG_RECENT user_id={current_user.id} days={days} count={len(results)}"
        )
    except Exception:
        pass
    return results


@router.get("/{meal_log_id}", response_model=MealLogRead)
async def get_meal_log(
    meal_log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obtém um registro de refeição específico"""
    meal_log = session.get(MealLog, meal_log_id)
    
    if not meal_log:
        raise HTTPException(status_code=404, detail="Registro de refeição não encontrado")
    
    if meal_log.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
    try:
        logger.debug(
            f"MEAL_LOG_GET user_id={current_user.id} id={meal_log_id}"
        )
    except Exception:
        pass
    return meal_log


@router.put("/{meal_log_id}", response_model=MealLogRead)
async def update_meal_log(
    meal_log_id: int,
    meal_log_update: MealLogUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Atualiza um registro de refeição"""
    db_meal_log = session.get(MealLog, meal_log_id)
    
    if not db_meal_log:
        raise HTTPException(status_code=404, detail="Registro de refeição não encontrado")
    
    if db_meal_log.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
    # Atualiza apenas os campos fornecidos
    meal_log_data = meal_log_update.dict(exclude_unset=True)
    
    for key, value in meal_log_data.items():
        setattr(db_meal_log, key, value)
    
    db_meal_log.updated_at = datetime.now()
    
    session.add(db_meal_log)
    session.commit()
    session.refresh(db_meal_log)

    try:
        logger.info(
            f"MEAL_LOG_UPDATE user_id={current_user.id} id={db_meal_log.id} "
            f"meal_time={db_meal_log.meal_time} carbs_total={db_meal_log.total_nutrients.get('carbohydrates', 0)}"
        )
    except Exception:
        pass
    
    return db_meal_log


@router.delete("/{meal_log_id}", status_code=204)
async def delete_meal_log(
    meal_log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Exclui um registro de refeição"""
    db_meal_log = session.get(MealLog, meal_log_id)
    
    if not db_meal_log:
        raise HTTPException(status_code=404, detail="Registro de refeição não encontrado")
    
    if db_meal_log.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
    session.delete(db_meal_log)
    session.commit()
    
    try:
        logger.info(
            f"MEAL_LOG_DELETE user_id={current_user.id} id={meal_log_id}"
        )
    except Exception:
        pass

    return None