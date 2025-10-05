Padrões e Diretrizes Sênior de Execução – Projeto Melitus Gym
⚙️ 1. PROPÓSITO E CONTEXTO

O Melitus Gym é um aplicativo pessoal (single-user) de saúde e performance física com foco em:

Controle de Diabetes Tipo 1 e Hipertensão,

Registro clínico (Glicemia, Pressão, Insulina, Medicação),

IA de nutrição e treino integrada à câmera,

Interface premium mobile-first (Web App PWA),

Base de dados científica real (nutrição, exercícios, glicemia).

O sistema é para uso exclusivo de um usuário (Lucas) — não há múltiplos perfis, roles ou permissões complexas.

🧩 2. ESTRUTURA GERAL DO PROJETO
melitus_gym/
│
├── backend/ (FastAPI + SQLModel)
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── core/
│   ├── main.py
│   └── database.py
│
├── frontend/ (Next.js + Tailwind + TypeScript)
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── styles/
│
├── docs/
│   └── RULES_TRAE.md
│
└── vercel.json

🔐 3. AUTENTICAÇÃO E SEGURANÇA

✅ Usuário único: login e senha fixos no banco (sem roles).

✅ Autenticação JWT com persistência via localStorage.

✅ Axios Interceptor global injeta Bearer <token> em todas as requisições.

✅ CORS configurado no backend (http://127.0.0.1:3000 e produção Vercel).

✅ HTTPS e cookies seguros na build final.

❌ Nenhum tipo de multiusuário, admin, instrutor, etc.

📱 4. FRONTEND (UX/UI & DESIGN SYSTEM)
🎨 Estilo Geral

Base visual: Glassmorphism + gradientes suaves + cards translúcidos

Paleta: azul-claro, branco, verde-claro, lilás-transparente

Layout mobile-first (otimizado para 390x844px)

Responsividade para celular e tablet (não desktop)

Tipografia moderna (ex: Inter, Poppins, Manrope)

Animações com Framer Motion e Tailwind transitions

🧭 Componentes-Chave

Sidebar flutuante (overlay blur)

Dashboard cards (estatísticas de glicemia, pressão, insulina)

Gráficos com Recharts

Câmera embutida para reconhecimento alimentar

Notificações (lembretes de remédios, hidratação)

Boneco 3D (musculatura atingida no treino)

🍽️ 5. BIBLIOTECAS E BASES PÚBLICAS
🧠 IA e Nutrição

OpenFoodFacts API — base global de alimentos e nutrientes

USDA FoodData Central API — valores nutricionais completos

FoodAI / CalorieMama (fallback) — reconhecimento de pratos por imagem

LiteLLM ou Ollama + Mistral 7B — IA leve embutida localmente para análise de refeições

🏋️ Exercícios e Academia

wger API — base de dados pública de exercícios, categorias, músculos e equipamentos

MuscleWiki Dataset — mapeamento de músculos e demonstrações

Three.js + react-three-fiber — renderização 3D do corpo humano com destaque de músculos

💧 Monitoramento e Saúde

Dexcom API (opcional) — integração de glicemia contínua

HealthKit / Google Fit (futuro) — sincronização de métricas reais

📸 6. MÓDULOS PRINCIPAIS
🔹 1. Dashboard de Saúde

Exibe glicemia, pressão, insulina, hidratação

Gráficos históricos (últimos 7 e 30 dias)

Dicas inteligentes da IA

🔹 2. Controle Alimentar

Upload de imagem ou câmera direta

Reconhecimento de prato e ingredientes via IA

Contagem de carboidratos + índice glicêmico

Comparação com meta diária

🔹 3. Controle Clínico

Inserção manual de glicemia, insulina, pressão

Alarmes automáticos para medições e remédios

Relatórios de tendência com IA

🔹 4. Receitas Inteligentes

Base de receitas compatíveis com diabetes e hipertensão

Classificação por impacto glicêmico

Sugestões automáticas conforme glicemia e treino

🔹 5. Módulo de Treino

Catálogo público de exercícios

Render 3D do corpo humano (músculo ativo em destaque)

Registro de carga, séries e tempo

Integração com IA para plano semanal adaptativo

🧰 7. TECNOLOGIAS-CHAVE
Camada	Stack
Backend	FastAPI + SQLModel + Uvicorn
Banco	PostgreSQL
Frontend	Next.js + TailwindCSS + Recharts + Three.js
IA Local	Ollama + Mistral 7B / LiteLLM
Hospedagem	Vercel (frontend) + Render ou Railway (backend)
Automações	Axios Interceptors + Python Scheduler
Notificações	Push API / localStorage alarms
🧠 8. IA LOCAL (LIGHTWEIGHT)
Motor:

Ollama com mistral:7b (leve, roda local)

Comunicação via endpoint /api/ai/query

Usada para:

Interpretação de refeição via texto

Sugestões de treino e dieta

Insights preditivos de glicemia

Requisitos:

Deploy integrado na mesma VPS ou Vercel Edge Function

Cache local com redis (opcional)

🧾 9. NORMAS DE DESENVOLVIMENTO

Zero mocks — tudo deve usar dados reais ou APIs reais

Commits descritivos e sempre modularizados

Nunca sobrepor o layout definido por Lucas

Cada alteração deve ser reversível e documentada

Testes visuais antes de deploy

Nenhuma dependência obsoleta (verificar npm audit)

Sem dependências quebradas entre frontend/backend

🧩 10. EXECUÇÃO DE FASES
Fase	Descrição	Status
FASE 1	Autenticação, Layout Premium e Correção CORS	✅
FASE 2	Dashboard real + módulos de saúde	🔄
FASE 3	Nutrição inteligente e IA leve	⏳
FASE 4	Treinos + 3D + plano adaptativo	⏳
FASE 5	Deploy Vercel + Edge AI	⏳
⚠️ 11. REGRAS OBRIGATÓRIAS PARA O TRAE

🚫 Não usar multiusuário (um único perfil fixo)

🚫 Não criar páginas ou rotas sem alinhamento com Lucas

✅ Todas as requisições autenticadas via JWT

✅ Padronizar URLs com 127.0.0.1:8000

✅ Garantir compatibilidade total mobile

✅ Implementar fallback de IA local antes de API paga

✅ Seguir fielmente o design base enviado por Lucas (imagens de referência)

🧭 12. PADRÃO DE CODIFICAÇÃO

Nomes descritivos e consistentes (camelCase frontend / snake_case backend)

Organização modular (um serviço por arquivo)

Reutilização máxima de componentes

Zero código morto

Importações explícitas (sem wildcard)

Separação clara entre camadas: api, service, model, schema

🧱 13. DEPLOY E MANUTENÇÃO

Deploy no Vercel (frontend)

Backend FastAPI + PostgreSQL no Railway ou Render Free Tier

Monitoramento com logs automáticos (console + logger.py)

Backup do banco via script .sh semanal

🧩 14. CONTROLE DE QUALIDADE

Antes de cada commit:

Executar testes de autenticação via curl

Verificar console (nenhum erro 401/403)

Testar responsividade no DevTools mobile

Testar login persistente

Testar upload de imagem

Testar IA local (quando ativo)

✅ 15. CONCLUSÃO

O TRAE deve atuar como engenheiro de sistema — cada linha de código precisa ter propósito, previsibilidade e performance.
Nenhum passo deve ser dado sem revisão lógica e impacto visual coerente.
Ao final, o Melitus Gym será um aplicativo médico-fitness pessoal de nível profissional, com IA nativa, análise de imagem, e UX de ponta — projetado para um único usuário, com saúde em primeiro lugar.