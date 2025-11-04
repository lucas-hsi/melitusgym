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
    # Campos clínicos opcionais na criação
    carbohydrates_total: Optional[float] = Field(None, description="Carboidratos totais do prato (g)")
    glucose_value: Optional[float] = Field(None, description="Valor de glicemia no momento (mg/dL)")
    glucose_measured: Optional[bool] = Field(False, description="Se a glicemia foi aferida (sim/não)")
    glucose_measure_timing: Optional[str] = Field(None, description="Momento da aferição (antes/depois)")
    insulin_recommended_units: Optional[float] = Field(None, description="Dose de insulina recomendada (unidades)")
    insulin_applied_units: Optional[float] = Field(None, description="Dose de insulina aplicada (unidades)")
    recorded_at: Optional[datetime] = Field(None, description="Data/hora do registro")


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
    carbohydrates_total: Optional[float] = None
    glucose_value: Optional[float] = None
    glucose_measured: bool = False
    glucose_measure_timing: Optional[str] = None
    insulin_recommended_units: Optional[float] = None
    insulin_applied_units: Optional[float] = None
    recorded_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None


class MealLogUpdate(BaseModel):
    """Dados para atualização de registro de refeição"""
    meal_time: Optional[str] = None
    meal_date: Optional[datetime] = None
    items: Optional[List[MealLogItemCreate]] = None
    total_nutrients: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    carbohydrates_total: Optional[float] = None
    glucose_value: Optional[float] = None
    glucose_measured: Optional[bool] = None
    glucose_measure_timing: Optional[str] = None
    insulin_recommended_units: Optional[float] = None
    insulin_applied_units: Optional[float] = None
    recorded_at: Optional[datetime] = None