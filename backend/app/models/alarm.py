from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, time
from enum import Enum

if TYPE_CHECKING:
    from .user import User

class FrequencyType(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    AS_NEEDED = "AS_NEEDED"

class Alarm(SQLModel, table=True):
    __tablename__ = "alarms"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    medication_name: str = Field(max_length=200)
    dosage: str = Field(max_length=100)  # e.g., "10mg", "2 comprimidos"
    frequency: FrequencyType
    time: time  # Horário do alarme
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relacionamento com User
    user: Optional["User"] = Relationship(back_populates="alarms")

class AlarmCreate(SQLModel):
    medication_name: str = Field(max_length=200)
    dosage: str = Field(max_length=100)
    frequency: FrequencyType
    time: time
    notes: Optional[str] = Field(default=None, max_length=500)

class AlarmUpdate(SQLModel):
    medication_name: Optional[str] = Field(default=None, max_length=200)
    dosage: Optional[str] = Field(default=None, max_length=100)
    frequency: Optional[FrequencyType] = None
    time: Optional[time] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)

class AlarmResponse(SQLModel):
    id: int
    user_id: int
    medication_name: str
    dosage: str
    frequency: FrequencyType
    time: time
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

class AlarmStats(SQLModel):
    total_alarms: int
    active_alarms: int
    inactive_alarms: int
    medications_count: int
    next_alarm: Optional[AlarmResponse] = None