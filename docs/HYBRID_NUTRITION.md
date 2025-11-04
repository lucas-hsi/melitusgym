# Fluxo Híbrido de Busca Nutricional (TACO Local + TBCA Fallback)

Este documento descreve a lógica de busca de alimentos consolidada no backend (FastAPI), priorizando fontes locais e utilizando a TBCA online como fallback.

## Objetivo

- Garantir resultados rápidos e consistentes a partir do cache/DB/arquivo TACO local.
- Quando não houver resultados locais, buscar na TBCA online, normalizar e inserir no banco para reutilização futura.
- Informar a fonte na resposta (`taco_db`, `tbca_online`) e tempo de busca.

## Arquitetura

- `TACODynamicLoader` (local):
  - Fluxo cache → DB → arquivo (CSV/XLSX) com upsert.
  - Normaliza para `NutritionItem` com `nutrients_per_100g`.

- `TBCAConnector` (fallback online):
  - Scraping da lista e detalhes da TBCA.
  - Normaliza nutrientes por 100g e faz upsert no DB via `TACODynamicLoader`.

- `NutritionConnectorService`:
  - Orquestra a busca: tenta TACO; se vazio, usa TBCA.
  - Retorna itens já normalizados e fontes consultadas.

## Endpoints

- `GET /api/nutrition/v2/search`:
  - Parâmetros: `term` (min 2), `page_size` (1–50).
  - Comportamento: híbrido (TACO local → TBCA online).
  - Resposta (`SearchResponse`): `term`, `sources`, `items`, `total_found`, `search_time_ms`.

- `GET /api/nutrition/v2/taco`:
  - Busca direta na TACO local (mantido para compatibilidade).

## Normalização dos Dados

Campos principais por 100g: `energy_kcal`, `energy_kj` (se disponível ou calculado), `carbohydrates`, `proteins`, `fat`, `fiber`, `sugars` (se disponível), `sodium`.

- Fonte TACO (local): conforme mapeamento do `TACODynamicLoader`.
- Fonte TBCA (online):
  - Lista: código, nome, URL de detalhes.
  - Detalhes: tabela nutricional; valores convertidos para float e mapeados.
  - `energy_kj` é estimado de `kcal` por `kcal * 4.184` quando aplicável.

## Upsert e Cache

- A integração TBCA realiza upsert no DB usando o helper do `TACODynamicLoader`.
- Itens TBCA inseridos passam a ser retornados pelo fluxo local nas próximas buscas.

## Qualidade e Limitações

- Em caso de indisponibilidade da TBCA, o fallback retorna zero itens sem erro.
- Valores de índice glicêmico (`glycemic_index`) nem sempre estão disponíveis.
- O scraping pode sofrer com mudanças de estrutura do site; erros são tratados e logados.

## Próximos Passos

- Scheduler para atualizar periodicamente o arquivo TACO (download e ingestão).
- Cache TTL externo (Redis) para resultados frequentes.
- Expandir mapeamentos nutricionais (açúcares, sal) quando disponíveis.

## Testes

- Testes existentes de `/api/nutrition/v2/search` permanecem válidos (busca local).
- O comportamento híbrido é transparente; quando não houver resultados locais, fontes incluirão `tbca_online`.