# Melitus Gym – Integração de Nutrição (Frontend)

Este documento descreve como o frontend consome os endpoints oficiais de nutrição do backend, os formatos de requisição e resposta, orientações de erro e instruções para evolução.

## Endpoints Oficiais

- `GET /api/nutrition/v2/taco` – Busca na base local (TACO normalizada) com filtros.
- `GET /api/taco/search` – Fallback online (TBCA) quando a base local não retorna resultados suficientes.

Observação: a busca é gerenciada pelo `tacoService` e pelo componente `FoodAutocomplete` com estratégia "local primeiro" e fallback para TBCA.

## Parâmetros de Busca

- `term` (string, obrigatório): termo para busca (`min 2 caracteres`).
- `source` (string, opcional): lista separada por vírgulas. Ex.: `taco_local,taco_db`.
- `category` (string, opcional): filtra por categoria TACO.
- `limit` (number, opcional, apenas em `/api/taco/search`): padrão `20`, intervalo `1-50`.

## Exemplo de Requisição

```
GET /api/nutrition/v2/taco?term=arroz&source=taco_local
```

Fallback (se necessário):

```
GET /api/taco/search?query=banana&limit=20
```

## Formato de Resposta

Resposta TACO local (`/api/nutrition/v2/taco`):

```
{
  "term": "arroz",
  "sources": ["taco_local"],
  "items": [
    {
      "id": "taco_local_arroz_cozido",
      "source": "taco_local",
      "name": "Arroz branco, cozido",
      "category": "Cereais e derivados",
      "nutrients_per_100g": {
        "energy_kcal": 128,
        "carbohydrates": 28.1,
        "proteins": 2.5,
        "fat": 0.2,
        "fiber": 1.6
      }
    }
  ],
  "total_found": 1,
  "search_time_ms": 12
}
```

Resposta TBCA online (`/api/taco/search`):

```
{
  "query": "banana",
  "items": [
    {
      "nome": "Banana prata",
      "categoria": "Frutas",
      "kcal": 89,
      "carb": 22.8,
      "prot": 1.1,
      "lip": 0.3,
      "fibra": 2.6,
      "porcao": "1 unidade média",
      "porcao_gr": 80
    }
  ],
  "count": 1,
  "total_found": 1,
  "source": "tbca_online",
  "cached": false,
  "search_time_ms": 10,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

O `tacoService.convertTacoOnlineToTacoFood` normaliza itens TBCA para o formato `TacoFood`, sempre marcando `source: "tbca_online"`.

## Tratamento de Erros e Exibição

- Em erro ou ausência de resultados, exibir uma mensagem amigável e `source: not_found`.
- Para itens, exibir o `source`:
  - `taco_*` → "Local"
  - `tbca_online` → "Online"

O componente `FoodAutocomplete` já implementa badges e mensagens padronizadas.

## Evolução dos Endpoints

- Centralize alterações em `lib/tacoService.ts`.
- Em caso de mudança de rota ou contratos:
  - Atualize apenas os métodos: `searchTacoFoods` e `searchTacoOnline`.
  - Mantenha a normalização (`convertTacoOnlineToTacoFood`) consistente.
  - Ajuste mensagens e badges no `FoodAutocomplete` se novos `source` forem introduzidos.

## Testes

- Testes de busca e exibição são implementados com Jest + Testing Library.
- Cobrem:
  - Resultados locais com badge "Local".
  - Fallback TBCA com badge "Online".
  - Caso `not_found` com mensagem amigável.