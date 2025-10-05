from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class MeasurementType(str, Enum):
    GLUCOSE = "GLUCOSE"  # mg/dL
    INSULIN = "INSULIN"  # unidades
    BLOOD_PRESSURE = "BLOOD_PRESSURE"  # mmHg
    WEIGHT = "WEIGHT"  # kg
    HEART_RATE = "HEART_RATE"  # bpm

class MeasurementPeriod(str, Enum):
    FASTING = "FASTING"  # jejum
    PRE_MEAL = "PRE_MEAL"  # pré-refeição
    POST_MEAL = "POST_MEAL"  # pós-refeição
    BEDTIME = "BEDTIME"  # antes de dormir
    RANDOM = "RANDOM"  # aleatório

class ClinicalLog(SQLModel, table=True):
    __tablename__ = "clinical_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    measurement_type: MeasurementType
    value: float  # valor principal da medição
    secondary_value: Optional[float] = None  # para pressão arterial (diastólica)
    unit: str  # unidade de medida
    period: Optional[MeasurementPeriod] = None  # período da medição
    notes: Optional[str] = None  # observações
    measured_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClinicalLogCreate(SQLModel):
    measurement_type: MeasurementType
    value: float
    secondary_value: Optional[float] = None
    unit: str
    period: Optional[MeasurementPeriod] = None
    notes: Optional[str] = None
    measured_at: Optional[datetime] = None

class ClinicalLogUpdate(SQLModel):
    value: Optional[float] = None
    secondary_value: Optional[float] = None
    unit: Optional[str] = None
    period: Optional[MeasurementPeriod] = None
    notes: Optional[str] = None
    measured_at: Optional[datetime] = None

class ClinicalLogResponse(SQLModel):
    id: int
    user_id: int
    measurement_type: MeasurementType
    value: float
    secondary_value: Optional[float]
    unit: str
    period: Optional[MeasurementPeriod]
    notes: Optional[str]
    measured_at: datetime
    created_at: datetime

class ClinicalLogStats(SQLModel):
    measurement_type: MeasurementType
    count: int
    avg_value: float
    min_value: float
    max_value: float
    last_measurement: datetime

class GlucoseReading(SQLModel):
    """Modelo específico para leituras de glicemia"""
    value: float = Field(description="Valor da glicemia em mg/dL", ge=20, le=600)
    period: MeasurementPeriod = Field(description="Período da medição")
    notes: Optional[str] = Field(None, description="Observações sobre a medição")
    measured_at: Optional[datetime] = Field(None, description="Data e hora da medição")

class BloodPressureReading(SQLModel):
    """Modelo específico para pressão arterial"""
    systolic: float = Field(description="Pressão sistólica em mmHg", ge=70, le=250)
    diastolic: float = Field(description="Pressão diastólica em mmHg", ge=40, le=150)
    heart_rate: Optional[float] = Field(None, description="Frequência cardíaca em bpm", ge=30, le=220)
    notes: Optional[str] = Field(None, description="Observações sobre a medição")
    measured_at: Optional[datetime] = Field(None, description="Data e hora da medição")

class InsulinDose(SQLModel):
    """Modelo específico para doses de insulina"""
    units: float = Field(description="Unidades de insulina aplicadas", ge=0.5, le=100)
    insulin_type: Optional[str] = Field(None, description="Tipo de insulina")
    injection_site: Optional[str] = Field(None, description="Local da aplicação")
    notes: Optional[str] = Field(None, description="Observações sobre a aplicação")
    measured_at: Optional[datetime] = Field(None, description="Data e hora da aplicação")