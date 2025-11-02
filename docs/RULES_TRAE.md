# Melitus Gym – Regras do Trae (Ambiente Frontend)

## AMBIENTE FRONTEND – URL DA API

- Defina `NEXT_PUBLIC_API_URL` SEMPRE com o sufixo `/api`.
- Exemplos:
  - Local: `http://127.0.0.1:8000/api`
  - Produção (Railway): `https://melitusgym-production.up.railway.app/api`
- Use a instância central de HTTP (`frontend/lib/axios-config.ts`) com caminhos relativos:
  - Correto: `axiosInstance.post('/auth/login', payload)`
  - Evitar: `axios.post(process.env.NEXT_PUBLIC_API_URL + '/auth/login', payload)`

Isso evita que o frontend chame rotas incorretas em produção e mantém a compatibilidade com CORS e prefixos da API (`/api`).