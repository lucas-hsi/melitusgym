#!/usr/bin/env python3
"""
Script de migração para adicionar a coluna 'perfil' à tabela users
"""

import sqlite3
import os
from pathlib import Path

def migrate_perfil():
    """Adicionar coluna perfil à tabela users"""
    
    db_path = Path(__file__).parent / "healthtrack.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Banco de dados {db_path} não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar se a coluna perfil já existe
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'perfil' not in columns:
            print("🔄 Adicionando coluna 'perfil' à tabela users...")
            
            # Adicionar coluna perfil com valor padrão
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN perfil TEXT DEFAULT 'Gestor'
            """)
            
            # Atualizar todos os usuários existentes para ter perfil 'Gestor'
            cursor.execute("""
                UPDATE users 
                SET perfil = 'Gestor' 
                WHERE perfil IS NULL OR perfil = ''
            """)
            
            print("✅ Coluna 'perfil' adicionada com sucesso!")
            print("✅ Todos os usuários existentes foram definidos como 'Gestor'")
        else:
            print("✅ Coluna 'perfil' já existe. Nenhuma migração necessária.")
        
        # Verificar usuários após migração
        cursor.execute("SELECT id, nome, email, perfil FROM users")
        users = cursor.fetchall()
        
        print(f"\n👥 Usuários no banco ({len(users)}):")
        for user in users:
            print(f"  - ID: {user[0]}, Nome: {user[1]}, Email: {user[2]}, Perfil: {user[3]}")
        
        # Commit das mudanças
        conn.commit()
        
    except Exception as e:
        print(f"❌ Erro durante a migração: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_perfil()