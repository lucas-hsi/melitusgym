# Melitus Gym — Fluxo de Autenticação (Cadastro/Login)

Este documento descreve como funciona o cadastro e login de usuário, o algoritmo de hash de senha, migrações para PostgreSQL e testes de integração.

## Visão Geral

- Usuário único (sem multiusuário/roles complexas).
- Autenticação via JWT; o token é retornado no login e usado em todas as requisições autenticadas.
- O frontend usa `axios` com interceptor para enviar `Authorization: Bearer <token>`.

## Endpoints (Backend)

- `POST /api/auth/register`
  - Body: `{ nome, email, password }`
  - Respostas:
    - `201 Created`: usuário criado com `{ id, nome, email, created_at }`.
    - `409 Conflict`: email já utilizado.
    - `400 Bad Request`: validação inválida.

- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Respostas:
    - `200 OK`: `{ access_token, token_type: "bearer", user }`.
    - `401 Unauthorized`: email ou senha incorretos. Não há criação automática de usuário.

- `GET /api/auth/verify-token`
  - Header: `Authorization: Bearer <token>`
  - Resposta: `200 OK` quando token válido.

- `GET /api/auth/diagnostics`
  - Retorna métricas de tabela `users` e verificação de constraints de `email` (único e índice) para depuração em produção.

## Algoritmo de Hash de Senha

- Biblioteca: `bcrypt`.
- Geração: `AuthService.get_password_hash(password)` — sal gerado de forma segura e armazenado junto ao hash.
- Verificação: `AuthService.verify_password(plain, hashed)`.
- Observação: o `bcrypt` considera até 72 caracteres; senhas acima desse limite são truncadas pelo próprio algoritmo.

## Banco de Dados

- Desenvolvimento: SQLite local (`sqlite:///./healthtrack.db`).
- Produção: PostgreSQL (`DATABASE_URL` ou variáveis `POSTGRES_*`).
- Modo de Testes: `TESTING=true` usa SQLite em memória (`sqlite:///:memory:`).

### Migração/Verificação para PostgreSQL

Script: `backend/scripts/migrate_postgres.py`

Executa:
- Criação das tabelas via `SQLModel.metadata.create_all` (se faltarem).
- Garante `UNIQUE (email)` e índice em `users.email`.
- Verifica a existência de `alarms` e suas FKs.
- Opcional: seed de admin inicial.

Como executar:
```
USE_SQLITE=false \
python backend/scripts/migrate_postgres.py
```

Seed opcional:
```
SEED_ADMIN=true \
ADMIN_EMAIL=admin@melitusgym.app \
ADMIN_PASSWORD="<senha forte>" \
ADMIN_NAME="Admin" \
USE_SQLITE=false \
python backend/scripts/migrate_postgres.py
```

## Testes de Integração

Arquivo: `backend/tests/test_auth_flow.py`

Inclui cenários:
- Registro de novo usuário (201).
- Tentativa de registro com email duplicado (409).
- Login com credenciais válidas (200 + token).
- Validação do token em `/verify-token`.
- Login com senha inválida (401).

Para rodar localmente:
```
pytest -q backend/tests/test_auth_flow.py
```

## Erros e Mensagens

- Email já utilizado → `409 Conflict` com mensagem clara.
- Credenciais incorretas → `401 Unauthorized`.
- Falhas internas de DB → resposta JSON padronizada em `app.core.exceptions`.

## Checklist de Deploy

- Configurar `DATABASE_URL` (PostgreSQL) e `USE_SQLITE=false`.
- Rodar `backend/scripts/migrate_postgres.py`.
- Verificar `/api/health/database` e `/api/auth/diagnostics`.
- Confirmar login e persistência de usuário em produção.