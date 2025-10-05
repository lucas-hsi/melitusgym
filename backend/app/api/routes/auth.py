from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta

from ...models.user import User, UserCreate, UserResponse, UserLogin, Token
from ...services.auth import (
    AuthService,
    get_current_user,
    get_current_active_user,
    prevent_multiple_registrations
)
from ...services.database import get_session

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    session: Session = Depends(get_session)
):
    """Registra o primeiro usuário do sistema"""
    
    # Verificar se já existe um usuário no sistema
    prevent_multiple_registrations(session)
    
    # Verificar se email já existe
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    

    
    # Criar hash da senha
    hashed_password = AuthService.get_password_hash(user_data.password)
    
    # Criar usuário
    db_user = User(
        nome=user_data.nome,
        email=user_data.email,
        hashed_password=hashed_password,

    )
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    """Autentica usuário e retorna token JWT"""
    user = AuthService.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = AuthService.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Criar resposta do usuário
    user_response = UserResponse(
            id=user.id,
            nome=user.nome,
            email=user.email,
            created_at=user.created_at
        )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Retorna informações do usuário atual"""
    return current_user

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout do usuário (invalidar token no frontend)"""
    return {"message": "Successfully logged out"}

@router.get("/verify-token")
async def verify_token(
    current_user: User = Depends(get_current_active_user)
):
    """Verifica se o token é válido"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "nome": current_user.nome,
            "email": current_user.email
        }
    }