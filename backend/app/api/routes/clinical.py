from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta

from ...models import (
    ClinicalLog, 
    ClinicalLogCreate, 
    ClinicalLogUpdate, 
    ClinicalLogResponse,
    ClinicalLogStats,
    MeasurementType,
    MeasurementPeriod,
    GlucoseReading,
    BloodPressureReading,
    InsulinDose,
    User
)
from ...services.auth import get_current_user
from ...services.database import get_session

router = APIRouter(prefix="/clinical", tags=["clinical"])

@router.post("/logs", response_model=ClinicalLogResponse)
async def create_clinical_log(
    log_data: ClinicalLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Criar um novo registro clínico"""
    
    # Se não foi especificado o momento da medição, usar agora
    if log_data.measured_at is None:
        log_data.measured_at = datetime.utcnow()
    
    clinical_log = ClinicalLog(
        user_id=current_user.id,
        **log_data.dict()
    )
    
    session.add(clinical_log)
    session.commit()
    session.refresh(clinical_log)
    
    return clinical_log

@router.get("/logs", response_model=List[ClinicalLogResponse])
async def get_clinical_logs(
    measurement_type: Optional[MeasurementType] = None,
    period: Optional[MeasurementPeriod] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Listar registros clínicos do usuário com filtros"""
    
    query = select(ClinicalLog).where(ClinicalLog.user_id == current_user.id)
    
    # Aplicar filtros
    if measurement_type:
        query = query.where(ClinicalLog.measurement_type == measurement_type)
    
    if period:
        query = query.where(ClinicalLog.period == period)
    
    if start_date:
        query = query.where(ClinicalLog.measured_at >= start_date)
    
    if end_date:
        query = query.where(ClinicalLog.measured_at <= end_date)
    
    # Ordenar por data mais recente
    query = query.order_by(ClinicalLog.measured_at.desc())
    
    # Aplicar paginação
    query = query.offset(offset).limit(limit)
    
    logs = session.exec(query).all()
    return logs

@router.get("/logs/{log_id}", response_model=ClinicalLogResponse)
async def get_clinical_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter um registro clínico específico"""
    
    log = session.get(ClinicalLog, log_id)
    
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    return log

@router.put("/logs/{log_id}", response_model=ClinicalLogResponse)
async def update_clinical_log(
    log_id: int,
    log_update: ClinicalLogUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Atualizar um registro clínico"""
    
    log = session.get(ClinicalLog, log_id)
    
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    # Atualizar apenas os campos fornecidos
    update_data = log_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)
    
    session.add(log)
    session.commit()
    session.refresh(log)
    
    return log

@router.delete("/logs/{log_id}")
async def delete_clinical_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Deletar um registro clínico"""
    
    log = session.get(ClinicalLog, log_id)
    
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    session.delete(log)
    session.commit()
    
    return {"message": "Registro deletado com sucesso"}

@router.get("/stats", response_model=List[ClinicalLogStats])
async def get_clinical_stats(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter estatísticas dos registros clínicos"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query para estatísticas por tipo de medição
    stats_query = (
        select(
            ClinicalLog.measurement_type,
            func.count(ClinicalLog.id).label("count"),
            func.avg(ClinicalLog.value).label("avg_value"),
            func.min(ClinicalLog.value).label("min_value"),
            func.max(ClinicalLog.value).label("max_value"),
            func.max(ClinicalLog.measured_at).label("last_measurement")
        )
        .where(
            and_(
                ClinicalLog.user_id == current_user.id,
                ClinicalLog.measured_at >= start_date
            )
        )
        .group_by(ClinicalLog.measurement_type)
    )
    
    results = session.exec(stats_query).all()
    
    stats = []
    for result in results:
        stats.append(ClinicalLogStats(
            measurement_type=result.measurement_type,
            count=result.count,
            avg_value=round(result.avg_value, 2),
            min_value=result.min_value,
            max_value=result.max_value,
            last_measurement=result.last_measurement
        ))
    
    return stats

# Rotas específicas para tipos de medição

@router.post("/glucose", response_model=ClinicalLogResponse)
async def create_glucose_reading(
    glucose_data: GlucoseReading,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar leitura de glicemia"""
    
    log_data = ClinicalLogCreate(
        measurement_type=MeasurementType.GLUCOSE,
        value=glucose_data.value,
        unit="mg/dL",
        period=glucose_data.period,
        notes=glucose_data.notes,
        measured_at=glucose_data.measured_at
    )
    
    return await create_clinical_log(log_data, current_user, session)

