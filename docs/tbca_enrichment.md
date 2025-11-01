# TBCA/TACO Enrichment – Mapeamento e Ingestão

Este documento descreve como enriquecer a base brasileira de alimentos (TBCA/TACO) no Melitus Gym, mapeando os dados para o modelo `TACOFood` e executando a ingestão via API.

## Objetivo
- Integrar a base TBCA/TACO como fonte primária local de nutrientes.
- Padronizar os campos nutricionais por 100g no modelo `TACOFood`.
- Habilitar busca e normalização na rota `/api/nutrition/v2` sem depender de APIs externas.

## Mapeamento de Campos (por 100g)
- `name`: nome do alimento
- `category`: categoria (ex.: Grãos, Frutas, Carnes)
- `energy_kcal`: energia (kcal)
- `carbs_g`: carboidratos (g)
- `proteins_g`: proteínas (g)
- `fat_g`: gorduras totais (g)
- `fiber_g`: fibra alimentar (g)
- `sugars_g`: açúcares (g)
- `sodium_mg`: sódio (mg)
- `glycemic_index` (opcional): índice glicêmico se disponível

Observação: todos os valores devem representar composição por 100g do alimento conforme a base original.

## Formatos Aceitos
- Excel (`.xlsx`) ou CSV (`.csv`) com cabeçalhos compatíveis com os campos acima.
- Caso os nomes das colunas divergem da nomenclatura, o ETL deve conter o mapeamento explícito.

## Fluxo de Ingestão
1. Coloque o arquivo TBCA/TACO em `backend/data/taco/` (ex.: `backend/data/taco/taco.xlsx`).
2. Chame a rota de ingestão:
   - `POST http://127.0.0.1:8000/api/nutrition/v2/ingest/taco`
   - Body JSON: `{ "file_path": "backend/data/taco/taco.xlsx" }`
3. A ingestão percorre as linhas, normaliza os campos e insere/atualiza registros na tabela `taco_food`.

## Validação
- Health: `GET /api/nutrition/v2/health` deve retornar `taco_db: healthy`.
- Busca: `GET /api/nutrition/v2/search?term=arroz&page_size=5` deve retornar itens quando a base estiver ingerida.

## Considerações de Qualidade
- Zero mocks: os dados devem vir da base TBCA/TACO real.
- Consistência: todos os campos padronizados por 100g.
- Segurança: nenhuma informação sensível deve estar nos arquivos de dados.
- Performance: ingestão deve ser idempotente e evitar duplicações.

## Próximos Passos
- Implementar `app/services/etl_taco.py` com parsing real (xlsx/csv) e upsert.
- Adicionar testes de integração cobrindo ingestão e busca.
- Documentar exemplos de arquivos com mapeamento de colunas.