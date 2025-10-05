from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import datetime, time, timedelta
from fastapi import HTTPException, status

from ..models.alarm import Alarm, AlarmCreate, AlarmUpdate, AlarmResponse, AlarmStats, FrequencyType
from ..models.user import User

class AlarmService:
    """Serviço para gerenciar alarmes de medicação"""
    
    @staticmethod
    def create_alarm(session: Session, alarm_data: AlarmCreate, user_id: int) -> Alarm:
        """Criar um novo alarme"""
        # Verificar se o usuário existe
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Validar horário
        if not isinstance(alarm_data.time, time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Horário inválido"
            )
        
        # Criar alarme
        alarm = Alarm(
            user_id=user_id,
            medication_name=alarm_data.medication_name.strip(),
            dosage=alarm_data.dosage.strip(),
            frequency=alarm_data.frequency,
            time=alarm_data.time,
            notes=alarm_data.notes.strip() if alarm_data.notes else None,
            created_at=datetime.utcnow()
        )
        
        session.add(alarm)
        session.commit()
        session.refresh(alarm)
        
        return alarm
    
    @staticmethod
    def get_user_alarms(session: Session, user_id: int, active_only: bool = False) -> List[Alarm]:
        """Obter alarmes do usuário"""
        query = select(Alarm).where(Alarm.user_id == user_id)
        
        if active_only:
            query = query.where(Alarm.is_active == True)
        
        query = query.order_by(Alarm.time)
        
        return session.exec(query).all()
    
    @staticmethod
    def get_alarm_by_id(session: Session, alarm_id: int, user_id: int) -> Optional[Alarm]:
        """Obter alarme específico do usuário"""
        return session.exec(
            select(Alarm).where(
                and_(Alarm.id == alarm_id, Alarm.user_id == user_id)
            )
        ).first()
    
    @staticmethod
    def update_alarm(session: Session, alarm_id: int, user_id: int, alarm_data: AlarmUpdate) -> Alarm:
        """Atualizar alarme"""
        alarm = AlarmService.get_alarm_by_id(session, alarm_id, user_id)
        
        if not alarm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alarme não encontrado"
            )
        
        # Atualizar campos fornecidos
        update_data = alarm_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "medication_name" and value:
                setattr(alarm, field, value.strip())
            elif field == "dosage" and value:
                setattr(alarm, field, value.strip())
            elif field == "notes" and value:
                setattr(alarm, field, value.strip())
            else:
                setattr(alarm, field, value)
        
        alarm.updated_at = datetime.utcnow()
        
        session.add(alarm)
        session.commit()
        session.refresh(alarm)
        
        return alarm
    
    @staticmethod
    def delete_alarm(session: Session, alarm_id: int, user_id: int) -> bool:
        """Deletar alarme"""
        alarm = AlarmService.get_alarm_by_id(session, alarm_id, user_id)
        
        if not alarm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alarme não encontrado"
            )
        
        session.delete(alarm)
        session.commit()
        
        return True
    
    @staticmethod
    def toggle_alarm_status(session: Session, alarm_id: int, user_id: int) -> Alarm:
        """Ativar/desativar alarme"""
        alarm = AlarmService.get_alarm_by_id(session, alarm_id, user_id)
        
        if not alarm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alarme não encontrado"
            )
        
        alarm.is_active = not alarm.is_active
        alarm.updated_at = datetime.utcnow()
        
        session.add(alarm)
        session.commit()
        session.refresh(alarm)
        
        return alarm
    
    @staticmethod
    def get_alarm_stats(session: Session, user_id: int) -> AlarmStats:
        """Obter estatísticas dos alarmes do usuário"""
        alarms = AlarmService.get_user_alarms(session, user_id)
        
        total_alarms = len(alarms)
        active_alarms = len([a for a in alarms if a.is_active])
        inactive_alarms = total_alarms - active_alarms
        
        # Contar medicamentos únicos
        medications = set(alarm.medication_name.lower() for alarm in alarms)
        medications_count = len(medications)
        
        # Próximo alarme (ativo mais próximo do horário atual)
        next_alarm = None
        current_time = datetime.now().time()
        
        active_alarms_list = [a for a in alarms if a.is_active]
        if active_alarms_list:
            # Encontrar o próximo alarme baseado no horário
            future_alarms = [a for a in active_alarms_list if a.time > current_time]
            if future_alarms:
                next_alarm = min(future_alarms, key=lambda x: x.time)
            else:
                # Se não há alarmes futuros hoje, pegar o primeiro de amanhã
                next_alarm = min(active_alarms_list, key=lambda x: x.time)
        
        return AlarmStats(
            total_alarms=total_alarms,
            active_alarms=active_alarms,
            inactive_alarms=inactive_alarms,
            medications_count=medications_count,
            next_alarm=AlarmResponse.from_orm(next_alarm) if next_alarm else None
        )
    
    @staticmethod
    def get_alarms_by_time_range(session: Session, user_id: int, start_time: time, end_time: time) -> List[Alarm]:
        """Obter alarmes em um intervalo de tempo específico"""
        query = select(Alarm).where(
            and_(
                Alarm.user_id == user_id,
                Alarm.is_active == True,
                Alarm.time >= start_time,
                Alarm.time <= end_time
            )
        ).order_by(Alarm.time)
        
        return session.exec(query).all()
    
    @staticmethod
    def get_alarms_by_medication(session: Session, user_id: int, medication_name: str) -> List[Alarm]:
        """Obter alarmes por nome do medicamento"""
        query = select(Alarm).where(
            and_(
                Alarm.user_id == user_id,
                Alarm.medication_name.ilike(f"%{medication_name}%")
            )
        ).order_by(Alarm.time)
        
        return session.exec(query).all()