import requests
import json

def test_clinical_logs_endpoint():
    """Testa o endpoint /api/clinical/logs após as correções dos enums"""
    
    base_url = "http://localhost:8000"
    
    print("=== Testando endpoint /api/clinical/logs ===")
    
    # 1. Fazer login para obter token válido
    print("\n1. Fazendo login...")
    login_data = {
        "username": "admin@melitusgym.com",  # OAuth2 usa 'username' não 'email'
        "password": "123456"
    }
    
    try:
        # Usar form data, não JSON
        login_response = requests.post(f"{base_url}/api/auth/login", data=login_data)
        login_response.raise_for_status()
        
        login_result = login_response.json()
        token = login_result["access_token"]
        print(f"✅ Login realizado com sucesso!")
        print(f"Token: {token[:50]}...")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro no login: {e}")
        return
    
    # 2. Testar endpoint /api/clinical/logs
    print("\n2. Testando endpoint /api/clinical/logs...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Teste básico sem parâmetros
        response = requests.get(f"{base_url}/api/clinical/logs", headers=headers)
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ Endpoint funcionando! Status: {response.status_code}")
        
        # Verificar se a resposta é uma lista ou objeto
        if isinstance(data, list):
            logs = data
            print(f"Total de logs retornados: {len(logs)}")
        else:
            logs = data.get('items', [])
            print(f"Total de logs retornados: {len(logs)}")
        
        # Mostrar alguns dados se existirem
        if logs:
            print("\n📋 Primeiros logs encontrados:")
            for i, log in enumerate(logs[:3]):
                print(f"  {i+1}. Tipo: {log.get('measurement_type')}, Período: {log.get('period')}, Data: {log.get('timestamp')}")
        else:
            print("⚠️ Nenhum log encontrado no banco.")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro no endpoint: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status: {e.response.status_code}")
            print(f"Resposta: {e.response.text}")
    
    # 3. Testar com filtros
    print("\n3. Testando com filtros...")
    
    test_params = [
        {"measurement_type": "GLUCOSE"},
        {"period": "FASTING"},
        {"measurement_type": "BLOOD_PRESSURE", "period": "PRE_MEAL"}
    ]
    
    for params in test_params:
        try:
            response = requests.get(f"{base_url}/api/clinical/logs", headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Verificar se a resposta é uma lista ou objeto
            if isinstance(data, list):
                logs = data
            else:
                logs = data.get('items', [])
            
            print(f"✅ Filtro {params}: {len(logs)} resultados")
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro com filtro {params}: {e}")
    
    print("\n=== Teste concluído ===")

if __name__ == "__main__":
    test_clinical_logs_endpoint()