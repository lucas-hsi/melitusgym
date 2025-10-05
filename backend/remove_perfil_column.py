import sqlite3
import os

# Caminho para o banco de dados
db_path = os.path.join(os.path.dirname(__file__), 'healthtrack.db')

def remove_perfil_column():
    try:
        # Conectar ao banco
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar se a coluna perfil existe
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        
        print("Colunas atuais da tabela users:")
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
        
        # Verificar se a coluna perfil existe
        has_perfil = any(col[1] == 'perfil' for col in columns)
        
        if has_perfil:
            print("\nRemovendo coluna 'perfil'...")
            
            # SQLite não suporta DROP COLUMN diretamente
            # Precisamos recriar a tabela sem a coluna perfil
            
            # 1. Criar tabela temporária sem a coluna perfil
            cursor.execute("""
                CREATE TABLE users_temp (
                    id INTEGER PRIMARY KEY,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL
                )
            """)
            
            # 2. Copiar dados (exceto perfil)
            cursor.execute("""
                INSERT INTO users_temp (id, nome, email, hashed_password, created_at)
                SELECT id, nome, email, hashed_password, created_at
                FROM users
            """)
            
            # 3. Remover tabela original
            cursor.execute("DROP TABLE users")
            
            # 4. Renomear tabela temporária
            cursor.execute("ALTER TABLE users_temp RENAME TO users")
            
            # 5. Recriar índices
            cursor.execute("CREATE UNIQUE INDEX idx_users_email ON users(email)")
            
            print("Coluna 'perfil' removida com sucesso!")
        else:
            print("Coluna 'perfil' não encontrada na tabela users.")
        
        # Confirmar mudanças
        conn.commit()
        
        # Verificar estrutura final
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        
        print("\nEstrutura final da tabela users:")
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
        
        conn.close()
        print("\nMigração concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro na migração: {e}")
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    remove_perfil_column()