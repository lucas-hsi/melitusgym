from typing import Optional
from sqlmodel import SQLModel, Field


class TACOFood(SQLModel, table=True):
    __tablename__ = "taco_foods"

    id: Optional[int] = Field(default=None, primary_key=True)
    name_pt: str = Field(index=True, description="Nome do alimento em PT-BR", sa_column_kwargs={"unique": True})
    category_pt: Optional[str] = Field(default=None, description="Categoria alimentar PT-BR")

    # Nutrientes por 100g
    energy_kcal_100g: Optional[float] = Field(default=None, description="Energia (kcal) por 100g")
    energy_kj_100g: Optional[float] = Field(default=None, description="Energia (kJ) por 100g")
    carbohydrates_100g: Optional[float] = Field(default=None, description="Carboidratos (g) por 100g")
    proteins_100g: Optional[float] = Field(default=None, description="Proteínas (g) por 100g")
    fat_100g: Optional[float] = Field(default=None, description="Gorduras (g) por 100g")
    fiber_100g: Optional[float] = Field(default=None, description="Fibras (g) por 100g")
    sugars_100g: Optional[float] = Field(default=None, description="Açúcares (g) por 100g")
    sodium_mg_100g: Optional[float] = Field(default=None, description="Sódio (mg) por 100g")

    # Índice glicêmico (quando disponível)
    glycemic_index: Optional[float] = Field(default=None, description="Índice glicêmico")