# 🏋️ Melitus Gym - Roadmap Técnico

## 📋 Visão Geral

O Melitus Gym é um aplicativo de saúde pessoal mobile-first focado em controle glicêmico, nutrição e treinos. Este documento registra as dependências oficiais e APIs que serão integradas nas próximas fases do desenvolvimento.

## 🎯 Status Atual

✅ **FASE 1 CONCLUÍDA**: Setup & Estrutura
- Autenticação JWT com usuário único implementada
- Layout mobile-first premium com sidebar flutuante
- Dashboard reformulado com páginas especializadas
- Páginas: Controle Glicêmico, Alimentação, Configurações
- Sistema de design consistente

🔄 **FASE 2 EM ANDAMENTO**: Módulo Clínico (MVP)
- Registro de glicemia, insulina e pressão arterial
- Gráficos interativos com Recharts
- Formulários conectados ao backend

## 📦 Dependências Confirmadas

### Backend - Python/FastAPI

#### Core
```
fastapi
uvicorn
sqlmodel
python-multipart
requests
pillow
```

#### IA Leve
```
ultralytics      # YOLOv8 (reconhecimento de alimentos)
onnxruntime      # execução leve de modelos sem GPU
numpy
opencv-python
```

#### Nutrição e Saúde
```
httpx
pydantic
python-dotenv
cachetools       # cache de consultas API
```

### Frontend - Next.js + TypeScript

#### Core
```
next
react
typescript
tailwindcss
framer-motion
```

#### Visualização de Dados
```
recharts
apexcharts
```

#### 3D e Animações Musculares
```
three
@react-three/fiber
@react-three/drei
```

#### Notificações e PWA
```
next-pwa
react-toastify
```

## 🌐 APIs e Fontes de Dados Oficiais

| Tipo | Nome | URL / Observação |
|------|------|------------------|
| **Nutrição (primário)** | Open Food Facts API | `https://openfoodfacts.github.io/openfoodfacts-server/api` |
| **Nutrição (fallback)** | USDA FoodData Central | `https://fdc.nal.usda.gov/api-guide` |
| **Análise textual de receitas** | API Ninjas - Nutrition | `https://api-ninjas.com/api/nutrition` |
| **Treinos / Exercícios** | Wger API | `https://wger.de/api/v2/` |
| **Reconhecimento de alimentos (IA)** | YOLOv8-tiny (local, open-source) | `https://github.com/ultralytics/ultralytics` |
| **Receitas glicêmicas** | Open Food Facts + Edamam mix | Open data |

## 🚀 Próximas Fases

### FASE 3: Módulo de Nutrição
- Integração com Open Food Facts API
- Scanner de código de barras
- Reconhecimento de alimentos via IA (YOLOv8)
- Cálculo automático de carboidratos
- Histórico nutricional

### FASE 4: Módulo de Treinos
- Integração com Wger API
- Visualização 3D de exercícios
- Planos de treino personalizados
- Tracking de progresso

### FASE 5: IA e Automação
- Sugestões inteligentes de refeições
- Predição de glicemia
- Alertas personalizados
- Análise de padrões

### FASE 6: PWA e Notificações
- Progressive Web App
- Notificações push locais
- Modo offline
- Sincronização de dados

## ⚙️ Observações Técnicas

### Arquitetura
- **Backend**: FastAPI + SQLModel + SQLite
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Deploy**: Render (backend) + Vercel (frontend)
- **IA**: Modelos locais via ONNX Runtime (sem GPU)

### Princípios de Desenvolvimento
- Mobile-first design
- Usuário único (sem perfis múltiplos)
- APIs públicas e open-source
- Deploy gratuito compatível
- Performance otimizada

### Limitações Atuais
- Sem suporte desktop
- Sem integração com wearables
- Sem backup em nuvem
- Sem compartilhamento social

## 📝 Status das Dependências

⚠️ **IMPORTANTE**: As dependências listadas acima estão apenas **documentadas** para futura integração. Não foram instaladas ainda.

### Próximos Passos
1. Concluir FASE 2 (Módulo Clínico)
2. Instalar dependências da FASE 3 conforme necessário
3. Implementar integração com APIs de nutrição
4. Testes e validação de cada módulo

---

**Última atualização**: Janeiro 2025  
**Versão do documento**: 1.0  
**Desenvolvedor**: Lucas - Melitus Gym Team