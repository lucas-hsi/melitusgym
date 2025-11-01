# Enriquecimento TBCA para TACOFood (PostgreSQL)

Este guia explica como enriquecer a tabela `taco_food` (modelo `TACOFood`) com dados dos PDFs TBCA/TACO usando um CSV e o script `backend/scripts/enrich_tbca.py`.

## Formato do CSV

Cabeçalho mínimo recomendado (valores em branco são ignorados):
- `name_pt` — nome do alimento em PT-BR
- `ref_code` — código de referência TBCA/TACO (preferência para match)
- `glycemic_index` — índice glicêmico (float)
- `carbohydrates_100g` — carboidratos por 100g (float)
- `proteins_100g` — proteínas por 100g (float)
- `fat_100g` — gorduras por 100g (float)
- `fiber_100g` — fibras por 100g (float)
- `sugars_100g` — açúcares por 100g (float)
- `sodium_mg_100g` — sódio mg por 100g (float)
- `category_pt` — categoria (texto)
- `source_version` — versão/fonte (texto), ex: `TBCA 2024`

Exemplo de linha:
```
name_pt,ref_code,glycemic_index,carbohydrates_100g,proteins_100g,fat_100g,fiber_100g,sugars_100g,sodium_mg_100g,category_pt,source_version
Arroz branco cozido,TBCA-ARROZ-001,73,28,2.7,0.3,0.4,0.1,1,"Cereais",TBCA 2024
```

## Pré-requisitos

- `USE_SQLITE=false` no ambiente
- `DATABASE_URL=postgresql://...` apontando para seu PostgreSQL (Docker/Railway)
- Tabelas criadas (o backend cria automaticamente em startup)

## Executar Enriquecimento

Dry-run (sem gravar):
```
python backend/scripts/enrich_tbca.py --csv ./data/tbca_enrich.csv --dry-run
```

Aplicar mudanças:
```
python backend/scripts/enrich_tbca.py --csv ./data/tbca_enrich.csv
```

Match por nome (se não houver `ref_code`):
```
python backend/scripts/enrich_tbca.py --csv ./data/tbca_enrich.csv --match name
```

## Docker (PostgreSQL local)

- Ajuste `DATABASE_URL=postgresql://user:pass@127.0.0.1:5433/database` (se exposto em `docker-compose.yml`)
- Execute os comandos acima no host

## Railway (Produção)

- Copie `DATABASE_URL` do serviço PostgreSQL (Railway Dashboard)
- Adicione `USE_SQLITE=false` e `DATABASE_URL` no serviço Backend
- Rode o script localmente com essas variáveis de ambiente (usa conexão direta à nuvem)

## Validação

- API: `GET /api/nutrition/v2/health` deve retornar `taco_db: healthy`
- Busca: `GET /api/nutrition/v2/search?term=arroz&page_size=5` deve trazer itens com `glycemic_index` preenchido
- Frontend Nutrição: confirmação visual dos valores nas porções

## Observações

- O script só atualiza campos presentes e válidos em cada linha
- Preferimos `ref_code` para evitar colisões de nomes
- Em caso de necessidade, podemos adicionar suporte a inserir novos itens (upsert) — atualmente foca em enriquecimento