#!/usr/bin/env python3

import sys
import os
import argparse
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.database import get_session, create_db_and_tables
from app.models.user import User
from app.services.auth import AuthService
from sqlmodel import select

def create_or_update_user(email: str, password: str, nome: str = 'Lucas'):
    """Cria ou atualiza o usuário único do sistema com as credenciais fornecidas"""
    # Criar tabelas se não existirem
    create_db_and_tables()

    with next(get_session()) as session:
        # Verificar usuário existente (modelo single-user)
        existing_user = session.exec(select(User)).first()

        if existing_user:
            existing_user.nome = nome
            existing_user.email = email
            existing_user.hashed_password = AuthService.get_password_hash(password)
            session.add(existing_user)
            session.commit()
            session.refresh(existing_user)
            print('✅ Usuário atualizado com sucesso!')
            print(f'👤 Nome: {existing_user.nome}')
            print(f'📧 Email: {existing_user.email}')
        else:
            user = User(
                nome=nome,
                email=email,
                hashed_password=AuthService.get_password_hash(password)
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print('✅ Usuário criado com sucesso!')
            print(f'👤 Nome: {user.nome}')
            print(f'📧 Email: {user.email}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Criar ou atualizar usuário único do sistema')
    parser.add_argument('--email', type=str, help='Email do usuário')
    parser.add_argument('--password', type=str, help='Senha do usuário')
    parser.add_argument('--nome', type=str, default='Lucas', help='Nome do usuário')

    args = parser.parse_args()

    if args.email and args.password:
        create_or_update_user(args.email, args.password, args.nome)
    else:
        # Fallback: mostrar usuários existentes ou criar admin padrão
        create_or_update_user('admin@melitusgym.com', '123456', 'Administrador')