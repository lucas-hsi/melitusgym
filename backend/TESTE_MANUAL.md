# 🧪 TESTE MANUAL DO ENDPOINT TACO

## ⚠️ IMPORTANTE
O teste automático não funcionou porque precisa do banco PostgreSQL em nuvem.

## ✅ SOLUÇÃO: Teste Manual com Servidor Rodando

### 1️⃣ Inicie o servidor FastAPI

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Aguarde ver:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 2️⃣ Em OUTRO terminal, teste o endpoint

#### Opção A: Com curl (se tiver instalado)
```powershell
curl "http://localhost:8000/api/taco/search?query=arroz&limit=5"
```

#### Opção B: Com PowerShell (SEMPRE FUNCIONA)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/taco/search?query=arroz&limit=5" | ConvertTo-Json -Depth 10
```

#### Opção C: No navegador
Abra: `http://localhost:8000/api/taco/search?query=arroz&limit=5`

#### Opção D: Swagger UI (MAIS FÁCIL)
Abra: `http://localhost:8000/docs`
- Encontre o endpoint `/api/taco/search`
- Clique em "Try it out"
- Digite "arroz" no campo `query`
- Clique em "Execute"

### 3️⃣ Resultado esperado

```json
{
  "query": "arroz",
  "items": [
    {
      "nome": "Arroz branco cozido",
      "categoria": "Cereais",
      "kcal": 130.0,
      "carb": 28.1,
      "prot": 2.5,
      "lip": 0.2,
      "fibra": 0.4,
      "porcao": "100g",
      "porcao_gr": 100.0
    }
  ],
  "count": 1,
  "total_found": 5,
  "source": "taco_local",
  "search_time_ms": 45.23,
  "timestamp": "2024-11-03T19:35:00"
}
```

### 4️⃣ Testes de validação

**Teste 1: Query curta (deve falhar)**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/taco/search?query=a"
```
Esperado: Erro 400

**Teste 2: Limit inválido (deve falhar)**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/taco/search?query=arroz&limit=100"
```
Esperado: Erro 400

**Teste 3: Sem query (deve falhar)**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/taco/search"
```
Esperado: Erro 422

### 5️⃣ Teste Frontend

Com o backend rodando:

```powershell
cd frontend
npm run dev
```

Acesse: `http://localhost:3000/nutricao`

Digite "arroz" no campo de busca e veja os resultados!

---

## ✅ SE FUNCIONAR

Você verá JSON com alimentos → **Tudo funcionando! 🎉**

Próximo passo: Fazer o PR

```bash
git push origin feature/webscraping-taco
```
