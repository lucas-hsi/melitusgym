"""
Sistema de validadores centralizados para o Melitus Gym
Implementa validações reutilizáveis com logging estruturado
"""

import re
from typing import Optional, Any, List, Dict
from datetime import datetime, date
from email_validator import validate_email, EmailNotValidError
from app.core.exceptions import ValidationError
from app.core.logging_config import get_logger

logger = get_logger("core.validators")

class BaseValidator:
    """Classe base para validadores"""
    
    @staticmethod
    def validate_required(value: Any, field_name: str) -> None:
        """Valida se um campo obrigatório está presente"""
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(f"{field_name} is required")

    @staticmethod
    def validate_string_length(value: str, field_name: str, min_length: int = 0, max_length: int = None) -> None:
        """Valida o comprimento de uma string"""
        if not isinstance(value, str):
            raise ValidationError(f"{field_name} must be a string")
        
        if len(value) < min_length:
            raise ValidationError(f"{field_name} must be at least {min_length} characters long")
        
        if max_length and len(value) > max_length:
            raise ValidationError(f"{field_name} must be at most {max_length} characters long")

    @staticmethod
    def validate_numeric_range(value: float, field_name: str, min_value: float = None, max_value: float = None) -> None:
        """Valida se um valor numérico está dentro de um intervalo"""
        if not isinstance(value, (int, float)):
            raise ValidationError(f"{field_name} must be a number")
        
        if min_value is not None and value < min_value:
            raise ValidationError(f"{field_name} must be at least {min_value}")
        
        if max_value is not None and value > max_value:
            raise ValidationError(f"{field_name} must be at most {max_value}")

