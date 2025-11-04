# Melitus Gym — Módulo de Nutrição: Tabelas e Colunas

Este documento resume as tabelas e colunas relevantes ao módulo de Nutrição/Registros de Refeição.

## Tabela: `meal_logs`
- `id` (integer, PK)
- `user_id` (varchar)
- `meal_time` (varchar) — momento da refeição (ex: café da manhã, almoço)
- `meal_date` (timestamp) — data/hora da refeição
- `items` (json) — lista de itens/ingredientes consumidos
- `total_nutrients` (json) — agregados nutricionais (ex: carbohydrates, proteins, fat)
- `notes` (text) — observações
- `carbohydrates_total` (double precision) — carboidratos totais do prato (g)
- `glucose_value` (double precision) — glicemia no momento (mg/dL)
- `glucose_measured` (boolean) — se houve aferição de glicemia
- `glucose_measure_timing` (varchar) — momento da aferição (antes/depois)
- `insulin_recommended_units` (double precision) — dose recomendada de insulina (U)
- `insulin_applied_units` (double precision) — dose aplicada de insulina (U)
- `recorded_at` (timestamp) — data/hora do registro
- `created_at` (timestamp) — criado automaticamente
- `updated_at` (timestamp, nullable) — última atualização

Observação: colunas clínicas novas são verificadas e criadas automaticamente no startup via guard de schema.

## Tabela: `taco_foods`
- `id` (integer, PK)
- `code` (varchar) — código do alimento na TACO
- `description` (varchar) — nome do alimento
- `group` (varchar, opcional) — grupo de alimentos
- Nutrientes por 100g:
  - `energy_kcal` (double precision)
  - `carbohydrates` (double precision)
  - `proteins` (double precision)
  - `fat` (double precision)
  - `fiber` (double precision)
  - `sugars` (double precision)
  - `sodium` (double precision)
  - `salt` (double precision)
- `glycemic_index` (double precision, opcional)
- `created_at` (timestamp)

## Endpoints relacionados
- `POST /meal-logs/` — cria registro de refeição com campos clínicos opcionais
- `GET /meal-logs/` — lista registros com filtros
- `GET /meal-logs/recent` — últimos N dias
- `GET /meal-logs/{id}` — registro específico
- `PUT /meal-logs/{id}` — atualização parcial
- `DELETE /meal-logs/{id}` — remoção
- `GET /health/schema` — status do schema da tabela `meal_logs`

## Persistência e Migração
- Conexão: Railway PostgreSQL via `DATABASE_URL`
- Criação inicial: `SQLModel.metadata.create_all(engine)`
- Guard de schema: verifica e adiciona colunas clínicas faltantes em `meal_logs` no startup

Esta documentação deve ser atualizada quando novas colunas ou tabelas forem adicionadas ao módulo.