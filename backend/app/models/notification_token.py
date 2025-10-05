from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from .user import User

class PlatformType(str, Enum):
    WEB_IOS = "web-ios"
    WEB_ANDROID = "web-android"
    WEB_DESKTOP = "web-desktop"

class NotificationToken(SQLModel, table=True):
    __tablename__ = "notification_tokens"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(max_length=500, unique=True, index=True)
    platform: PlatformType
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relacionamento com User
    user: Optional["User"] = Relationship(back_populates="notification_tokens")

class NotificationTokenCreate(SQLModel):
    token: str = Field(max_length=500)
    platform: PlatformType

class NotificationTokenResponse(SQLModel):
    id: int
    user_id: int
    token: str
    platform: PlatformType
    created_at: datetime
    updated_at: Optional[datetime]