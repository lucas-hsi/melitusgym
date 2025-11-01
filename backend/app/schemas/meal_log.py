from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MealLogItemCreate(BaseModel):
    """Item de refeição para criação"""
    id: str
    name: str
    source: str
    grams: float
    nutrients: Dict[str, Any]


class MealLogCreate(BaseModel):
    """Dados para criação de registro de refeição"""
    meal_time: str = Field(..., description="Momento da refeição (café da manhã, almoço, etc.)")
    meal_date: datetime = Field(default_factory=datetime.now, description="Data da refeição")
    items: List[MealLogItemCreate] = Field(..., description="Itens da refeição")
    total_nutrients: Dict[str, Any] = Field(..., description="Nutrientes totais da refeição")
    notes: Optional[str] = Field(None, description="Observações sobre a refeição")


class MealLogItemRead(BaseModel):
    """Item de refeição para leitura"""
    id: str
    name: str
    source: str
    grams: float
    nutrients: Dict[str, Any]


class MealLogRead(BaseModel):
    """Dados de leitura de registro de refeição"""
    id: int
    user_id: str
    meal_time: str
    meal_date: datetime
    items: List[MealLogItemRead]
    total_nutrients: Dict[str, Any]
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class MealLogUpdate(BaseModel):
    """Dados para atualização de registro de refeição"""
    meal_time: Optional[str] = None
    meal_date: Optional[datetime] = None
    items: Optional[List[MealLogItemCreate]] = None
    total_nutrients: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None