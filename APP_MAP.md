# HealthTrack Pro (Beta) - Mapa da Aplicação

## 1. Visão Geral

**Nome:** HealthTrack Pro (Beta)  
**Tipo:** App Web (PWA) → Mobile-first, instalável no celular  
**Público:** Uso pessoal (diabetes tipo 1 + hipertensão + rotina de treino)  

### Stack Tecnológica
- **Backend:** Python (FastAPI)
- **Frontend:** Next.js + Tailwind + Recharts + Three.js
- **Banco:** PostgreSQL (SQLModel/SQLAlchemy)
- **Hospedagem inicial:** Vercel (frontend) + Render/Heroku (backend gratuito)

---

## 2. Módulos Principais

### 🩺 Clínico
- Registro manual de glicemia, pressão e insulina
- Alarmes para remédios/insulina
- Gráficos de evolução (Recharts)
- **Regras inteligentes:** alertar se glicemia + hipertensão simultâneos → alerta vermelho

### 🍽️ Refeições Inteligentes
- Registro via foto (IA futura, placeholder inicial manual)
- Integração com **API Nutritionix** para nutrientes
- Impacto previsto em glicemia (modelo inicial de cálculo)
- Histórico de refeições → curva glicêmica

### 🥗 Receitas Terapêuticas
- Banco próprio de receitas classificadas (glicemia, sódio, risco)
- **Tags:** pré-treino, pós-treino, hipertensão, low GI
- Opção "Comer agora" → registra direto no diário
- **IA futura:** ajustes automáticos em receitas

### 🏋️ Academia & Treinos
- Integração com **MuscleWiki API** (exercícios + músculos ativados)
- Bonequinho 3D (Three.js) → partes do corpo destacadas
- Registro de treino (séries, reps, cargas)
- **Ajuste dinâmico:** sugestão de treino conforme glicemia/pressão do dia

### 📊 Dashboard
- Tela inicial → resumo clínico + resumo alimentar + treino do dia
- Gráficos interativos
- Botões de ação rápida (registrar refeição, glicemia, treino)

---

## 3. Banco de Dados Inicial

### Tabelas Principais
- **users** (auth + configs)
- **clinical_logs** (glicemia, insulina, pressão, meds)
- **meals** (manual ou API)
- **recipes** (com tags terapêuticas)
- **workouts** (lista via API externa)
- **user_workouts** (execução real do usuário)
- **alarms** (remédios/insulina)

---

## 4. APIs Externas

- **Nutritionix API** → nutrientes
- **MuscleWiki API** → treinos
- **Futuro:** integração sensores (Dexcom, FreeStyle Libre)

---

## 5. Roadmap de Execução

### Fase 1: Fundação
1. **Setup inicial** → backend FastAPI + frontend Next.js + banco Postgres

### Fase 2: Módulos Core
2. **Módulo Clínico** (glicemia, pressão, insulina, alarmes)
3. **Módulo Alimentação** (registro manual + API Nutritionix)
4. **Módulo Treino** (lista exercícios + boneco 3D)

### Fase 3: Integração
5. **Receitas Terapêuticas** (banco próprio + integração no diário)
6. **Dashboard Integrado** (gráficos + resumo)

### Fase 4: Mobile & IA
7. **PWA** (instalação no celular)
8. **IA & Automação futura** (foto, receitas personalizadas, treino inteligente)

---

## 6. Design e UX

### Paleta Visual
- **Cores:** Verde neon + preto/cinza
- **Tipografia:** Bold para títulos
- **Componentes:** Cards arredondados para módulos

### Experiência
- **Dashboard central** estilo health apps (Apple Health / Fitbit)
- **3D interativo** no módulo treino
- **Layout moderno** e responsivo
- **Mobile-first** approach

---

## 7. Estrutura de Arquivos

```
HealthTrack Pro/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── features/
│   ├── styles/
│   └── package.json
├── docker-compose.yml
└── APP_MAP.md
```

---

## 8. Próximos Passos

1. ✅ **Documento criado** - APP_MAP.md
2. 🔄 **Setup inicial** - Docker + FastAPI + Next.js
3. 📋 **Módulo Clínico** - Primeiro módulo funcional
4. 🍽️ **Módulo Alimentação** - Integração Nutritionix
5. 🏋️ **Módulo Treino** - MuscleWiki + Three.js
6. 📊 **Dashboard** - Integração completa
7. 📱 **PWA** - Versão mobile

---

*Este documento serve como bússola para o desenvolvimento modular e organizado do HealthTrack Pro.*