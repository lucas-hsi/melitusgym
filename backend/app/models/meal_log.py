from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, JSON, Column


class MealLogItem(SQLModel, table=False):
    """Item individual de uma refeição"""
    id: str
    name: str
    source: str
    grams: float
    nutrients: Dict[str, Any] = Field(sa_column=Column(JSON))


class MealLog(SQLModel, table=True):
    """Registro de refeição"""
    __tablename__ = "meal_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    meal_time: str = Field(index=True)
    meal_date: datetime = Field(index=True)
    items: List[Dict[str, Any]] = Field(sa_column=Column(JSON))
    total_nutrients: Dict[str, Any] = Field(sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None)
    # Novos campos clínicos/persistência
    carbohydrates_total: Optional[float] = Field(default=None, description="Carboidratos totais do prato (g)")
    glucose_value: Optional[float] = Field(default=None, description="Valor de glicemia no momento (mg/dL)")
    glucose_measured: bool = Field(default=False, description="Se a glicemia foi aferida (sim/não)")
    glucose_measure_timing: Optional[str] = Field(default=None, description="Momento da aferição (antes/depois)")
    insulin_recommended_units: Optional[float] = Field(default=None, description="Dose de insulina recomendada (unidades)")
    insulin_applied_units: Optional[float] = Field(default=None, description="Dose de insulina aplicada (unidades)")
    recorded_at: datetime = Field(default_factory=datetime.now, description="Data/hora do registro")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default=None)