from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from typing import List, Optional
from datetime import time

from ...models.alarm import (
    Alarm,
    AlarmCreate,
    AlarmUpdate,
    AlarmResponse,
    AlarmStats,
    FrequencyType
)
from ...models.user import User
from ...services.auth import get_current_user
from ...services.database import get_session
from ...services.alarm_service import AlarmService

router = APIRouter(prefix="/alarms", tags=["alarms"])

@router.post("/", response_model=AlarmResponse)
async def create_alarm(
    alarm_data: AlarmCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Criar um novo alarme de medicação
    """
    alarm = AlarmService.create_alarm(session, alarm_data, current_user.id)
    return AlarmResponse.from_orm(alarm)

@router.get("/", response_model=List[AlarmResponse])
async def get_alarms(
    active_only: bool = Query(False, description="Filtrar apenas alarmes ativos"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obter todos os alarmes do usuário
    """
    alarms = AlarmService.get_user_alarms(session, current_user.id, active_only)
    return [AlarmResponse.from_orm(alarm) for alarm in alarms]

@router.get("/stats", response_model=AlarmStats)
async def get_alarm_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obter estatísticas dos alarmes do usuário
    """
    return AlarmService.get_alarm_stats(session, current_user.id)

@router.get("/search", response_model=List[AlarmResponse])
async def search_alarms_by_medication(
    medication: str = Query(..., description="Nome do medicamento para buscar"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Buscar alarmes por nome do medicamento
    """
    alarms = AlarmService.get_alarms_by_medication(session, current_user.id, medication)
    return [AlarmResponse.from_orm(alarm) for alarm in alarms]

@router.get("/time-range", response_model=List[AlarmResponse])
async def get_alarms_by_time_range(
    start_time: str = Query(..., description="Horário inicial (HH:MM)"),
    end_time: str = Query(..., description="Horário final (HH:MM)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obter alarmes em um intervalo de tempo específico
    """
    try:
        # Converter strings para objetos time
        start_time_obj = time.fromisoformat(start_time)
        end_time_obj = time.fromisoformat(end_time)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de horário inválido. Use HH:MM (ex: 08:30)"
        )
    
    alarms = AlarmService.get_alarms_by_time_range(
        session, current_user.id, start_time_obj, end_time_obj
    )
    return [AlarmResponse.from_orm(alarm) for alarm in alarms]

@router.get("/{alarm_id}", response_model=AlarmResponse)
async def get_alarm(
    alarm_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Obter um alarme específico
    """
    alarm = AlarmService.get_alarm_by_id(session, alarm_id, current_user.id)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarme não encontrado")
    
    return AlarmResponse.from_orm(alarm)

@router.put("/{alarm_id}", response_model=AlarmResponse)
async def update_alarm(
    alarm_id: int,
    alarm_data: AlarmUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Atualizar um alarme existente
    """
    alarm = AlarmService.update_alarm(session, alarm_id, current_user.id, alarm_data)
    return AlarmResponse.from_orm(alarm)

@router.patch("/{alarm_id}/toggle", response_model=AlarmResponse)
async def toggle_alarm_status(
    alarm_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Ativar/desativar um alarme
    """
    alarm = AlarmService.toggle_alarm_status(session, alarm_id, current_user.id)
    return AlarmResponse.from_orm(alarm)

@router.delete("/{alarm_id}")
async def delete_alarm(
    alarm_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Deletar um alarme
    """
    success = AlarmService.delete_alarm(session, alarm_id, current_user.id)
    return {"message": "Alarme deletado com sucesso"}

@router.get("/frequency/types", response_model=List[str])
async def get_frequency_types():
    """
    Obter tipos de frequência disponíveis
    """
    return [freq.value for freq in FrequencyType]