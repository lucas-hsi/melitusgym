# Configuração Firebase e FCM - Melitus Gym

Este guia explica como configurar Firebase Cloud Messaging (FCM) para notificações push no Melitus Gym.

## 1. Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto: `melitus-gym`
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

## 2. Configurar Web App

1. No painel do projeto, clique no ícone da web `</>`
2. Digite o nome do app: `Melitus Gym Web`
3. Marque "Configurar Firebase Hosting" (opcional)
4. Clique em "Registrar app"
5. Copie as configurações do Firebase

## 3. Ativar Cloud Messaging

1. No menu lateral, vá em "Messaging"
2. Clique em "Começar"
3. Aceite os termos de serviço

## 4. Gerar Chave VAPID

1. Vá em "Configurações do projeto" (ícone de engrenagem)
2. Aba "Cloud Messaging"
3. Em "Configuração da Web", clique em "Gerar par de chaves"
4. Copie a chave VAPID gerada

## 5. Configurar Service Account (Backend)

1. Vá em "Configurações do projeto" → "Contas de serviço"
2. Clique em "Gerar nova chave privada"
3. Escolha formato JSON
4. Baixe o arquivo JSON
5. Extraia as informações necessárias do arquivo

## 6. Configurar Frontend (.env.local)

Crie o arquivo `frontend/.env.local` com:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=melitus-gym.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=melitus-gym
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=melitus-gym.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase Cloud Messaging
NEXT_PUBLIC_FIREBASE_VAPID_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Backend API
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## 7. Configurar Backend (.env)

Crie o arquivo `backend/.env` com:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/melitus_gym

# JWT
SECRET_KEY=your_super_secret_jwt_key_here_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000

# Firebase Cloud Messaging (extrair do arquivo JSON baixado)
FCM_PROJECT_ID=melitus-gym
FCM_PRIVATE_KEY_ID=abcdef123456789
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@melitus-gym.iam.gserviceaccount.com
FCM_CLIENT_ID=123456789012345678901
FCM_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FCM_TOKEN_URI=https://oauth2.googleapis.com/token
FCM_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FCM_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40melitus-gym.iam.gserviceaccount.com
```

## 8. Estrutura do Arquivo JSON do Service Account

O arquivo JSON baixado tem esta estrutura:

```json
{
  "type": "service_account",
  "project_id": "melitus-gym",
  "private_key_id": "abcdef123456789",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@melitus-gym.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40melitus-gym.iam.gserviceaccount.com"
}
```

## 9. Testar Configuração

### Frontend
```bash
cd frontend
npm run dev
```

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

## 10. Verificar Funcionamento

1. Abra o app no navegador
2. Aceite as permissões de notificação
3. Vá em `/configuracoes/alarmes`
4. Crie um alarme de teste
5. Verifique se a notificação é enviada

## 11. Troubleshooting

### Erro: "Firebase project not found"
- Verifique se o `project_id` está correto
- Confirme se o projeto existe no Firebase Console

### Erro: "Invalid VAPID key"
- Regenere a chave VAPID no Firebase Console
- Verifique se copiou a chave completa

### Erro: "Permission denied"
- Verifique se o service account tem permissões adequadas
- Confirme se a chave privada está correta

### Notificações não aparecem
- Verifique se as permissões foram concedidas
- Teste em modo incógnito
- Verifique o console do navegador

## 12. Produção

Para produção:

1. Configure domínios autorizados no Firebase Console
2. Atualize `ALLOWED_ORIGINS` no backend
3. Use HTTPS obrigatoriamente
4. Configure variáveis de ambiente no Vercel/Railway

## 13. Recursos Úteis

- [Firebase Console](https://console.firebase.google.com/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)