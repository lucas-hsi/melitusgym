# 🚀 Guia de Deploy - Melitus Gym

Este documento contém todas as instruções para fazer o deploy do Melitus Gym em produção.

## 📋 Pré-requisitos

### Contas Necessárias
- [x] GitHub (para versionamento)
- [x] Railway (frontend + backend + PostgreSQL)
- [ ] Domínio personalizado (opcional)

### Ferramentas Locais
- [x] Git
- [x] Node.js 18+
- [x] Python 3.11+
- [x] PostgreSQL (para testes locais)

## 🗄️ Configuração do Banco de Dados

### 1. PostgreSQL na Railway/Render

1. **Criar projeto na Railway:**
   ```bash
   # Instalar Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Criar projeto
   railway new melitus-gym
   
   # Adicionar PostgreSQL
   railway add postgresql
   ```

2. **Obter credenciais:**
   ```bash
   railway variables
   ```

3. **Configurar variáveis de ambiente:**
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/railway
   POSTGRES_DB=railway
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=[RAILWAY_GENERATED_PASSWORD]
   POSTGRES_HOST=[RAILWAY_GENERATED_HOST]
   POSTGRES_PORT=5432
   ```

### 2. Migração dos Dados

1. **Configurar ambiente local:**
   ```bash
   cd backend
   cp .env.example .env.production
   # Editar .env.production com as credenciais do PostgreSQL
   ```

2. **Executar migração:**
   ```bash
   python migrate_to_postgres.py
   ```

3. **Verificar migração:**
   ```bash
   # Testar login
   curl -X POST http://127.0.0.1:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@melitusgym.com", "password": "123456"}'
   ```

## 🔧 Configuração do Backend

### 1. Deploy na Render

1. **Criar conta na Render**
2. **Conectar repositório GitHub**
3. **Configurar serviço:**
   - **Build Command:** `cd backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3.11

4. **Configurar variáveis de ambiente:**
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/railway
   SECRET_KEY=[GENERATE_SECURE_KEY]
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   CORS_ORIGINS=["https://melitusgym.vercel.app"]
   LOG_LEVEL=INFO
   ```

5. **Gerar chave secura:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### 2. Testar Backend em Produção

```bash
# Health check
curl https://melitusgym-production.up.railway.app/health

# Login
curl -X POST https://melitusgym-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@melitusgym.com", "password": "123456"}'
```

## 🎨 Configuração do Frontend

### 1. Deploy na Railway (SSR)

Hospede o Next.js como aplicação SSR na Railway.

1. **Criar serviço Node (frontend) na Railway)**
   - Root Directory: `./frontend`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start`
   - Runtime: Node 18+

2. **Variáveis de ambiente (frontend)**
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://melitusgym-production.up.railway.app/api
   ```

3. **Domínio**
   - O serviço terá um domínio Railway, ex.: `https://tranquil-vitality-production-15a2.up.railway.app`
   - Use este domínio no backend (`ALLOWED_ORIGINS`) para CORS.

4. **Validação**
   - Teste `GET /` para receber 200.
   - Acesse `/login` e `/register` para confirmar que rotas SSR estão ativas.
   - Se aparecer 404, verifique se não foi usado `next export` (use `npm run build` + `npm run start`).

## 🔄 CI/CD com GitHub Actions

### 1. Configurar Secrets no GitHub

Vá em **Settings > Secrets and variables > Actions** e adicione:

```env
# Render
RENDER_API_KEY=your_render_api_key
RENDER_SERVICE_ID=your_service_id

# Railway (se usar CLI para automação)
RAILWAY_TOKEN=your_railway_token
```

### 2. Workflow Automático

O arquivo `.github/workflows/deploy.yml` já está configurado para:
- ✅ Executar testes no backend
- ✅ Fazer build do frontend
- ✅ Deploy automático no push para `main`
- ✅ Notificações de status

## 🧪 Testes de Produção

### Checklist de Verificação

- [ ] **Backend Health:** `GET /health`
- [ ] **Login:** `POST /api/auth/login`
- [ ] **Autenticação:** `GET /api/auth/me`
- [ ] **CORS:** Requisições do frontend funcionando
- [ ] **Database:** Dados migrados corretamente
- [ ] **Frontend:** Carregamento e navegação
- [ ] **PWA:** Instalação no mobile
- [ ] **SSL:** HTTPS funcionando

### Scripts de Teste

```bash
# Testar todos os endpoints críticos
./scripts/test_production.sh

# Monitorar logs
railway logs --follow  # Backend
vercel logs            # Frontend
```

## 🔒 Segurança

### Variáveis Sensíveis

- ✅ `SECRET_KEY` - Chave JWT única e segura
- ✅ `DATABASE_URL` - Credenciais do PostgreSQL
- ✅ `CORS_ORIGINS` - Apenas domínios autorizados
- ✅ SSL/HTTPS habilitado
- ✅ Logs sem informações sensíveis

### Backup

```bash
# Backup do PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql $DATABASE_URL < backup_20240101.sql
```

## 📊 Monitoramento

### Logs e Métricas

1. **Render Dashboard:** Métricas de CPU, memória, requests
2. **Vercel Analytics:** Performance do frontend
3. **PostgreSQL Logs:** Queries e conexões

### Alertas

- CPU > 80%
- Memória > 90%
- Erro 5xx > 1%
- Tempo de resposta > 2s

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro 500 no login:**
   - Verificar `DATABASE_URL`
   - Verificar migração dos dados
   - Checar logs do backend

2. **CORS Error:**
   - Verificar `CORS_ORIGINS`
   - Confirmar URL do frontend

3. **Build Error:**
   - Verificar `NEXT_PUBLIC_API_URL`
   - Checar dependências

### Comandos Úteis

```bash
# Reiniciar serviços
railway restart
vercel --prod

# Ver logs em tempo real
railway logs --follow
vercel logs --follow

# Testar conexão DB
psql $DATABASE_URL -c "SELECT version();"
```

## 📞 Suporte

- **Documentação:** [docs/](./docs/)
- **Issues:** GitHub Issues
- **Logs:** Render/Vercel Dashboard

---

**✅ Deploy Checklist:**
- [ ] PostgreSQL configurado
- [ ] Dados migrados
- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] CI/CD configurado
- [ ] Testes passando
- [ ] Monitoramento ativo