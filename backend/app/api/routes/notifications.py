from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from ...models import (
    NotificationToken,
    NotificationTokenCreate,
    NotificationTokenResponse,
    PushAlarm,
    PushAlarmCreate,
    PushAlarmUpdate,
    PushAlarmResponse,
    User
)
from ...services.auth import get_current_user
from ...services.database import get_session

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/token", response_model=NotificationTokenResponse)
async def register_notification_token(
    token_data: NotificationTokenCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registra ou atualiza token de notificação do usuário (upsert por token)"""
    
    # Verificar se o token já existe
    existing_token = session.exec(
        select(NotificationToken).where(NotificationToken.token == token_data.token)
    ).first()
    
    if existing_token:
        # Atualizar token existente
        existing_token.user_id = current_user.id
        existing_token.platform = token_data.platform
        existing_token.updated_at = datetime.utcnow()
        session.add(existing_token)
        session.commit()
        session.refresh(existing_token)
        return existing_token
    else:
        # Criar novo token
        new_token = NotificationToken(
            user_id=current_user.id,
            token=token_data.token,
            platform=token_data.platform
        )
        session.add(new_token)
        session.commit()
        session.refresh(new_token)
        return new_token

@router.delete("/token")
async def remove_notification_token(
    token: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove token de notificação do usuário atual"""
    
    existing_token = session.exec(
        select(NotificationToken).where(
            NotificationToken.token == token,
            NotificationToken.user_id == current_user.id
        )
    ).first()
    
    if not existing_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token não encontrado"
        )
    
    session.delete(existing_token)
    session.commit()
    
    return {"message": "Token removido com sucesso"}

@router.get("/tokens", response_model=List[NotificationTokenResponse])
async def get_user_tokens(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Lista todos os tokens do usuário atual"""
    
    tokens = session.exec(
        select(NotificationToken).where(NotificationToken.user_id == current_user.id)
    ).all()
    
    return tokens

# Endpoints para alarmes push
@router.post("/alarms", response_model=PushAlarmResponse)
async def create_push_alarm(
    alarm_data: PushAlarmCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Cria um novo alarme push"""
    
    new_alarm = PushAlarm(
        user_id=current_user.id,
        type=alarm_data.type,
        schedule=alarm_data.schedule,
        payload_json=alarm_data.model_dump_json(),
        active=alarm_data.active
    )
    
    # Set payload properly
    new_alarm.payload = alarm_data.payload
    
    session.add(new_alarm)
    session.commit()
    session.refresh(new_alarm)
    
    return PushAlarmResponse.from_orm(new_alarm)

@router.get("/alarms", response_model=List[PushAlarmResponse])
async def get_push_alarms(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Lista todos os alarmes push do usuário"""
    
    alarms = session.exec(
        select(PushAlarm).where(PushAlarm.user_id == current_user.id)
    ).all()
    
    return [PushAlarmResponse.from_orm(alarm) for alarm in alarms]

@router.get("/alarms/{alarm_id}", response_model=PushAlarmResponse)
async def get_push_alarm(
    alarm_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obtém um alarme push específico"""
    
    alarm = session.exec(
        select(PushAlarm).where(
            PushAlarm.id == alarm_id,
            PushAlarm.user_id == current_user.id
        )
    ).first()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alarme não encontrado"
        )
    
    return PushAlarmResponse.from_orm(alarm)

@router.put("/alarms/{alarm_id}", response_model=PushAlarmResponse)
async def update_push_alarm(
    alarm_id: int,
    alarm_data: PushAlarmUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Atualiza um alarme push"""
    
    alarm = session.exec(
        select(PushAlarm).where(
            PushAlarm.id == alarm_id,
            PushAlarm.user_id == current_user.id
        )
    ).first()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alarme não encontrado"
        )
    
    # Atualizar campos
    update_data = alarm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "payload" and value is not None:
            alarm.payload = value
        elif hasattr(alarm, field) and value is not None:
            setattr(alarm, field, value)
    
    alarm.updated_at = datetime.utcnow()
    session.add(alarm)
    session.commit()
    session.refresh(alarm)
    
    return PushAlarmResponse.from_orm(alarm)

@router.delete("/alarms/{alarm_id}")
async def delete_push_alarm(
    alarm_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove um alarme push"""
    
    alarm = session.exec(
        select(PushAlarm).where(
            PushAlarm.id == alarm_id,
            PushAlarm.user_id == current_user.id
        )
    ).first()
    
    if not alarm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alarme não encontrado"
        )
    
    session.delete(alarm)
    session.commit()
    
    return {"message": "Alarme removido com sucesso"}