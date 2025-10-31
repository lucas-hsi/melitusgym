from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlmodel import Session, select
from app.models.user import User, UserCreate, UserLogin, UserResponse, Token
from app.services.database import get_session
from app.services.auth import AuthService, get_current_user
from app.core.exceptions import AuthenticationError, DatabaseError, ValidationError
from app.core.logging_config import get_logger
from datetime import timedelta

logger = get_logger("api.auth")

router = APIRouter(tags=["auth"])
security = HTTPBearer()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Registra um novo usuário (multiusuário)"""
    try:
        logger.info(f"Registration attempt for email: {user_data.email}")

        # Validações básicas
        if not user_data.email or not user_data.password or not user_data.nome:
            raise ValidationError("Todos os campos são obrigatórios")

        if len(user_data.password) < 6:
            raise ValidationError("A senha deve ter pelo menos 6 caracteres")

        # Criar usuário usando o serviço
        new_user = AuthService.create_user(
            session=session,
            nome=user_data.nome,
            email=user_data.email,
            password=user_data.password
        )

        logger.info(f"User registered successfully: {new_user.email}")

        return UserResponse(
            id=new_user.id,
            nome=new_user.nome,
            email=new_user.email,
            created_at=new_user.created_at
        )

    except AuthenticationError as e:
        # Email já existente deve retornar 409
        message = str(e)
        logger.warning(f"Registration authentication error: {message}")
        if "already exists" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email já cadastrado"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    except ValidationError as e:
        logger.warning(f"Registration validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro de banco de dados"
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor"
        )

@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    session: Session = Depends(get_session)
):
    """Autentica usuário e retorna token JWT"""
    try:
        logger.info(f"Login attempt for email: {user_credentials.email}")
        
        # Validações básicas
        if not user_credentials.email or not user_credentials.password:
            raise ValidationError("Email and password are required")
        
        # Verificar se existe pelo menos um usuário no sistema
        user_count = session.exec(select(User)).first()
        
        if not user_count:
            # Se não há usuários, criar o primeiro usuário automaticamente
            logger.info("No users found, creating first user")
            user = AuthService.create_user(
                session=session,
                nome="Admin",
                email=user_credentials.email,
                password=user_credentials.password
            )
        else:
            # Autenticar usuário existente
            user = AuthService.authenticate_user(
                session, 
                user_credentials.email, 
                user_credentials.password
            )
            
            if not user:
                logger.warning(f"Authentication failed for email: {user_credentials.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        # Criar token de acesso
        access_token_expires = timedelta(minutes=30)
        access_token = AuthService.create_access_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in successfully: {user.email}")
        
        return Token(
            access_token=access_token, 
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                nome=user.nome,
                email=user.email,
                created_at=user.created_at
            )
        )
        
    except ValidationError as e:
        logger.warning(f"Login validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except AuthenticationError as e:
        logger.warning(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
    except DatabaseError as e:
        logger.error(f"Database error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Retorna informações do usuário atual"""
    try:
        logger.debug(f"Getting user info for: {current_user.email}")
        
        return UserResponse(
            id=current_user.id,
            nome=current_user.nome,
            email=current_user.email,
            created_at=current_user.created_at
        )
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout do usuário (invalidação do token deve ser feita no frontend)"""
    try:
        logger.info(f"User logged out: {current_user.email}")
        
        # Aqui poderia invalidar o cache do usuário se necessário
        # invalidate_user_cache(email=current_user.email)
        
        return {"message": "Logout successful", "user_id": current_user.id}
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/verify-token")
async def verify_token(current_user: User = Depends(get_current_user)):
    """Verifica se o token é válido"""
    try:
        logger.debug(f"Token verified for user: {current_user.email}")
        
        return {
            "valid": True, 
            "user_id": current_user.id,
            "email": current_user.email,
            "nome": current_user.nome
        }
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )