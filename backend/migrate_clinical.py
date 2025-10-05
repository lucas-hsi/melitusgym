#!/usr/bin/env python3
"""
Script de migração para adicionar a tabela clinical_logs
"""

import sqlite3
from datetime import datetime
import os
import sys

# Adicionar o diretório do projeto ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.clinical_log import MeasurementType, MeasurementPeriod

def migrate_clinical_logs():
    """Criar tabela clinical_logs se não existir"""
    
    db_path = "healthtrack.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Banco de dados {db_path} não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar se a tabela já existe
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='clinical_logs'
        """)
        
        if cursor.fetchone():
            print("✅ Tabela clinical_logs já existe")
            conn.close()
            return True
        
        print("🔄 Criando tabela clinical_logs...")
        
        # Criar tabela clinical_logs
        cursor.execute("""
            CREATE TABLE clinical_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                measurement_type TEXT NOT NULL,
                value REAL NOT NULL,
                secondary_value REAL,
                unit TEXT NOT NULL,
                period TEXT,
                notes TEXT,
                measured_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Criar índices para melhor performance
        cursor.execute("""
            CREATE INDEX idx_clinical_logs_user_id ON clinical_logs(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_clinical_logs_type ON clinical_logs(measurement_type)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_clinical_logs_measured_at ON clinical_logs(measured_at)
        """)
        
        # Inserir alguns dados de exemplo (opcional)
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_result = cursor.fetchone()
        
        if user_result:
            user_id = user_result[0]
            now = datetime.utcnow().isoformat()
            
            # Dados de exemplo
            sample_data = [
                (user_id, 'glucose', 120.0, None, 'mg/dL', 'fasting', 'Glicemia em jejum', now, now),
                (user_id, 'glucose', 180.0, None, 'mg/dL', 'post_meal', 'Pós-almoço', now, now),
                (user_id, 'blood_pressure', 130.0, 85.0, 'mmHg', None, 'Pressão arterial matinal', now, now),
                (user_id, 'insulin', 10.0, None, 'unidades', 'pre_meal', 'Insulina rápida antes do almoço', now, now),
            ]
            
            cursor.executemany("""
                INSERT INTO clinical_logs 
                (user_id, measurement_type, value, secondary_value, unit, period, notes, measured_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sample_data)
            
            print(f"✅ Inseridos {len(sample_data)} registros de exemplo")
        
        conn.commit()
        conn.close()
        
        print("✅ Migração concluída com sucesso!")
        print("📊 Tabela clinical_logs criada com índices")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante a migração: {e}")
        if 'conn' in locals():
            conn.close()
        return False

def verify_migration():
    """Verificar se a migração foi bem-sucedida"""
    
    try:
        conn = sqlite3.connect("healthtrack.db")
        cursor = conn.cursor()
        
        # Verificar estrutura da tabela
        cursor.execute("PRAGMA table_info(clinical_logs)")
        columns = cursor.fetchall()
        
        print("\n📋 Estrutura da tabela clinical_logs:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Contar registros
        cursor.execute("SELECT COUNT(*) FROM clinical_logs")
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Total de registros: {count}")
        
        # Mostrar tipos de medição disponíveis
        cursor.execute("SELECT DISTINCT measurement_type FROM clinical_logs")
        types = cursor.fetchall()
        
        if types:
            print("\n🔬 Tipos de medição registrados:")
            for t in types:
                cursor.execute(
                    "SELECT COUNT(*) FROM clinical_logs WHERE measurement_type = ?", 
                    (t[0],)
                )
                type_count = cursor.fetchone()[0]
                print(f"  - {t[0]}: {type_count} registros")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro ao verificar migração: {e}")
        return False

if __name__ == "__main__":
    print("🏥 HealthTrack - Migração do Módulo Clínico")
    print("=" * 50)
    
    if migrate_clinical_logs():
        verify_migration()
        print("\n🎉 Sistema pronto para registros clínicos!")
    else:
        print("\n❌ Falha na migração")
        sys.exit(1)