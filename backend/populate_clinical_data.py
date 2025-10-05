#!/usr/bin/env python3
"""
Script para popular o banco de dados com dados clínicos reais
Testa os endpoints /clinical/* com valores realistas
"""

import requests
import json
from datetime import datetime, timedelta
import random

# Configuração da API
BASE_URL = "http://127.0.0.1:8000/api"
headers = {"Content-Type": "application/json"}

def login_and_get_token():
    """Faz login e retorna o token JWT"""
    # OAuth2PasswordRequestForm espera form data, não JSON
    login_data = {
        "username": "admin@melitusgym.com",
        "password": "123456"
    }
    
    # Enviar como form data (application/x-www-form-urlencoded)
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Login realizado com sucesso")
        return token
    else:
        print(f"❌ Erro no login: {response.status_code} - {response.text}")
        return None

def create_glucose_readings(token, days=7):
    """Cria leituras de glicemia dos últimos N dias"""
    auth_headers = {**headers, "Authorization": f"Bearer {token}"}
    
    # Períodos típicos de medição (UPPERCASE conforme enum)
    periods = ["FASTING", "PRE_MEAL", "POST_MEAL", "BEDTIME"]
    
    print(f"\n📊 Criando leituras de glicemia dos últimos {days} dias...")
    
    for day in range(days):
        date = datetime.now() - timedelta(days=day)
        
        # 2-4 medições por dia
        daily_readings = random.randint(2, 4)
        
        for reading in range(daily_readings):
            period = random.choice(periods)
            
            # Valores realistas baseados no período
            if period == "FASTING":
                glucose_value = random.randint(80, 130)  # mg/dL
            elif period == "PRE_MEAL":
                glucose_value = random.randint(90, 140)
            elif period == "POST_MEAL":
                glucose_value = random.randint(120, 180)
            else:  # BEDTIME
                glucose_value = random.randint(100, 150)
            
            # Adiciona variação para simular diabetes tipo 1
            if random.random() < 0.3:  # 30% chance de valor alterado
                glucose_value += random.randint(20, 80)
            
            measured_time = date.replace(
                hour=random.randint(6, 22),
                minute=random.randint(0, 59),
                second=0,
                microsecond=0
            )
            
            glucose_data = {
                "value": glucose_value,
                "period": period,
                "measured_at": measured_time.isoformat(),
                "notes": f"Medição {period} - {glucose_value} mg/dL"
            }
            
            response = requests.post(
                f"{BASE_URL}/clinical/glucose",
                json=glucose_data,
                headers=auth_headers
            )
            
            if response.status_code == 201:
                print(f"  ✅ Glicemia: {glucose_value} mg/dL ({period}) - {measured_time.strftime('%d/%m %H:%M')}")
            else:
                print(f"  ❌ Erro ao criar glicemia: {response.status_code} - {response.text}")

def create_blood_pressure_readings(token, days=7):
    """Cria leituras de pressão arterial"""
    auth_headers = {**headers, "Authorization": f"Bearer {token}"}
    
    print(f"\n🩺 Criando leituras de pressão arterial dos últimos {days} dias...")
    
    for day in range(days):
        date = datetime.now() - timedelta(days=day)
        
        # 1-2 medições por dia
        daily_readings = random.randint(1, 2)
        
        for reading in range(daily_readings):
            # Valores realistas para hipertensão controlada
            systolic = random.randint(110, 140)  # mmHg
            diastolic = random.randint(70, 90)   # mmHg
            heart_rate = random.randint(60, 100) # bpm
            
            # Ocasionalmente valores mais altos (hipertensão)
            if random.random() < 0.2:  # 20% chance
                systolic += random.randint(10, 30)
                diastolic += random.randint(5, 15)
            
            measured_time = date.replace(
                hour=random.randint(7, 21),
                minute=random.randint(0, 59),
                second=0,
                microsecond=0
            )
            
            bp_data = {
                "systolic": systolic,
                "diastolic": diastolic,
                "heart_rate": heart_rate,
                "measured_at": measured_time.isoformat(),
                "notes": f"PA: {systolic}/{diastolic} mmHg, FC: {heart_rate} bpm"
            }
            
            response = requests.post(
                f"{BASE_URL}/clinical/blood-pressure",
                json=bp_data,
                headers=auth_headers
            )
            
            if response.status_code == 201:
                print(f"  ✅ Pressão: {systolic}/{diastolic} mmHg, FC: {heart_rate} bpm - {measured_time.strftime('%d/%m %H:%M')}")
            else:
                print(f"  ❌ Erro ao criar pressão: {response.status_code} - {response.text}")

