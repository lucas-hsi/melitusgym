from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func, and_, or_
from typing import Optional, List
from datetime import datetime, date, timedelta
from app.models.clinical_log import (
    ClinicalLog, 
    ClinicalLogCreate, 
    ClinicalLogUpdate, 
    ClinicalLogResponse,
    ClinicalLogStats,
    MeasurementType,
    MeasurementPeriod
)
# Modelos específicos removidos - usando ClinicalLog genérico
from app.models.user import User
from app.services.database import get_session
from app.services.auth import get_current_user
from app.core.validators import (
    validate_clinical_log_data, 
    PaginationValidator, 
    ClinicalValidator,
    APIValidator
)
from app.core.exceptions import ValidationError, DatabaseError
from app.core.logging_config import get_logger
from app.core.cache import cached

logger = get_logger("api.clinical")

router = APIRouter(prefix="/clinical", tags=["clinical"])

@router.post("/logs", response_model=ClinicalLogResponse)
async def create_clinical_log(
    log_data: ClinicalLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Criar um novo registro clínico"""
    try:
        logger.debug(f"Creating clinical log for user {current_user.id}")
        
        # Validação centralizada dos dados clínicos
        validation_result = validate_clinical_log_data(log_data.model_dump())
        if not validation_result.is_valid:
            logger.warning(f"Validation failed: {validation_result.errors}")
            raise ValidationError(f"Dados inválidos: {', '.join(validation_result.errors)}")
        
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
        
        logger.info(f"Clinical log created successfully for user {current_user.id}, type: {log_data.measurement_type}")
        return clinical_log
        
    except ValidationError:
        session.rollback()
        raise
    except Exception as e:
        logger.error(f"Database error creating clinical log: {str(e)}")
        session.rollback()
        raise DatabaseError("Erro ao salvar registro clínico")

@router.get("/logs", response_model=List[ClinicalLogResponse])
async def get_clinical_logs(
    measurement_type: Optional[MeasurementType] = None,
    period: Optional[MeasurementPeriod] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Listar registros clínicos com filtros opcionais"""
    try:
        logger.debug(f"Fetching clinical logs for user {current_user.id}")
        
        # Validação de paginação
        pagination_validator = PaginationValidator()
        if not pagination_validator.validate_skip(skip):
            raise ValidationError("Parâmetro 'skip' inválido")
        if not pagination_validator.validate_limit(limit):
            raise ValidationError("Parâmetro 'limit' inválido")
        
        # Validação de período de datas
        if start_date and end_date:
            if not pagination_validator.validate_date_range(start_date, end_date):
                raise ValidationError("Período de datas inválido")
        
        # Validação de enum
        if measurement_type:
            api_validator = APIValidator()
            if not api_validator.validate_enum_value(measurement_type, MeasurementType):
                raise ValidationError("Tipo de medição inválido")
        
        # Construir query base com índice otimizado
        query = select(ClinicalLog).where(ClinicalLog.user_id == current_user.id)
        
        # Aplicar filtros
        if measurement_type:
            query = query.where(ClinicalLog.measurement_type == measurement_type)
        
        if period:
            # Calcular data de início baseada no período
            now = datetime.utcnow()
            if period == MeasurementPeriod.LAST_7_DAYS:
                period_start = now - timedelta(days=7)
            elif period == MeasurementPeriod.LAST_30_DAYS:
                period_start = now - timedelta(days=30)
            elif period == MeasurementPeriod.LAST_90_DAYS:
                period_start = now - timedelta(days=90)
            else:
                period_start = now - timedelta(days=30)  # default
            
            query = query.where(ClinicalLog.measured_at >= period_start)
        
        if start_date:
            query = query.where(ClinicalLog.measured_at >= start_date)
        
        if end_date:
            query = query.where(ClinicalLog.measured_at <= end_date)
        
        # Ordenar por data mais recente (índice otimizado)
        query = query.order_by(ClinicalLog.measured_at.desc())
        
        # Aplicar paginação
        query = query.offset(skip).limit(limit)
        
        # Executar query
        logs = session.exec(query).all()
        
        logger.info(f"Retrieved {len(logs)} clinical logs for user {current_user.id}")
        # Garantir resposta consistente: lista vazia ao invés de erro
        return logs or []
        
    except ValidationError:
        raise
    except Exception as e:
        # Evitar 500 em ambientes com esquemas divergentes; retornar lista vazia
        logger.error(f"Database error fetching clinical logs: {str(e)}")
        return []

@router.get("/logs/{log_id}", response_model=ClinicalLogResponse)
@cached(ttl=300)  # Cache por 5 minutos
async def get_clinical_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter um registro clínico específico"""
    try:
        logger.debug(f"Fetching clinical log {log_id} for user {current_user.id}")
        
        # Validação do ID
        if log_id <= 0:
            raise ValidationError("ID do registro inválido")
        
        # Buscar o log com query otimizada
        query = select(ClinicalLog).where(
            and_(
                ClinicalLog.id == log_id,
                ClinicalLog.user_id == current_user.id
            )
        )
        log = session.exec(query).first()
        
        if not log:
            logger.warning(f"Clinical log {log_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro não encontrado"
            )
        
        logger.info(f"Retrieved clinical log {log_id} for user {current_user.id}")
        return log
        
    except ValidationError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error fetching clinical log {log_id}: {str(e)}")
        raise DatabaseError("Erro ao buscar registro clínico")

@router.put("/logs/{log_id}", response_model=ClinicalLogResponse)
async def update_clinical_log(
    log_id: int,
    log_update: ClinicalLogUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Atualizar um registro clínico"""
    try:
        logger.debug(f"Updating clinical log {log_id} for user {current_user.id}")
        
        # Validação do ID
        if log_id <= 0:
            raise ValidationError("ID do registro inválido")
        
        # Validação dos dados de atualização
        update_data = log_update.model_dump(exclude_unset=True)
        if update_data:  # Só validar se há dados para atualizar
            validation_result = validate_clinical_log_data(update_data)
            if not validation_result.is_valid:
                logger.warning(f"Update validation failed: {validation_result.errors}")
                raise ValidationError(f"Dados inválidos: {', '.join(validation_result.errors)}")
        
        # Buscar o log existente com query otimizada
        query = select(ClinicalLog).where(
            and_(
                ClinicalLog.id == log_id,
                ClinicalLog.user_id == current_user.id
            )
        )
        log = session.exec(query).first()
        
        if not log:
            logger.warning(f"Clinical log {log_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro não encontrado"
            )
        
        # Atualizar os campos
        for field, value in update_data.items():
            setattr(log, field, value)
        
        session.add(log)
        session.commit()
        session.refresh(log)
        
        logger.info(f"Updated clinical log {log_id} for user {current_user.id}")
        return log
        
    except ValidationError:
        session.rollback()
        raise
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        logger.error(f"Database error updating clinical log {log_id}: {str(e)}")
        session.rollback()
        raise DatabaseError("Erro ao atualizar registro clínico")

@router.delete("/logs/{log_id}")
async def delete_clinical_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Deletar um registro clínico"""
    try:
        logger.debug(f"Deleting clinical log {log_id} for user {current_user.id}")
        
        # Validação do ID
        if log_id <= 0:
            raise ValidationError("ID do registro inválido")
        
        # Buscar o log existente com query otimizada
        query = select(ClinicalLog).where(
            and_(
                ClinicalLog.id == log_id,
                ClinicalLog.user_id == current_user.id
            )
        )
        log = session.exec(query).first()
        
        if not log:
            logger.warning(f"Clinical log {log_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro não encontrado"
            )
        
        # Deletar o registro
        session.delete(log)
        session.commit()
        
        logger.info(f"Deleted clinical log {log_id} for user {current_user.id}")
        return {"message": "Registro deletado com sucesso"}
        
    except ValidationError:
        session.rollback()
        raise
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        logger.error(f"Database error deleting clinical log {log_id}: {str(e)}")
        session.rollback()
        raise DatabaseError("Erro ao deletar registro clínico")

@router.get("/stats")
@cached(ttl=600)  # Cache por 10 minutos
async def get_clinical_stats(
    measurement_type: Optional[MeasurementType] = None,
    period: Optional[MeasurementPeriod] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Obter estatísticas dos registros clínicos"""
    try:
        logger.debug(f"Calculating clinical stats for user {current_user.id}")
        
        # Validação de enum
        if measurement_type:
            api_validator = APIValidator()
            if not api_validator.validate_enum_value(measurement_type, MeasurementType):
                raise ValidationError("Tipo de medição inválido")
        
        # Calcular período de tempo
        now = datetime.utcnow()
        start_date = None
        
        if period:
            if period == MeasurementPeriod.LAST_7_DAYS:
                start_date = now - timedelta(days=7)
            elif period == MeasurementPeriod.LAST_30_DAYS:
                start_date = now - timedelta(days=30)
            elif period == MeasurementPeriod.LAST_90_DAYS:
                start_date = now - timedelta(days=90)
            else:
                start_date = now - timedelta(days=30)  # default
        
        # Query otimizada com agregações no banco
        base_conditions = [ClinicalLog.user_id == current_user.id]
        
        if measurement_type:
            base_conditions.append(ClinicalLog.measurement_type == measurement_type)
        
        if start_date:
            base_conditions.append(ClinicalLog.measured_at >= start_date)
        
        # Agregações eficientes usando SQL
        stats_query = select(
            ClinicalLog.measurement_type,
            func.count(ClinicalLog.id).label('count'),
            func.avg(ClinicalLog.value).label('avg_value'),
            func.min(ClinicalLog.value).label('min_value'),
            func.max(ClinicalLog.value).label('max_value'),
            func.max(ClinicalLog.measured_at).label('latest_date')
        ).where(
            and_(*base_conditions)
        ).group_by(ClinicalLog.measurement_type)
        
        results = session.exec(stats_query).all()
        
        # Formatar estatísticas
        stats = []
        for result in results:
            stat_data = {
                "measurement_type": result.measurement_type,
                "count": result.count,
                "avg_value": round(result.avg_value, 2) if result.avg_value else None,
                "min_value": result.min_value,
                "max_value": result.max_value,
                "latest_date": result.latest_date
            }
            stats.append(stat_data)
        
        logger.info(f"Calculated stats for {len(stats)} measurement types for user {current_user.id}")
        return stats
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Database error calculating clinical stats: {str(e)}")
        raise DatabaseError("Erro ao calcular estatísticas clínicas")

# Rotas específicas para tipos de medição

@router.post("/glucose", response_model=ClinicalLogResponse)
async def create_glucose_reading(
    glucose_data: ClinicalLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar leitura de glicemia"""
    
    # Força o tipo de medição para glicemia
    glucose_data.measurement_type = MeasurementType.GLUCOSE
    glucose_data.unit = "mg/dL"
    
    return await create_clinical_log(glucose_data, current_user, session)

@router.post("/blood-pressure", response_model=ClinicalLogResponse)
async def create_blood_pressure_reading(
    bp_data: ClinicalLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar pressão arterial"""
    
    # Força o tipo de medição para pressão arterial
    bp_data.measurement_type = MeasurementType.BLOOD_PRESSURE
    bp_data.unit = "mmHg"
    
    return await create_clinical_log(bp_data, current_user, session)

@router.post("/insulin", response_model=ClinicalLogResponse)
async def create_insulin_dose(
    insulin_data: ClinicalLogCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Registrar dose de insulina"""
    
    # Força o tipo de medição para insulina
    insulin_data.measurement_type = MeasurementType.INSULIN
    insulin_data.unit = "unidades"
    
    return await create_clinical_log(insulin_data, current_user, session)

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