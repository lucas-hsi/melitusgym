#!/usr/bin/env python3

import sys
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.database import get_session, create_db_and_tables
from app.models.user import User
from app.services.auth import AuthService
from sqlmodel import select

def create_test_user():
    """Cria um usuário de teste se não existir nenhum usuário"""
    # Criar tabelas se não existirem
    create_db_and_tables()
    
    with next(get_session()) as session:
        # Verificar usuários existentes
        users = session.exec(select(User)).all()
        print(f'Usuários encontrados: {len(users)}')
        
        if len(users) == 0:
            # Criar usuário admin
            user = User(
                nome='Administrador',
                email='admin@melitusgym.com',
                hashed_password=AuthService.get_password_hash('123456')
            )
            session.add(user)
            session.commit()
            print('✅ Usuário admin criado com sucesso!')
            print('👤 Nome: Administrador')
            print('📧 Email: admin@melitusgym.com')
            print('🔑 Senha: 123456')
        else:
            print('👥 Usuários existentes:')
            for u in users:
                print(f'- {u.nome} ({u.email})')

if __name__ == '__main__':
    create_test_user()