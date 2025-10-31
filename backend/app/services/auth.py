from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from app.models.user import User
from app.services.database import get_session
from app.core.cache import cached, user_session_cache, invalidate_user_cache
from app.core.exceptions import AuthenticationError, DatabaseError
from app.core.logging_config import get_logger
import os

logger = get_logger("services.auth")

# Configurações de segurança
# Harmonização para Railway: aceitar tanto JWT_* quanto nomes genéricos
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM") or os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES") or os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

# Contexto para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica se a senha está correta"""
        try:
            # Trunca para 72 chars caso seja maior (limite do bcrypt)
            if len(plain_password) > 72:
                plain_password = plain_password[:72]
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Gera hash da senha"""
        try:
            # Trunca para 72 chars caso seja maior (limite do bcrypt)
            if len(password) > 72:
                password = password[:72]
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Error hashing password: {e}")
            raise AuthenticationError("Failed to hash password")
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Cria token JWT"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            
            logger.debug(f"Created access token for user: {data.get('sub')}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {e}")
            raise AuthenticationError("Failed to create access token")
    
    @staticmethod
    def verify_token(token: str) -> Optional[str]:
        """Verifica e decodifica o token JWT"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
            return email
        except JWTError as e:
            logger.debug(f"Token verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            return None
    
    @staticmethod
    @cached(ttl=300)  # Cache por 5 minutos
    def get_user_by_email(session: Session, email: str) -> Optional[User]:
        """Obtém usuário por email com cache"""
        try:
            statement = select(User).where(User.email == email)
            user = session.exec(statement).first()
            
            if user:
                logger.debug(f"User found: {email}")
            else:
                logger.debug(f"User not found: {email}")
            
            return user
        except Exception as e:
            logger.error(f"Database error getting user by email: {e}")
            raise DatabaseError("Failed to retrieve user", original_error=e)
    
    @staticmethod
    def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
        """Autentica usuário com otimizações"""
        try:
            # Buscar usuário (com cache)
            user = AuthService.get_user_by_email(session, email)
            
            if not user:
                logger.info(f"Authentication failed - user not found: {email}")
                return None
            
            # Verificar senha
            if not AuthService.verify_password(password, user.hashed_password):
                logger.info(f"Authentication failed - invalid password: {email}")
                return None
            
            logger.info(f"User authenticated successfully: {email}")
            return user
            
        except Exception as e:
            logger.error(f"Error during authentication: {e}")
            return None
    
    @staticmethod
    def create_user(session: Session, nome: str, email: str, password: str) -> User:
        """Cria novo usuário com validações"""
        try:
            # Verificar se usuário já existe
            existing_user = AuthService.get_user_by_email(session, email)
            if existing_user:
                raise AuthenticationError("User already exists")
            
            # Criar hash da senha
            hashed_password = AuthService.get_password_hash(password)
            
            # Criar usuário
            user = User(
                nome=nome,
                email=email,
                hashed_password=hashed_password
            )
            
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Invalidar cache
            invalidate_user_cache(email=email)
            
            logger.info(f"User created successfully: {email}")
            return user
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating user: {e}")
            if isinstance(e, AuthenticationError):
                raise
            raise DatabaseError("Failed to create user", original_error=e)

# Cache para tokens válidos (evitar consultas repetidas)
@cached(ttl=600)  # Cache por 10 minutos
def get_user_from_token_cached(email: str, session: Session) -> Optional[User]:
    """Obtém usuário a partir do email do token (com cache)"""
    return AuthService.get_user_by_email(session, email)

# Dependências para autenticação
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """Obtém o usuário atual a partir do token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        email = AuthService.verify_token(token)
        if email is None:
            logger.debug("Token verification failed")
            raise credentials_exception
        
        # Buscar usuário no banco (com cache)
        user = get_user_from_token_cached(email, session)
        
        if user is None:
            logger.warning(f"User not found for valid token: {email}")
            raise credentials_exception
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise credentials_exception

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Retorna o usuário atual (simplificado para modelo único)"""
    return current_user

# Modo multiusuário: funções de single-user removidas