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
ALLOWED_ORIGINS=https://melitus-gym-frontend.onrender.com,http://localhost:3000

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
# Backend API - URL do backend no Render
NEXT_PUBLIC_API_URL=https://melitus-gym-backend.onrender.com/api

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

- `https://melitus-gym-frontend.onrender.com` (produção)
- `http://localhost:3000` (desenvolvimento local)

Para adicionar novos domínios, atualize a variável `ALLOWED_ORIGINS` no Render.

### URLs de API

#### Produção
- **Backend**: `https://melitus-gym-backend.onrender.com`
- **Frontend**: `https://melitus-gym-frontend.onrender.com`
- **API Docs**: `https://melitus-gym-backend.onrender.com/docs` (desabilitado em produção)

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

Este é um projeto pessoal para uso único do usuário Lucas. Não há sistema multiusuário.