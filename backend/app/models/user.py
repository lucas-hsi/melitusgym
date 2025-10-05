from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, EmailStr

if TYPE_CHECKING:
    from .alarm import Alarm
    from .notification_token import NotificationToken
    from .push_alarm import PushAlarm

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relacionamentos
    alarms: List["Alarm"] = Relationship(back_populates="user")
    notification_tokens: List["NotificationToken"] = Relationship(back_populates="user")
    push_alarms: List["PushAlarm"] = Relationship(back_populates="user")

class UserCreate(SQLModel):
    nome: str
    email: EmailStr
    password: str

class UserUpdate(SQLModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(SQLModel):
    id: int
    nome: str
    email: str
    created_at: datetime

class UserLogin(SQLModel):
    email: str
    password: str

class Token(SQLModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(SQLModel):
    email: Optional[str] = None