@router.post("/blood-pressure", response_model=ClinicalLogResponse)
async def create_blood_pressure_reading(
    bp_data: BloodPressureReading,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar pressão arterial"""
    
    log_data = ClinicalLogCreate(
        measurement_type=MeasurementType.BLOOD_PRESSURE,
        value=bp_data.systolic,
        secondary_value=bp_data.diastolic,
        unit="mmHg",
        notes=bp_data.notes,
        measured_at=bp_data.measured_at
    )
    
    # Se foi fornecida frequência cardíaca, criar registro separado
    clinical_log = await create_clinical_log(log_data, current_user, session)
    
    if bp_data.heart_rate:
        hr_data = ClinicalLogCreate(
            measurement_type=MeasurementType.HEART_RATE,
            value=bp_data.heart_rate,
            unit="bpm",
            measured_at=bp_data.measured_at or datetime.utcnow()
        )
        await create_clinical_log(hr_data, current_user, session)
    
    return clinical_log

@router.post("/insulin", response_model=ClinicalLogResponse)
async def create_insulin_dose(
    insulin_data: InsulinDose,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar dose de insulina"""
    
    notes = insulin_data.notes or ""
    if insulin_data.insulin_type:
        notes += f" | Tipo: {insulin_data.insulin_type}"
    if insulin_data.injection_site:
        notes += f" | Local: {insulin_data.injection_site}"
    
    log_data = ClinicalLogCreate(
        measurement_type=MeasurementType.INSULIN,
        value=insulin_data.units,
        unit="unidades",
        notes=notes.strip(" |"),
        measured_at=insulin_data.measured_at
    )
    
    return await create_clinical_log(log_data, current_user, session)

@router.get("/glucose/latest", response_model=Optional[ClinicalLogResponse])
async def get_latest_glucose(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter última leitura de glicemia"""
    
    query = (
        select(ClinicalLog)
        .where(
            and_(
                ClinicalLog.user_id == current_user.id,
                ClinicalLog.measurement_type == MeasurementType.GLUCOSE
            )
        )
        .order_by(ClinicalLog.measured_at.desc())
        .limit(1)
    )
    
    result = session.exec(query).first()
    return result

@router.get("/glucose", response_model=List[ClinicalLogResponse])
async def get_glucose_readings(
    date_from: Optional[datetime] = Query(None, description="Data inicial para filtro"),
    date_to: Optional[datetime] = Query(None, description="Data final para filtro"),
    period: Optional[MeasurementPeriod] = Query(None, description="Período da medição"),
    limit: int = Query(default=50, le=100, description="Limite de registros"),
    offset: int = Query(default=0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Listar leituras de glicemia com filtros e paginação"""
    
    query = select(ClinicalLog).where(
        and_(
            ClinicalLog.user_id == current_user.id,
            ClinicalLog.measurement_type == MeasurementType.GLUCOSE
        )
    )
    
    if date_from:
        query = query.where(ClinicalLog.measured_at >= date_from)
    if date_to:
        query = query.where(ClinicalLog.measured_at <= date_to)
    if period:
        query = query.where(ClinicalLog.period == period)
    
    query = query.order_by(ClinicalLog.measured_at.desc()).offset(offset).limit(limit)
    
    readings = session.exec(query).all()
    return readings

@router.get("/blood-pressure", response_model=List[ClinicalLogResponse])
async def get_blood_pressure_readings(
    date_from: Optional[datetime] = Query(None, description="Data inicial para filtro"),
    date_to: Optional[datetime] = Query(None, description="Data final para filtro"),
    limit: int = Query(default=50, le=100, description="Limite de registros"),
    offset: int = Query(default=0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Listar leituras de pressão arterial com filtros e paginação"""
    
    query = select(ClinicalLog).where(
        and_(
            ClinicalLog.user_id == current_user.id,
            ClinicalLog.measurement_type == MeasurementType.BLOOD_PRESSURE
        )
    )
    
    if date_from:
        query = query.where(ClinicalLog.measured_at >= date_from)
    if date_to:
        query = query.where(ClinicalLog.measured_at <= date_to)
    
    query = query.order_by(ClinicalLog.measured_at.desc()).offset(offset).limit(limit)
    
    readings = session.exec(query).all()
    return readings

@router.get("/insulin", response_model=List[ClinicalLogResponse])
async def get_insulin_readings(
    date_from: Optional[datetime] = Query(None, description="Data inicial para filtro"),
    date_to: Optional[datetime] = Query(None, description="Data final para filtro"),
    limit: int = Query(default=50, le=100, description="Limite de registros"),
    offset: int = Query(default=0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Listar doses de insulina com filtros e paginação"""
    
    query = select(ClinicalLog).where(
        and_(
            ClinicalLog.user_id == current_user.id,
            ClinicalLog.measurement_type == MeasurementType.INSULIN
        )
    )
    
    if date_from:
        query = query.where(ClinicalLog.measured_at >= date_from)
    if date_to:
        query = query.where(ClinicalLog.measured_at <= date_to)
    
    query = query.order_by(ClinicalLog.measured_at.desc()).offset(offset).limit(limit)
    
    readings = session.exec(query).all()
    return readings

@router.get("/glucose/trend")
async def get_glucose_trend(
    days: int = Query(default=7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter tendência da glicemia nos últimos dias"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = (
        select(ClinicalLog)
        .where(
            and_(
                ClinicalLog.user_id == current_user.id,
                ClinicalLog.measurement_type == MeasurementType.GLUCOSE,
                ClinicalLog.measured_at >= start_date
            )
        )
        .order_by(ClinicalLog.measured_at.asc())
    )
    
    readings = session.exec(query).all()
    
    # Agrupar por dia
    daily_data = {}
    for reading in readings:
        date_key = reading.measured_at.date().isoformat()
        if date_key not in daily_data:
            daily_data[date_key] = []
        daily_data[date_key].append({
            "value": reading.value,
            "period": reading.period,
            "time": reading.measured_at.time().isoformat()
        })
    
    return {
        "period_days": days,
        "total_readings": len(readings),
        "daily_data": daily_data
    }