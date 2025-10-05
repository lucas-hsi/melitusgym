from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from enum import Enum

class NutritionSource(str, Enum):
    """Fontes de dados nutricionais"""
    OPENFOODFACTS = "openfoodfacts"
    USDA_FDC = "usda_fdc"

class PortionUnit(str, Enum):
    """Unidades de porção suportadas"""
    GRAMS = "g"
    KILOGRAMS = "kg"
    MILLIGRAMS = "mg"
    OUNCES = "oz"
    POUNDS = "lb"
    MILLILITERS = "ml"
    LITERS = "l"
    CUPS = "cup"
    TABLESPOONS = "tbsp"
    TEASPOONS = "tsp"

class NutrientData(BaseModel):
    """Dados nutricionais básicos"""
    energy_kcal: Optional[float] = Field(None, description="Energia em kcal")
    energy_kj: Optional[float] = Field(None, description="Energia em kJ")
    carbohydrates: Optional[float] = Field(None, description="Carboidratos em g")
    proteins: Optional[float] = Field(None, description="Proteínas em g")
    fat: Optional[float] = Field(None, description="Gorduras em g")
    fiber: Optional[float] = Field(None, description="Fibras em g")
    sugars: Optional[float] = Field(None, description="Açúcares em g")
    sodium: Optional[float] = Field(None, description="Sódio em mg")
    salt: Optional[float] = Field(None, description="Sal em g")

class ServingInfo(BaseModel):
    """Informações de porção"""
    size: Optional[Union[str, float]] = Field(None, description="Tamanho da porção")
    quantity: Optional[str] = Field(None, description="Unidade da porção")

class NutritionItem(BaseModel):
    """Item nutricional unificado"""
    id: str = Field(..., description="ID único do item")
    source: NutritionSource = Field(..., description="Fonte dos dados")
    name: str = Field(..., description="Nome do produto")
    brands: Optional[str] = Field(None, description="Marcas do produto")
    serving_size: Optional[Union[str, float]] = Field(None, description="Tamanho da porção")
    serving_quantity: Optional[str] = Field(None, description="Unidade da porção")
    nutrients_per_100g: NutrientData = Field(..., description="Nutrientes por 100g")
    nutrients_per_serving: Optional[NutrientData] = Field(None, description="Nutrientes por porção")
    nutriscore: Optional[str] = Field(None, description="Nutri-Score (A-E)")
    ecoscore: Optional[str] = Field(None, description="Eco-Score (A-E)")
    data_type: Optional[str] = Field(None, description="Tipo de dados (USDA)")

class SearchRequest(BaseModel):
    """Requisição de busca"""
    term: str = Field(..., min_length=2, max_length=100, description="Termo de busca")
    page_size: Optional[int] = Field(20, ge=1, le=50, description="Número de resultados")
    sources: Optional[List[NutritionSource]] = Field(None, description="Fontes específicas")

class SearchResponse(BaseModel):
    """Resposta de busca unificada"""
    term: str = Field(..., description="Termo pesquisado")
    sources: List[str] = Field(..., description="Fontes consultadas")
    items: List[NutritionItem] = Field(..., description="Itens encontrados")
    total_found: int = Field(..., description="Total de itens encontrados")
    search_time_ms: Optional[float] = Field(None, description="Tempo de busca em ms")

class ItemRequest(BaseModel):
    """Requisição de item específico"""
    id: str = Field(..., description="ID do item")
    source: NutritionSource = Field(..., description="Fonte dos dados")