class UserValidator(BaseValidator):
    """Validador para dados de usuário"""
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Valida formato de email"""
        try:
            UserValidator.validate_required(email, "email")
            UserValidator.validate_string_length(email, "email", max_length=255)
            
            # Validar formato do email
            validated_email = validate_email(email)
            return validated_email.email.lower()
            
        except EmailNotValidError as e:
            logger.warning(f"Invalid email format: {email}")
            raise ValidationError(f"Invalid email format: {str(e)}")
        except Exception as e:
            logger.error(f"Error validating email: {e}")
            raise ValidationError("Email validation failed")

    @staticmethod
    def validate_password(password: str) -> None:
        """Valida força da senha"""
        UserValidator.validate_required(password, "password")
        UserValidator.validate_string_length(password, "password", min_length=6, max_length=72)
        
        # Verificar se contém pelo menos uma letra e um número
        if not re.search(r'[A-Za-z]', password):
            raise ValidationError("Password must contain at least one letter")
        
        if not re.search(r'\d', password):
            raise ValidationError("Password must contain at least one number")

    @staticmethod
    def validate_name(name: str) -> str:
        """Valida nome do usuário"""
        UserValidator.validate_required(name, "name")
        UserValidator.validate_string_length(name, "name", min_length=2, max_length=100)
        
        # Remover espaços extras e capitalizar
        cleaned_name = ' '.join(name.strip().split())
        
        # Verificar se contém apenas letras, espaços e acentos
        if not re.match(r'^[A-Za-zÀ-ÿ\s]+$', cleaned_name):
            raise ValidationError("Name must contain only letters and spaces")
        
        return cleaned_name

class ClinicalValidator(BaseValidator):
    """Validador para dados clínicos"""
    
    @staticmethod
    def validate_glucose_level(glucose: float) -> None:
        """Valida nível de glicose (mg/dL)"""
        ClinicalValidator.validate_required(glucose, "glucose")
        ClinicalValidator.validate_numeric_range(glucose, "glucose", min_value=20, max_value=800)

    @staticmethod
    def validate_blood_pressure(systolic: float, diastolic: float) -> None:
        """Valida pressão arterial"""
        ClinicalValidator.validate_required(systolic, "systolic pressure")
        ClinicalValidator.validate_required(diastolic, "diastolic pressure")
        
        ClinicalValidator.validate_numeric_range(systolic, "systolic pressure", min_value=50, max_value=300)
        ClinicalValidator.validate_numeric_range(diastolic, "diastolic pressure", min_value=30, max_value=200)
        
        if systolic <= diastolic:
            raise ValidationError("Systolic pressure must be higher than diastolic pressure")

    @staticmethod
    def validate_insulin_dose(dose: float) -> None:
        """Valida dose de insulina (unidades)"""
        ClinicalValidator.validate_required(dose, "insulin dose")
        ClinicalValidator.validate_numeric_range(dose, "insulin dose", min_value=0.1, max_value=200)

    @staticmethod
    def validate_weight(weight: float) -> None:
        """Valida peso (kg)"""
        ClinicalValidator.validate_required(weight, "weight")
        ClinicalValidator.validate_numeric_range(weight, "weight", min_value=20, max_value=500)

    @staticmethod
    def validate_heart_rate(heart_rate: int) -> None:
        """Valida frequência cardíaca (bpm)"""
        ClinicalValidator.validate_required(heart_rate, "heart rate")
        ClinicalValidator.validate_numeric_range(heart_rate, "heart rate", min_value=30, max_value=250)

    @staticmethod
    def validate_measurement_date(measurement_date: datetime) -> None:
        """Valida data de medição"""
        ClinicalValidator.validate_required(measurement_date, "measurement date")
        
        # Não pode ser no futuro
        if measurement_date > datetime.now():
            raise ValidationError("Measurement date cannot be in the future")
        
        # Não pode ser muito antiga (mais de 10 anos)
        ten_years_ago = datetime.now().replace(year=datetime.now().year - 10)
        if measurement_date < ten_years_ago:
            raise ValidationError("Measurement date cannot be more than 10 years ago")

class PaginationValidator(BaseValidator):
    """Validador para parâmetros de paginação"""
    
    @staticmethod
    def validate_pagination(skip: int = 0, limit: int = 100) -> tuple[int, int]:
        """Valida parâmetros de paginação"""
        # Validar skip
        if skip < 0:
            raise ValidationError("Skip must be non-negative")
        
        # Validar limit
        if limit <= 0:
            raise ValidationError("Limit must be positive")
        
        if limit > 1000:
            raise ValidationError("Limit cannot exceed 1000")
        
        return skip, limit

    @staticmethod
    def validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> tuple[Optional[date], Optional[date]]:
        """Valida intervalo de datas"""
        if start_date and end_date:
            if start_date > end_date:
                raise ValidationError("Start date must be before end date")
            
            # Verificar se o intervalo não é muito grande (mais de 2 anos)
            if (end_date - start_date).days > 730:
                raise ValidationError("Date range cannot exceed 2 years")
        
        return start_date, end_date

class APIValidator(BaseValidator):
    """Validador para parâmetros de API"""
    
    @staticmethod
    def validate_enum_value(value: str, valid_values: List[str], field_name: str) -> str:
        """Valida se um valor está em uma lista de valores válidos"""
        if value not in valid_values:
            raise ValidationError(f"{field_name} must be one of: {', '.join(valid_values)}")
        return value

    @staticmethod
    def validate_uuid(uuid_string: str, field_name: str) -> str:
        """Valida formato UUID"""
        import uuid
        try:
            uuid.UUID(uuid_string)
            return uuid_string
        except ValueError:
            raise ValidationError(f"{field_name} must be a valid UUID")

def validate_clinical_log_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Valida dados completos de log clínico"""
    validated_data = {}
    
    try:
        # Validar tipo de medição
        if 'measurement_type' in data:
            validated_data['measurement_type'] = APIValidator.validate_enum_value(
                data['measurement_type'],
                ['glucose', 'blood_pressure', 'insulin', 'weight', 'heart_rate'],
                'measurement_type'
            )
        
        # Validar data de medição
        if 'measured_at' in data:
            ClinicalValidator.validate_measurement_date(data['measured_at'])
            validated_data['measured_at'] = data['measured_at']
        
        # Validar valores específicos por tipo
        measurement_type = data.get('measurement_type')
        
        if measurement_type == 'glucose' and 'glucose_value' in data:
            ClinicalValidator.validate_glucose_level(data['glucose_value'])
            validated_data['glucose_value'] = data['glucose_value']
        
        elif measurement_type == 'blood_pressure':
            if 'systolic_pressure' in data and 'diastolic_pressure' in data:
                ClinicalValidator.validate_blood_pressure(
                    data['systolic_pressure'], 
                    data['diastolic_pressure']
                )
                validated_data['systolic_pressure'] = data['systolic_pressure']
                validated_data['diastolic_pressure'] = data['diastolic_pressure']
        
        elif measurement_type == 'insulin' and 'insulin_dose' in data:
            ClinicalValidator.validate_insulin_dose(data['insulin_dose'])
            validated_data['insulin_dose'] = data['insulin_dose']
        
        elif measurement_type == 'weight' and 'weight_value' in data:
            ClinicalValidator.validate_weight(data['weight_value'])
            validated_data['weight_value'] = data['weight_value']
        
        elif measurement_type == 'heart_rate' and 'heart_rate_value' in data:
            ClinicalValidator.validate_heart_rate(data['heart_rate_value'])
            validated_data['heart_rate_value'] = data['heart_rate_value']
        
        # Validar período (se fornecido)
        if 'measurement_period' in data:
            validated_data['measurement_period'] = APIValidator.validate_enum_value(
                data['measurement_period'],
                ['fasting', 'pre_meal', 'post_meal', 'bedtime', 'random'],
                'measurement_period'
            )
        
        # Validar notas (se fornecidas)
        if 'notes' in data and data['notes']:
            BaseValidator.validate_string_length(data['notes'], 'notes', max_length=500)
            validated_data['notes'] = data['notes'].strip()
        
        logger.debug(f"Clinical log data validated successfully: {measurement_type}")
        return validated_data
        
    except Exception as e:
        logger.error(f"Clinical log validation failed: {e}")
        raise