def create_insulin_readings(token, days=7):
    """Cria registros de aplicação de insulina"""
    auth_headers = {**headers, "Authorization": f"Bearer {token}"}
    
    insulin_types = ["rapid_acting", "long_acting", "intermediate"]
    injection_sites = ["abdomen", "thigh", "arm", "buttock"]
    
    print(f"\n💉 Criando registros de insulina dos últimos {days} dias...")
    
    for day in range(days):
        date = datetime.now() - timedelta(days=day)
        
        # 3-5 aplicações por dia (típico para diabetes tipo 1)
        daily_injections = random.randint(3, 5)
        
        for injection in range(daily_injections):
            insulin_type = random.choice(insulin_types)
            
            # Unidades baseadas no tipo de insulina
            if insulin_type == "rapid_acting":
                units = random.randint(2, 12)  # Bolus para refeições
            elif insulin_type == "long_acting":
                units = random.randint(10, 25)  # Basal
            else:  # intermediate
                units = random.randint(5, 15)
            
            measured_time = date.replace(
                hour=random.randint(6, 23),
                minute=random.randint(0, 59),
                second=0,
                microsecond=0
            )
            
            insulin_data = {
                "units": units,
                "insulin_type": insulin_type,
                "injection_site": random.choice(injection_sites),
                "measured_at": measured_time.isoformat(),
                "notes": f"Insulina {insulin_type}: {units}U"
            }
            
            response = requests.post(
                f"{BASE_URL}/clinical/insulin",
                json=insulin_data,
                headers=auth_headers
            )
            
            if response.status_code == 201:
                print(f"  ✅ Insulina: {units}U ({insulin_type}) - {measured_time.strftime('%d/%m %H:%M')}")
            else:
                print(f"  ❌ Erro ao criar insulina: {response.status_code} - {response.text}")

def test_clinical_endpoints(token):
    """Testa os endpoints de consulta"""
    auth_headers = {**headers, "Authorization": f"Bearer {token}"}
    
    print("\n🔍 Testando endpoints de consulta...")
    
    # Teste glicemia
    response = requests.get(f"{BASE_URL}/clinical/glucose", headers=auth_headers)
    if response.status_code == 200:
        glucose_data = response.json()
        print(f"  ✅ Glicemia: {len(glucose_data)} registros encontrados")
    else:
        print(f"  ❌ Erro ao consultar glicemia: {response.status_code}")
    
    # Teste pressão
    response = requests.get(f"{BASE_URL}/clinical/blood-pressure", headers=auth_headers)
    if response.status_code == 200:
        bp_data = response.json()
        print(f"  ✅ Pressão: {len(bp_data)} registros encontrados")
    else:
        print(f"  ❌ Erro ao consultar pressão: {response.status_code}")
    
    # Teste insulina
    response = requests.get(f"{BASE_URL}/clinical/insulin", headers=auth_headers)
    if response.status_code == 200:
        insulin_data = response.json()
        print(f"  ✅ Insulina: {len(insulin_data)} registros encontrados")
    else:
        print(f"  ❌ Erro ao consultar insulina: {response.status_code}")
    
    # Teste logs clínicos gerais
    response = requests.get(f"{BASE_URL}/clinical/logs", headers=auth_headers)
    if response.status_code == 200:
        logs_data = response.json()
        print(f"  ✅ Logs clínicos: {len(logs_data)} registros encontrados")
    else:
        print(f"  ❌ Erro ao consultar logs: {response.status_code}")

def main():
    """Função principal"""
    print("🏥 Iniciando população do banco de dados clínicos...")
    print("📋 Este script irá criar dados realistas de:")
    print("   - Glicemia (mg/dL)")
    print("   - Pressão arterial (mmHg)")
    print("   - Aplicações de insulina (unidades)")
    print("\n" + "="*50)
    
    # Login
    token = login_and_get_token()
    if not token:
        return
    
    try:
        # Criar dados dos últimos 7 dias
        create_glucose_readings(token, days=7)
        create_blood_pressure_readings(token, days=7)
        create_insulin_readings(token, days=7)
        
        # Testar endpoints
        test_clinical_endpoints(token)
        
        print("\n" + "="*50)
        print("✅ População do banco concluída com sucesso!")
        print("🌐 Acesse http://127.0.0.1:8000/docs para ver os dados no Swagger")
        print("📱 Acesse o frontend para visualizar os gráficos")
        
    except Exception as e:
        print(f"\n❌ Erro durante a execução: {str(e)}")

if __name__ == "__main__":
    main()