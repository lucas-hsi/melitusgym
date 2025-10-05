import sqlite3

def update_measurement_period_data():
    """Atualiza os dados do MeasurementPeriod no banco para usar valores maiúsculos"""
    
    # Conectar ao banco
    conn = sqlite3.connect('healthtrack.db')
    cursor = conn.cursor()
    
    print("=== Atualizando dados do MeasurementPeriod ===")
    
    # Mapeamento de valores antigos para novos
    period_mapping = {
        'fasting': 'FASTING',
        'pre_meal': 'PRE_MEAL', 
        'post_meal': 'POST_MEAL',
        'bedtime': 'BEDTIME',
        'exercise': 'EXERCISE',
        'random': 'RANDOM'
    }
    
    # Verificar dados antes da atualização
    cursor.execute("SELECT DISTINCT period FROM clinical_logs WHERE period IS NOT NULL")
    old_periods = [row[0] for row in cursor.fetchall()]
    print(f"\nPeríodos antes da atualização: {old_periods}")
    
    # Atualizar cada valor
    total_updated = 0
    for old_value, new_value in period_mapping.items():
        cursor.execute(
            "UPDATE clinical_logs SET period = ? WHERE period = ?",
            (new_value, old_value)
        )
        updated_count = cursor.rowcount
        if updated_count > 0:
            print(f"Atualizados {updated_count} registros: '{old_value}' -> '{new_value}'")
            total_updated += updated_count
    
    # Verificar dados após a atualização
    cursor.execute("SELECT DISTINCT period FROM clinical_logs WHERE period IS NOT NULL")
    new_periods = [row[0] for row in cursor.fetchall()]
    print(f"\nPeríodos após a atualização: {new_periods}")
    
    # Confirmar as mudanças
    conn.commit()
    print(f"\nTotal de registros atualizados: {total_updated}")
    print("Atualização concluída com sucesso!")
    
    # Fechar conexão
    conn.close()

if __name__ == "__main__":
    update_measurement_period_data()