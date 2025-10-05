import sqlite3
import os

# Caminho para o banco de dados
db_path = os.path.join(os.path.dirname(__file__), 'healthtrack.db')

def fix_enum_values():
    try:
        # Conectar ao banco
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar valores atuais
        cursor.execute("SELECT id, email, perfil FROM users")
        users = cursor.fetchall()
        
        print("Usuários antes da correção:")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Perfil: {user[2]}")
        
        # Mapear valores antigos para novos
        mapping = {
            'Gestor': 'GESTOR',
            'Vendedor': 'VENDEDOR', 
            'Anúncios': 'ANUNCIOS'
        }
        
        # Atualizar valores
        for old_value, new_value in mapping.items():
            cursor.execute(
                "UPDATE users SET perfil = ? WHERE perfil = ?",
                (new_value, old_value)
            )
            print(f"Atualizados {cursor.rowcount} registros de '{old_value}' para '{new_value}'")
        
        # Confirmar mudanças
        conn.commit()
        
        # Verificar valores após correção
        cursor.execute("SELECT id, email, perfil FROM users")
        users = cursor.fetchall()
        
        print("\nUsuários após a correção:")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Perfil: {user[2]}")
        
        conn.close()
        print("\nCorreção dos valores do enum concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro ao corrigir valores do enum: {e}")
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_enum_values()