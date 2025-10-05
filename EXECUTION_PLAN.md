# EXECUTION_PLAN.md - Plano de Execução

## Visão Geral

**Projeto:** HealthTrack Pro (Beta)  
**Objetivo:** App web (PWA, mobile-first) para controle de diabetes tipo 1 + hipertensão + treinos e dieta  
**Estratégia:** Executar em fases modulares, cada fase concluída e validada antes de avançar  
**Deploy:** Apenas após todas as fases concluídas  

---

## FASES DO PROJETO

### 🔹 FASE 1 – Setup & Estrutura

**Objetivo:** Criar a base técnica do projeto

**Entregáveis:**
- ✅ Criar estrutura do repositório:
  - `/backend` (FastAPI + SQLModel)
  - `/frontend` (Next.js + Tailwind + Recharts + Three.js)
  - `/db` (Postgres + migrations)
- ✅ Configurar Docker Compose
- ✅ Criar `.env.example`
- ✅ Teste de fumaça: rota `/api/health`
- ✅ **Sistema de Autenticação JWT (Usuário Único)**:
  - Modelo `User` simplificado (id, username, email, password_hash, created_at)
  - Registro limitado ao primeiro usuário apenas
  - Login/logout com JWT para segurança
  - Frontend sem redirecionamentos por role
  - Preparado para escalabilidade futura

**Critérios de Aceite:**
- Projeto roda com `docker-compose up`
- Rota `/api/health` retorna status 200
- Frontend carrega página inicial
- Banco conecta sem erros
- **Autenticação funcional com apenas 1 usuário permitido**
- **JWT protege rotas sensíveis**
- **Registro bloqueado após primeiro usuário**

---

### 🔹 FASE 2 – Módulo Clínico (MVP)

**Objetivo:** Funcionalidade core para registro de dados clínicos

**Entregáveis:**
- ✅ Registro manual de glicemia, insulina, pressão
- ✅ Tabela `clinical_logs`
- ✅ Rotas backend (CRUD)
- ✅ Gráficos de evolução no frontend (Recharts)
- ✅ Dashboard inicial com status clínico diário

**Critérios de Aceite:**
- Usuário consegue registrar glicemia/insulina/pressão
- Dados são salvos no banco
- Gráficos mostram evolução dos últimos 7 dias
- Dashboard exibe resumo do dia atual

---

### 🔹 FASE 3 – Alarmes e Medicação

**Objetivo:** Sistema de lembretes para medicamentos

**Entregáveis:**
- ✅ Tabela `alarms`
- ✅ API CRUD alarmes
- ✅ Notificações via PWA (Web Push API)
- ✅ UI para listar, ativar/desativar alarmes

**Critérios de Aceite:**
- Usuário cria alarmes para medicamentos
- Notificações push funcionam no navegador
- Alarmes podem ser ativados/desativados
- Interface intuitiva para gerenciar alarmes

---

### 🔹 FASE 4 – Nutrição Inteligente

**Objetivo:** Controle alimentar com dados nutricionais

**Entregáveis:**
- ✅ Integração Nutritionix API
- ✅ Registro manual + busca por alimento
- ✅ Histórico de refeições com calorias/macros
- ✅ Dashboard mostra consumo diário + previsão glicêmica

**Critérios de Aceite:**
- Busca de alimentos retorna dados nutricionais
- Registro de refeições salva no banco
- Cálculo automático de calorias e macros
- Previsão de impacto glicêmico

---

### 🔹 FASE 5 – Treinos

**Objetivo:** Módulo de exercícios com visualização 3D

**Entregáveis:**
- ✅ Integração MuscleWiki API
- ✅ Tabela `workouts` (cache de exercícios)
- ✅ Boneco 3D com músculos ativos (Three.js)
- ✅ Registro de treino + calorias gastas

**Critérios de Aceite:**
- Lista de exercícios carregada da API
- Boneco 3D destaca músculos trabalhados
- Registro de séries, repetições e cargas
- Cálculo de calorias gastas no treino

---

### 🔹 FASE 6 – Receitas Terapêuticas

**Objetivo:** Banco de receitas adequadas para diabéticos e hipertensos

**Entregáveis:**
- ✅ Banco `recipes` (tags: pré/pós-treino, diabetes, hipertensão)
- ✅ UI com receitas + imagens
- ✅ Ação rápida "Comer agora" → adiciona ao diário

**Critérios de Aceite:**
- Receitas categorizadas por tags terapêuticas
- Interface visual atrativa com imagens
- Integração com módulo de nutrição
- Registro automático no diário alimentar

---

### 🔹 FASE 7 – Dashboard Integrado

**Objetivo:** Visão unificada de todos os módulos

**Entregáveis:**
- ✅ Dashboard unificado com:
  - Glicemia/pressão (últimos 7 dias)
  - Calorias e macros
  - Treinos recentes
  - Alarmes ativos
- ✅ Layout moderno, cards interativos

**Critérios de Aceite:**
- Todos os dados integrados em uma tela
- Gráficos interativos e responsivos
- Design consistente e moderno
- Performance otimizada

---

### 🔹 FASE 8 – PWA & IA Futuro

**Objetivo:** Transformar em app instalável e preparar IA

**Entregáveis:**
- ✅ Instalação mobile (manifest + service worker)
- ✅ IA (futuro):
  - Reconhecimento de refeição via foto
  - Ajuste de treino conforme glicemia/pressão
  - Receitas personalizadas

**Critérios de Aceite:**
- App instalável no celular
- Funciona offline (básico)
- Estrutura preparada para IA futura
- Performance mobile otimizada

---

## Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|-------------|
| Fase 1 | 2-3 dias | - |
| Fase 2 | 3-4 dias | Fase 1 |
| Fase 3 | 2-3 dias | Fase 2 |
| Fase 4 | 4-5 dias | Fase 2 |
| Fase 5 | 4-5 dias | Fase 2 |
| Fase 6 | 2-3 dias | Fase 4 |
| Fase 7 | 3-4 dias | Fases 2-6 |
| Fase 8 | 2-3 dias | Fase 7 |

**Total Estimado:** 22-30 dias

---

## Critérios de Qualidade

### Técnicos
- ✅ Código modular e bem documentado
- ✅ Testes unitários para APIs críticas
- ✅ Performance otimizada (< 3s carregamento)
- ✅ Responsivo em todos os dispositivos

### Funcionais
- ✅ Todas as funcionalidades testadas manualmente
- ✅ Dados persistem corretamente
- ✅ UX intuitiva e consistente
- ✅ Sem bugs críticos

### Deploy
- ✅ Docker funciona em produção
- ✅ Variáveis de ambiente configuradas
- ✅ Backup e recovery testados
- ✅ Monitoramento básico ativo

---

## Próximos Passos

1. **Iniciar Fase 1** - Setup & Estrutura
2. **Validar cada entregável** antes de avançar
3. **Documentar problemas** e soluções encontradas
4. **Testar integração** entre módulos
5. **Deploy final** após Fase 8 completa

---

*Este plano será atualizado conforme o progresso do desenvolvimento.*