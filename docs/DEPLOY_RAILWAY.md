# Deploy Backend na Railway (Melitus Gym)

Este guia prepara o backend FastAPI para deploy na Railway com PostgreSQL, usando a lógica dinâmica TACO (.csv/.xlsx + cache + banco).

## Pré-requisitos
- Repositório com `backend/` e o arquivo `Taco-4a-Edicao.xlsx` na raiz do projeto.
- Serviço PostgreSQL provisionado na Railway.
- Serviço para o backend (Python 3.11, build com `requirements.txt`).

## Variáveis de Ambiente (Backend)
- `USE_SQLITE=false` — força uso de PostgreSQL em produção.
- `DATABASE_URL=postgresql://postgres:[password]@[host]:5432/railway` — URL do serviço Postgres.
- `JWT_SECRET_KEY` — chave de 32+ chars para JWT.
- `JWT_ALGORITHM=HS256`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `ENVIRONMENT=production`
- `ALLOWED_ORIGINS=https://<seu-domínio-vercel>` — inclua também localhost para testes.
- `LOG_LEVEL=INFO`
- `TIMEZONE=America/Sao_Paulo`
- `TACO_FILE_PATH=./Taco-4a-Edicao.xlsx` — opcional; padrão aponta para o arquivo na raiz.

Opcional:
- `FDC_API_KEY` — futuras integrações.
- `FCM_CREDENTIALS_PATH` — se for usar FCM.

## Variáveis de Ambiente (Frontend, Vercel)
- `NEXT_PUBLIC_API_URL=https://<seu-backend-railway>/api` — aponta para o backend em produção.
- `NODE_ENV=production`
- Ajuste CORS no backend para incluir o domínio do frontend.

## Comando de Start
No serviço Backend da Railway, configure o comando de start para:

```
bash backend/run_railway.sh
```

O script:
- Define `USE_SQLITE=false` e `ENVIRONMENT=production`.
- Usa `PORT` fornecido pela Railway.
- Inicializa `uvicorn` com `app.main:app` em `0.0.0.0:$PORT`.

## Banco de Dados
- O backend cria as tabelas automaticamente no startup (`create_db_and_tables()`), incluindo `taco_foods` com unicidade em `name_pt`.
- Se desejar, rode migrações com Alembic posteriormente.

## Lógica Dinâmica TACO
- Fluxo: cache → DB → arquivo (CSV/XLSX) → upsert → cache.
- Configuração do arquivo via `TACO_FILE_PATH` (padrão: `./Taco-4a-Edicao.xlsx`).
- O upsert evita duplicatas por `name_pt`.

## Endpoints relevantes
- `GET /api/nutrition/v2/search?term=<texto>&page_size=20`
- `POST /api/nutrition/v2/ingest/taco?path=<arquivo>` — ingerir XLSX manualmente (autenticado).

## Scripts úteis
- `backend/deploy_setup.py` — verificar envs, gerar JWT, testar Postgres, gerar template Railway.
  - Ex.: `python backend/deploy_setup.py --check-env`
  - Ex.: `python backend/deploy_setup.py --test-postgres --url postgresql://...`
- `backend/migrate_db.py` — utilitários de migração/database.

## Checklist de Deploy
1. Provisionar serviço PostgreSQL (Railway) e copiar a `DATABASE_URL`.
2. Configurar envs no Backend:
   - `USE_SQLITE=false`
   - `DATABASE_URL=...`
   - `JWT_SECRET_KEY=...`
   - `ENVIRONMENT=production`
   - `ALLOWED_ORIGINS=https://<domínio-vercel>`
   - `TACO_FILE_PATH=./Taco-4a-Edicao.xlsx`
3. Confirmar que `Taco-4a-Edicao.xlsx` está no repositório raiz.
4. Definir o comando de start: `bash backend/run_railway.sh`.
5. Deploy e abrir `GET /health` para checar disponibilidade.
6. Testar `GET /api/nutrition/v2/search?term=arroz&page_size=5`.
7. Validar CORS acessando o frontend (Vercel) e usando a página de Nutrição.
8. Atualizar `NEXT_PUBLIC_API_URL` no Vercel para apontar ao backend Railway (`/api`).

## Troubleshooting
- Nenhum item encontrado na busca:
  - Verifique `TACO_FILE_PATH` e a presença do arquivo TACO no container.
  - Confirme permissões de leitura.
  - Aumente `page_size` para validar varredura.
- Erros de banco:
  - Cheque `DATABASE_URL`.
  - Confirme `USE_SQLITE=false` em produção.
- CORS bloqueado:
  - Ajuste `ALLOWED_ORIGINS` no backend para incluir o domínio do frontend.