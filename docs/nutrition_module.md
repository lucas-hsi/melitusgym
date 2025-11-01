# Módulo de Nutrição (Refatorado)

Este documento descreve a arquitetura e os endpoints utilizados pelo novo fluxo de nutrição:

- Fluxo: capturar imagem → análise (OCR simplificado + busca unificada) → ajuste de porções → salvar e sugerir dose de insulina.
- Aceita apenas alimentos presentes em fontes oficiais (OpenFoodFacts, USDA FDC). Se o reconhecimento não identificar o alimento, o usuário deve buscar manualmente com autocomplete e selecionar um item válido.

## Endpoints Backend

- `GET /api/nutrition/v2/search?term=<string>&page_size=<int>`
  - Busca unificada com fallback entre fontes públicas.
  - Resposta: `{ term, sources: string[], items: NutritionItem[], total_found, search_time_ms }`
  - `items[NutritionItem]` contém ao menos: `{ name, source, nutrients: { carbohydrates, energy_kcal } }` ou equivalentes normalizados.

- `POST /api/nutrition/analyze`
  - Analisa uma lista de itens com porções e calcula totais (compatível com versão anterior).
  - Corpo: `{ items: [{ name, code?, grams }], meal_time? }`
  - Retorno: `{ items, totals: { carbs_g, sodium_mg, kcal }, meal_time }`

## Cliente Frontend (apiService)

- `searchNutritionUnified(term: string, pageSize = 20)`
  - Chama `GET /nutrition/v2/search` e retorna itens normalizados.

- `analyzeFood(formData: FormData)`
  - Chama `POST /nutrition/analyze` quando desejado.

## Armazenamento Local

- `localStorage.meal_logs`: armazena um array com entradas `{ timestamp, items, totalCarbs, insulinRatio, suggestedInsulin }`.
- `localStorage.insulin_ratio`: valor numérico do fator (g por 1U), padrão `10`.

## Ajustes Futuros

- Substituir OCR por pipeline de visão (ex.: YOLO/segmentação) para reconhecimento robusto de múltiplos itens.
- Estimar porção via heurística (volume/peso) e permitir presets (ex.: colher, xícara, fatia).
- Adicionar `POST /api/nutrition/meal` para persistir no backend (se desejado), mantendo a compatibilidade com token JWT.
- Expandir fontes: Nutrition5k, TACO e Edamam, respeitando chaves e limites de uso.

## Observações

- Sem multiusuário. JWT obrigatório nas rotas protegidas.
- Mobile-first com UI simples e responsiva.
- Zero mocks: todas as buscas consultam fontes reais.