import sqlite3

def check_enum_data():
    conn = sqlite3.connect('healthtrack.db')
    cursor = conn.cursor()
    
    print("=== Verificando dados dos enums no banco ===")
    print()
    
    # Verificar measurement_type
    print("MEASUREMENT_TYPE:")
    cursor.execute('SELECT DISTINCT measurement_type FROM clinical_logs ORDER BY measurement_type')
    measurement_types = cursor.fetchall()
    for row in measurement_types:
        print(f"  - {row[0]}")
    
    print()
    
    # Verificar period
    print("PERIOD:")
    cursor.execute('SELECT DISTINCT period FROM clinical_logs WHERE period IS NOT NULL ORDER BY period')
    periods = cursor.fetchall()
    for row in periods:
        print(f"  - {row[0]}")
    
    print()
    
    # Verificar combinações
    print("COMBINAÇÕES (measurement_type | period):")
    print("-" * 40)
    cursor.execute('SELECT DISTINCT measurement_type, period FROM clinical_logs ORDER BY measurement_type, period')
    results = cursor.fetchall()
    for row in results:
        period_value = row[1] if row[1] is not None else 'NULL'
        print(f"{row[0]} | {period_value}")
    
    conn.close()

if __name__ == "__main__":
    check_enum_data()