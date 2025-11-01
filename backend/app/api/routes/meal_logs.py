from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.meal_log import MealLog
from ...schemas.meal_log import MealLogCreate, MealLogRead, MealLogUpdate
from ...services.database import get_session
from ...services.auth import get_current_user
from ...models.user import User

router = APIRouter(prefix="/meal-logs", tags=["Meal Logs"])


@router.post("/", response_model=MealLogRead)
async def create_meal_log(
    meal_log: MealLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Cria um novo registro de refeição"""
    db_meal_log = MealLog(
        user_id=current_user.id,
        meal_time=meal_log.meal_time,
        meal_date=meal_log.meal_date,
        items=meal_log.items,
        total_nutrients=meal_log.total_nutrients,
        notes=meal_log.notes
    )
    
    session.add(db_meal_log)
    session.commit()
    session.refresh(db_meal_log)
    
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
    query = select(MealLog).where(MealLog.user_id == current_user.id)
    
    if start_date:
        query = query.where(MealLog.meal_date >= start_date)
    
    if end_date:
        query = query.where(MealLog.meal_date <= end_date)
    
    if meal_time:
        query = query.where(MealLog.meal_time == meal_time)
    
    query = query.order_by(MealLog.meal_date.desc()).offset(offset).limit(limit)
    
    results = session.exec(query).all()
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
        MealLog.user_id == current_user.id,
        MealLog.meal_date >= start_date
    ).order_by(MealLog.meal_date.desc())
    
    results = session.exec(query).all()
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
    
    if meal_log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
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
    
    if db_meal_log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
    # Atualiza apenas os campos fornecidos
    meal_log_data = meal_log_update.dict(exclude_unset=True)
    
    for key, value in meal_log_data.items():
        setattr(db_meal_log, key, value)
    
    db_meal_log.updated_at = datetime.now()
    
    session.add(db_meal_log)
    session.commit()
    session.refresh(db_meal_log)
    
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
    
    if db_meal_log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado a este registro")
    
    session.delete(db_meal_log)
    session.commit()
    
    return None