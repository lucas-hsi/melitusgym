from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, Dict, Any, TYPE_CHECKING
from datetime import datetime
from enum import Enum
import json

if TYPE_CHECKING:
    from .user import User

class AlarmType(str, Enum):
    WATER = "water"
    POST_MEAL = "post_meal"
    GLUCOSE = "glucose"
    BP = "bp"  # Blood Pressure
    CUSTOM = "custom"

class PushAlarm(SQLModel, table=True):
    __tablename__ = "push_alarms"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: AlarmType
    schedule: str = Field(max_length=100)  # ISO datetime or cron expression
    payload_json: str = Field(max_length=1000)  # JSON string for notification payload
    active: bool = Field(default=True)
    last_fire_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relacionamento com User
    user: Optional["User"] = Relationship(back_populates="push_alarms")
    
    @property
    def payload(self) -> Dict[str, Any]:
        """Deserialize payload from JSON string"""
        try:
            return json.loads(self.payload_json)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @payload.setter
    def payload(self, value: Dict[str, Any]):
        """Serialize payload to JSON string"""
        self.payload_json = json.dumps(value)

class PushAlarmCreate(SQLModel):
    type: AlarmType
    schedule: str = Field(max_length=100)
    payload: Dict[str, Any] = Field(default_factory=dict)
    active: bool = Field(default=True)

class PushAlarmUpdate(SQLModel):
    type: Optional[AlarmType] = None
    schedule: Optional[str] = Field(default=None, max_length=100)
    payload: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None

class PushAlarmResponse(SQLModel):
    id: int
    user_id: int
    type: AlarmType
    schedule: str
    payload: Dict[str, Any]
    active: bool
    last_fire_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    @classmethod
    def from_orm(cls, obj: PushAlarm):
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            type=obj.type,
            schedule=obj.schedule,
            payload=obj.payload,  # Uses the property
            active=obj.active,
            last_fire_at=obj.last_fire_at,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )