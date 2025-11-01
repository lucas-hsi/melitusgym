import requests


def main():
    base_url = "http://127.0.0.1:8000"
    email = "lucas@example.com"
    password = "melitus123"

    # 1) Login
    print("1. Realizando login...")
    try:
        resp = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )
        resp.raise_for_status()
        token = resp.json()["access_token"]
        print("✅ Login ok")
    except requests.exceptions.RequestException as e:
        print(f"❌ Falha no login: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status: {e.response.status_code}")
            print(f"Resposta: {e.response.text}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2) Ingestão TACO
    print("\n2. Ingestão TACO...")
    try:
        ing = requests.post(f"{base_url}/api/nutrition/v2/ingest/taco", headers=headers)
        if ing.status_code == 404:
            print("⚠️ Arquivo TACO não encontrado, pulei ingestão.")
        else:
            ing.raise_for_status()
            data = ing.json()
            print(f"✅ Ingestão ok: created={data.get('created')}, updated={data.get('updated')}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro na ingestão: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status: {e.response.status_code}")
            print(f"Resposta: {e.response.text}")

    # 3) Busca simples
    print("\n3. Busca 'arroz' (page_size=5)...")
    try:
        s = requests.get(
            f"{base_url}/api/nutrition/v2/search",
            params={"term": "arroz", "page_size": 5},
            headers=headers
        )
        s.raise_for_status()
        res = s.json()
        print(f"✅ Busca ok: total_found={res.get('total_found')} | items={len(res.get('items', []))}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro na busca: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status: {e.response.status_code}")
            print(f"Resposta: {e.response.text}")


if __name__ == "__main__":
    main()