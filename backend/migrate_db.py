#!/usr/bin/env python3
"""
Script de migração para atualizar o banco de dados
Adiciona a coluna 'nome' e remove 'username' da tabela users
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    # Caminho para o banco de dados
    db_path = Path(__file__).parent / "healthtrack.db"
    
    # Conectar ao banco
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verificar se a tabela users existe
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='users'
        """)
        
        if cursor.fetchone():
            print("Tabela 'users' encontrada. Iniciando migração...")
            
            # Verificar se a coluna 'nome' já existe
            cursor.execute("PRAGMA table_info(users)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'nome' not in columns:
                print("Adicionando coluna 'nome'...")
                
                # Criar nova tabela com a estrutura correta
                cursor.execute("""
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL DEFAULT 'Usuário',
                        email TEXT UNIQUE NOT NULL,
                        hashed_password TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Verificar se existem dados na tabela antiga
                cursor.execute("SELECT COUNT(*) FROM users")
                count = cursor.fetchone()[0]
                
                if count > 0:
                    print(f"Migrando {count} registros...")
                    
                    # Migrar dados existentes
                    if 'username' in columns:
                        # Se tem username, usar como nome
                        cursor.execute("""
                            INSERT INTO users_new (id, nome, email, hashed_password, created_at)
                            SELECT id, username, email, hashed_password, created_at
                            FROM users
                        """)
                    else:
                        # Se não tem username, usar email como nome temporário
                        cursor.execute("""
                            INSERT INTO users_new (id, nome, email, hashed_password, created_at)
                            SELECT id, email, email, hashed_password, created_at
                            FROM users
                        """)
                
                # Remover tabela antiga e renomear nova
                cursor.execute("DROP TABLE users")
                cursor.execute("ALTER TABLE users_new RENAME TO users")
                
                print("Migração concluída com sucesso!")
            else:
                print("Coluna 'nome' já existe. Nenhuma migração necessária.")
        else:
            print("Tabela 'users' não encontrada. Criando nova tabela...")
            
            # Criar tabela do zero
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            print("Tabela 'users' criada com sucesso!")
        
        # Commit das mudanças
        conn.commit()
        
    except Exception as e:
        print(f"Erro durante a migração: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()