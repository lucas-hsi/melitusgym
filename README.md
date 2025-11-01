# Melitus Gym

Aplicativo pessoal de saúde e performance física com foco em controle de Diabetes Tipo 1 e Hipertensão.

## 🏗️ Arquitetura

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Deploy**: Render (Backend) + Vercel (Frontend)
- **IA**: Integração com APIs de nutrição e visão computacional

## 🚀 Deploy e Integração

### Configuração de Ambiente

#### Backend (Render)

O backend está hospedado no Render e requer as seguintes variáveis de ambiente:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS - IMPORTANTE para integração com frontend
# Preferir CORS_ORIGINS em formato CSV (compatível com Railway/Render)
CORS_ORIGINS=https://tranquil-vitality-production-15a2.up.railway.app,http://127.0.0.1:3000
# ALLOWED_ORIGINS permanece compatível e é usado por um fallback no main.py
ALLOWED_ORIGINS=https://tranquil-vitality-production-15a2.up.railway.app,http://127.0.0.1:3000

# Environment
ENVIRONMENT=production
PORT=8000

# External APIs
FDC_API_KEY=your_fdc_api_key_here

# Firebase (Push Notifications)
FCM_PROJECT_ID=your_firebase_project_id
FCM_PRIVATE_KEY_ID=your_private_key_id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_key\n-----END PRIVATE KEY-----"
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

#### Frontend (Vercel)

O frontend requer as seguintes variáveis de ambiente:

```bash
# Backend API - URL do backend na Railway
NEXT_PUBLIC_API_URL=https://melitusgym-production.up.railway.app/api

# Firebase (Push Notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Vision/AI Configuration
NEXT_PUBLIC_VISION_BACKEND=local
NEXT_PUBLIC_LAZY_MODEL_LOADING=true

# Environment
NODE_ENV=production
```

### Configuração CORS

O backend está configurado para aceitar requisições dos seguintes domínios:

- `https://tranquil-vitality-production-15a2.up.railway.app` (produção)
- `http://localhost:3000` (desenvolvimento local)

Aceita dois formatos de configuração:
- `CORS_ORIGINS` em formato CSV (recomendado): `https://seu-app.railway.app,http://127.0.0.1:3000`
- `ALLOWED_ORIGINS` (compatibilidade): também em CSV

Em produção (Railway/Render), prefira sempre `CORS_ORIGINS` em CSV para evitar erros de parsing.

### URLs de API

#### Produção
- **Backend**: `https://melitusgym-production.up.railway.app`
- **Frontend**: `https://tranquil-vitality-production-15a2.up.railway.app`
- **API Docs**: `https://melitusgym-production.up.railway.app/docs` (desabilitado em produção)

#### Desenvolvimento Local
- **Backend**: `http://127.0.0.1:8000`
- **Frontend**: `http://localhost:3000`
- **API Docs**: `http://127.0.0.1:8000/docs`

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Docker (opcional)

### Configuração

1. **Clone o repositório**
```bash
git clone <repository-url>
cd melitus-gym
```

2. **Configure o Backend**
```bash
cd backend
cp .env.example .env
# Edite o .env com suas configurações
pip install -r requirements.txt
python -m app.main
```

3. **Configure o Frontend**
```bash
cd frontend
cp .env.example .env.local
# Edite o .env.local com suas configurações
npm install
npm run dev
```

### Docker (Alternativo)

```bash
docker-compose up --build
```

## 📡 Integração Frontend/Backend

### Configuração de API

O frontend usa Axios com interceptors automáticos para:

- **Autenticação**: Injeta automaticamente o token JWT em todas as requisições
- **Refresh Token**: Renova tokens expirados automaticamente
- **Error Handling**: Trata erros 401/403 redirecionando para login

### Arquivos de Configuração

- **Frontend API**: `frontend/lib/api.ts` e `frontend/lib/axios-config.ts`
- **Backend CORS**: `backend/app/main.py`
- **Environment**: `.env.example` em ambas as pastas

### Endpoints Principais

```typescript
// Autenticação
POST /api/auth/login
POST /api/auth/refresh

// Dados Clínicos
GET /api/clinical/glucose
POST /api/clinical/glucose
GET /api/clinical/blood-pressure
POST /api/clinical/blood-pressure

// Nutrição
POST /api/nutrition/analyze-image
GET /api/nutrition/foods

// Saúde
GET /api/health
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **CORS Error**: Verifique se o domínio do frontend está em `ALLOWED_ORIGINS`
2. **401 Unauthorized**: Verifique se o token JWT está sendo enviado corretamente
3. **API não encontrada**: Verifique se `NEXT_PUBLIC_API_URL` está correto
4. **Build Error**: Verifique se todas as variáveis de ambiente estão definidas

### Logs

- **Backend**: Logs disponíveis no painel do Render
- **Frontend**: Logs disponíveis no painel do Vercel
- **Local**: Console do navegador e terminal

## 📚 Documentação Adicional

- [Mapa da Aplicação](APP_MAP.md)
- [Plano de Execução](EXECUTION_PLAN.md)
- [Configuração Firebase](FIREBASE_SETUP.md)
- [Configuração Render](render.yaml)

## 🔐 Segurança

- Todas as senhas e chaves devem ser definidas via variáveis de ambiente
- JWT tokens têm expiração configurável
- CORS restrito aos domínios necessários
- HTTPS obrigatório em produção

## 📱 PWA

O frontend é configurado como Progressive Web App (PWA) com:

- Service Worker para cache offline
- Manifest para instalação
- Push notifications via Firebase

## 🤝 Contribuição

Este projeto agora suporta múltiplos usuários (multiusuário):
 - Registro livre via `POST /api/auth/register` (bloqueio apenas por email já existente — retorna `409`).
 - Login via `POST /api/auth/login` com JWT persistido no frontend.
 
Admin Reset (uso inicial apenas):
 - Endpoint: `POST /api/admin/reset-users`
 - Segurança: requer header `X-Admin-Reset` com o valor de `ADMIN_RESET_TOKEN` e variável `ENABLE_ADMIN_RESET=true` no ambiente.
 - Efeito: TRUNCATE `users` com `RESTART IDENTITY CASCADE` (apaga todos os usuários e reinicia IDs).
 - Procedimento recomendado:
   1. Habilite `ENABLE_ADMIN_RESET=true` e defina `ADMIN_RESET_TOKEN`.
   2. Chame `POST /api/admin/reset-users` com o header `X-Admin-Reset`.
   3. Registre o novo usuário admin via frontend (`/register`).
   4. Desabilite `ENABLE_ADMIN_RESET` em produção após a inicialização.

Observação: após a inicialização, remova/desabilite o reset para evitar uso indevido.