class PortionInfo(BaseModel):
    """Informações de porção para cálculo"""
    value: float = Field(..., gt=0, description="Valor da porção")
    unit: str = Field(..., description="Unidade da porção")
    
    @validator('unit')
    def validate_unit(cls, v):
        # Lista de unidades aceitas (mais flexível que enum)
        accepted_units = [
            'g', 'gram', 'grams', 'gramas',
            'kg', 'kilogram', 'kilograms', 'quilograma', 'quilogramas',
            'mg', 'milligram', 'milligrams', 'miligramas',
            'oz', 'ounce', 'ounces',
            'lb', 'pound', 'pounds',
            'ml', 'milliliter', 'milliliters', 'mililitro', 'mililitros',
            'l', 'liter', 'liters', 'litro', 'litros',
            'cup', 'cups', 'xícara', 'xícaras',
            'tbsp', 'tablespoon', 'tablespoons', 'colher de sopa',
            'tsp', 'teaspoon', 'teaspoons', 'colher de chá'
        ]
        
        if v.lower().strip() not in accepted_units:
            raise ValueError(f'Unidade não suportada: {v}')
        return v.lower().strip()

class CalculationRequest(BaseModel):
    """Requisição de cálculo nutricional"""
    nutrients_base: Dict[str, Optional[float]] = Field(..., description="Nutrientes base")
    portion_value: float = Field(..., gt=0, description="Valor da porção")
    portion_unit: str = Field(..., description="Unidade da porção")
    base_unit: Optional[str] = Field("100g", description="Unidade base dos nutrientes")
    
    @validator('portion_unit')
    def validate_portion_unit(cls, v):
        return PortionInfo(value=1, unit=v).unit  # Reutiliza validação

class CalculationResult(BaseModel):
    """Resultado do cálculo nutricional"""
    nutrients: Dict[str, Optional[float]] = Field(..., description="Nutrientes calculados")
    portion: PortionInfo = Field(..., description="Porção calculada")
    base_reference: str = Field(..., description="Referência base")
    conversion_factor: float = Field(..., description="Fator de conversão")
    calculation_method: str = Field(..., description="Método de cálculo")
    latency_ms: float = Field(..., description="Latência do cálculo")

class ItemWithCalculationRequest(BaseModel):
    """Requisição de item com cálculo"""
    item_id: str = Field(..., description="ID do item")
    source: NutritionSource = Field(..., description="Fonte dos dados")
    portion_value: float = Field(..., gt=0, description="Valor da porção")
    portion_unit: str = Field(..., description="Unidade da porção")
    
    @validator('portion_unit')
    def validate_portion_unit(cls, v):
        return PortionInfo(value=1, unit=v).unit

class ItemWithCalculationResponse(BaseModel):
    """Resposta de item com cálculo"""
    item: Dict[str, Any] = Field(..., description="Dados do item")
    calculation: CalculationResult = Field(..., description="Resultado do cálculo")
    data_source_method: str = Field(..., description="Método de obtenção dos dados")

class ErrorResponse(BaseModel):
    """Resposta de erro padronizada"""
    error: str = Field(..., description="Tipo do erro")
    message: str = Field(..., description="Mensagem do erro")
    details: Optional[Dict[str, Any]] = Field(None, description="Detalhes adicionais")
    timestamp: str = Field(..., description="Timestamp do erro")

class HealthCheckResponse(BaseModel):
    """Resposta de health check"""
    status: str = Field(..., description="Status do serviço")
    services: Dict[str, str] = Field(..., description="Status dos serviços externos")
    timestamp: str = Field(..., description="Timestamp da verificação")

# Modelos para compatibilidade com endpoints existentes
class LegacyFoodItem(BaseModel):
    """Modelo legado para compatibilidade"""
    name: str
    portion: float  # gramas
    calories: float
    carbohydrates: float
    proteins: float
    fats: float
    fiber: float
    sugar: float
    sodium: float
    glycemicIndex: float
    confidence: Optional[float] = None
    source: str = 'nutrition_api'

class LegacyAnalyzeItem(BaseModel):
    """Item para análise legada"""
    name: str
    code: Optional[str] = None
    grams: float

class LegacyAnalyzeRequest(BaseModel):
    """Requisição de análise legada"""
    items: List[LegacyAnalyzeItem]
    meal_time: Optional[str] = None

class LegacyNutritionTotals(BaseModel):
    """Totais nutricionais legados"""
    calories: float
    carbohydrates: float
    proteins: float
    fats: float
    fiber: float
    sugar: float
    sodium: float
    averageGlycemicIndex: float