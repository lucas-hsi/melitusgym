# 🚀 Deploy do Melitus Gym com PostgreSQL

Este guia detalha como fazer o deploy do Melitus Gym usando PostgreSQL em produção.

## 📋 Pré-requisitos

- ✅ PostgreSQL configurado e funcionando
- ✅ Usuário admin criado no banco
- ✅ Todos os endpoints testados localmente
- ✅ Variáveis de ambiente configuradas

## 🗄️ Configuração do Banco de Dados

### 1. PostgreSQL Local
```bash
# Instalar PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# Criar banco e usuário
sudo -u postgres psql
CREATE DATABASE melitus_gym;
CREATE USER melitus_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE melitus_gym TO melitus_user;
\q
```

### 2. PostgreSQL em Produção (Railway)
```bash
# 1. Criar conta no Railway: https://railway.app
# 2. Criar novo projeto
# 3. Adicionar PostgreSQL service
# 4. Copiar DATABASE_URL fornecida
```

### 3. PostgreSQL em Produção (Render)
```bash
# 1. Criar conta no Render: https://render.com
# 2. Criar PostgreSQL database
# 3. Copiar connection string
```

## ⚙️ Configuração das Variáveis de Ambiente

### 1. Backend (.env)
```env
# Produção
ENVIRONMENT=production
USE_SQLITE=false
DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Segurança
JWT_SECRET_KEY=sua_chave_secreta_muito_forte_aqui
ALLOWED_ORIGINS=https://tranquil-vitality-production-15a2.up.railway.app

# APIs externas
OPENAI_API_KEY=sua_chave_openai
USDA_API_KEY=sua_chave_usda

# Firebase (notificações)
FCM_PROJECT_ID=seu_projeto_firebase
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@projeto.iam.gserviceaccount.com
```

### 2. Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://melitusgym-production.up.railway.app/api
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🚀 Deploy do Backend

### Opção 1: Railway
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Inicializar projeto
railway init

# 4. Deploy
railway up

# 5. Configurar variáveis de ambiente no dashboard
# https://railway.app/dashboard
```

### Opção 2: Render
```bash
# 1. Conectar repositório GitHub ao Render
# 2. Criar Web Service
# 3. Configurar:
#    - Build Command: pip install -r requirements.txt
#    - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
# 4. Adicionar variáveis de ambiente
```

### Opção 3: Heroku
```bash
# 1. Instalar Heroku CLI
# 2. Login
heroku login

# 3. Criar app
heroku create melitus-gym-backend

# 4. Adicionar PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# 5. Deploy
git push heroku main

# 6. Configurar variáveis
heroku config:set JWT_SECRET_KEY=sua_chave
```

## 🌐 Deploy do Frontend

### Vercel (Recomendado)
```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. No diretório frontend
cd frontend
vercel

# 3. Configurar variáveis de ambiente no dashboard
# https://vercel.com/dashboard
```

### Netlify
```bash
# 1. Build do projeto
npm run build

# 2. Deploy via Netlify CLI ou dashboard
# https://netlify.com
```

## 🔧 Configurações Específicas

### 1. CORS
Certifique-se de que o backend permite requisições do frontend:
```python
# backend/app/core/config.py
ALLOWED_ORIGINS = [
    "https://melitusgym.vercel.app",
    "https://www.melitusgym.com"
]
```

### 2. Migrações do Banco
```python
# O sistema criará as tabelas automaticamente na primeira execução
# Verifique os logs para confirmar
```

### 3. Usuário Admin
```python
# O sistema criará automaticamente o usuário admin se não existir
# Email: admin@melitusgym.com
# Senha: 123456 (ALTERE EM PRODUÇÃO!)
```

## 🧪 Testes Pós-Deploy

### 1. Teste de Conectividade
```bash
curl https://seu-backend.railway.app/health
```

### 2. Teste de Autenticação
```bash
curl -X POST https://seu-backend.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@melitusgym.com", "password": "123456"}'
```

### 3. Teste do Frontend
- Acesse https://melitusgym.vercel.app
- Faça login com admin@melitusgym.com / 123456
- Verifique se o dashboard carrega corretamente

## 🔒 Segurança em Produção

### 1. Alterar Senha Padrão
```sql
-- Conecte ao banco e execute:
UPDATE users SET hashed_password = '$2b$12$nova_senha_hash' 
WHERE email = 'admin@melitusgym.com';
```

### 2. Configurar HTTPS
- Vercel e Railway fornecem HTTPS automaticamente
- Para outros provedores, configure certificado SSL

### 3. Variáveis Sensíveis
- Nunca commite arquivos .env
- Use secrets do provedor de hospedagem
- Rotacione chaves regularmente

## 📊 Monitoramento

### 1. Logs
```bash
# Railway
railway logs

# Render
# Acesse dashboard > Logs

# Heroku
heroku logs --tail
```

### 2. Métricas
- Configure Sentry para monitoramento de erros
- Use ferramentas do provedor para métricas de performance

### 3. Backup
```bash
# Backup automático do PostgreSQL
# Railway e Render fazem backup automático
# Para outros provedores, configure pg_dump
```

## 🚨 Troubleshooting

### Erro de Conexão com Banco
```bash
# Verifique DATABASE_URL
echo $DATABASE_URL

# Teste conexão
psql $DATABASE_URL -c "SELECT 1;"
```

### Erro de CORS
```bash
# Verifique ALLOWED_ORIGINS no backend
# Certifique-se de que inclui o domínio do frontend
```

### Erro 500 no Backend
```bash
# Verifique logs
railway logs

# Verifique variáveis de ambiente
railway variables
```

## ✅ Checklist de Deploy

- [ ] PostgreSQL configurado e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Backend deployado e funcionando
- [ ] Frontend deployado e funcionando
- [ ] CORS configurado corretamente
- [ ] Usuário admin criado
- [ ] Testes de conectividade passando
- [ ] HTTPS configurado
- [ ] Monitoramento ativo
- [ ] Backup configurado

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do serviço
2. Confirme as variáveis de ambiente
3. Teste a conectividade do banco
4. Verifique a configuração de CORS

---

**Nota**: Este guia assume que você já testou tudo localmente. Sempre teste em ambiente de staging antes de produção.