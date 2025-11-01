# Módulo de Nutrição - Melitus Gym

## Visão Geral

O módulo de Nutrição do Melitus Gym foi projetado para fornecer uma experiência completa de gerenciamento nutricional para usuários com diabetes. O sistema utiliza a tabela TACO (Tabela Brasileira de Composição de Alimentos) como fonte primária de dados nutricionais, permitindo busca, cálculo de nutrientes e registro de refeições.

## Arquitetura

### Backend

O backend do módulo de Nutrição é construído com FastAPI e SQLModel, seguindo uma arquitetura em camadas:

1. **Rotas (API)**: Endpoints RESTful para busca de alimentos, cálculos nutricionais e gerenciamento de histórico de refeições.
2. **Serviços**: Lógica de negócio para processamento de dados nutricionais, cálculos e integração com fontes de dados.
3. **Modelos**: Definição de esquemas de dados e modelos de banco de dados.
4. **ETL**: Processamento e ingestão da tabela TACO para o banco de dados.

### Frontend

O frontend é implementado com Next.js e React, utilizando componentes modulares:

1. **Serviços**: Comunicação com a API e processamento de dados.
2. **Componentes**: Elementos de UI reutilizáveis para busca, cálculo e exibição de dados nutricionais.
3. **Página**: Integração dos componentes em uma interface coesa.

## Fluxo de Dados

1. **Ingestão de Dados**: A tabela TACO é processada e armazenada no banco de dados PostgreSQL.
2. **Busca de Alimentos**: O usuário busca alimentos pelo nome, com sugestões em tempo real.
3. **Cálculo Nutricional**: Os nutrientes são calculados com base na porção selecionada.
4. **Cálculo de Insulina**: A dose de insulina é calculada com base nos carboidratos e na sensibilidade do usuário.
5. **Registro de Refeições**: As refeições são salvas no banco de dados para histórico e análise.

## Componentes Principais

### Backend

- **ETL TACO**: Processamento da tabela TACO para o banco de dados.
- **Connector Service**: Serviço para busca unificada de alimentos.
- **Calculator Service**: Serviço para cálculos nutricionais.
- **Meal Log API**: Endpoints para gerenciamento de histórico de refeições.

### Frontend

- **FoodAutocomplete**: Componente de busca de alimentos com sugestões em tempo real.
- **NutritionCalculator**: Componente para cálculo de nutrientes por porção.
- **InsulinCalculator**: Componente para cálculo de dose de insulina.
- **MealHistory**: Componente para exibição e gerenciamento de histórico de refeições.

## Decisões de Design

### Uso da Tabela TACO

A tabela TACO foi escolhida como fonte primária de dados nutricionais por ser uma referência oficial brasileira, contendo informações precisas sobre alimentos comuns na dieta brasileira. Isso proporciona maior precisão nos cálculos nutricionais e melhor experiência para o usuário.

### Cálculo Local vs. API

Para melhorar a performance e reduzir a latência, implementamos cálculos nutricionais tanto no backend quanto no frontend:

- **Backend**: Cálculos complexos e persistência de dados.
- **Frontend**: Cálculos simples para feedback imediato ao usuário.

### Calculadora de Insulina

A calculadora de insulina foi projetada com base em práticas médicas para cálculo de dose de insulina para diabéticos:

1. **Dose Básica**: Carboidratos ÷ Sensibilidade à Insulina
2. **Ajuste para Alto Índice Glicêmico**: (Carboidratos × Ajuste%) ÷ Sensibilidade
3. **Dose Total**: Dose Básica + Dose de Correção

### Interface de Usuário

A interface foi projetada para ser intuitiva e focada em usuários com diabetes:

1. **Busca Rápida**: Autocomplete para encontrar alimentos rapidamente.
2. **Feedback Visual**: Destaque para carboidratos e calorias.
3. **Histórico Acessível**: Visualização clara do histórico de refeições.
4. **Calculadora Integrada**: Cálculo de insulina diretamente na interface.

## Fluxo de Trabalho do Usuário

1. O usuário acessa a página de Nutrição.
2. Busca um alimento pelo nome.
3. Seleciona a porção desejada.
4. Visualiza os nutrientes calculados.
5. Adiciona o alimento ao prato atual.
6. Repete o processo para adicionar mais alimentos.
7. Visualiza os totais nutricionais do prato.
8. Utiliza a calculadora de insulina para determinar a dose necessária.
9. Salva a refeição no histórico.
10. Consulta o histórico de refeições quando necessário.

## Considerações Técnicas

### Performance

- **Debounce na Busca**: Implementamos debounce na busca para reduzir o número de requisições.
- **Cálculos Locais**: Cálculos simples são realizados no frontend para feedback imediato.
- **Paginação**: O histórico de refeições é paginado para melhor performance.

### Segurança

- **Autenticação JWT**: Todas as requisições são autenticadas via JWT.
- **Validação de Dados**: Validação rigorosa de dados no backend e frontend.
- **CORS Configurado**: Configuração adequada de CORS para segurança.

### Manutenibilidade

- **Componentes Modulares**: Componentes independentes e reutilizáveis.
- **Serviços Separados**: Lógica de negócio separada da interface.
- **Tipagem Forte**: TypeScript para melhor manutenibilidade e detecção de erros.

## Melhorias Futuras

1. **Reconhecimento de Imagem**: Integração com IA para reconhecimento de alimentos por imagem.
2. **Sugestões Personalizadas**: Recomendações de refeições com base no histórico e perfil do usuário.
3. **Integração com Dispositivos**: Conexão com medidores de glicemia para ajuste automático de doses.
4. **Análise Avançada**: Gráficos e insights sobre padrões alimentares e impacto na glicemia.

## Conclusão

O módulo de Nutrição do Melitus Gym oferece uma solução completa para gerenciamento nutricional de usuários com diabetes, combinando dados precisos da tabela TACO com uma interface intuitiva e ferramentas específicas para controle de diabetes. A arquitetura modular e as decisões de design focadas no usuário garantem uma experiência eficiente e útil para o controle diário da alimentação e dosagem de insulina.

## Busca Dinâmica TACO (CSV/XLSX)

Para evitar ingestão completa da base TACO e reduzir custo de processamento, implementamos uma busca dinâmica conectada ao arquivo original, com cache em memória e upsert incremental no banco.

### Principais Funções
- `TACODynamicLoader.search(term, page_size)`: executa o fluxo cache → banco → arquivo (CSV/XLSX) e retorna itens normalizados em tempo real.
- Cache em memória com TTL e limite de itens, evitando leituras repetidas do arquivo.
- Upsert automático no banco de dados (via select + update/insert) para popular gradualmente a tabela `taco_foods` somente com itens utilizados.

### Fluxo Operacional
- Primeira busca: lê do arquivo TACO (`.csv` preferencial, fallback para `.xlsx`), normaliza, salva em cache e upserta no banco.
- Buscas seguintes: consulta primeiro o cache; se não existir ou insuficiente, lê novamente do arquivo e repete o processo.

### Configuração
- Caminho do arquivo: variável de ambiente `TACO_FILE_PATH` (opcional).
- Padrões:
  - Procura `Taco-4a-Edicao.csv` na raiz do projeto.
  - Se não existir, fallback para `Taco-4a-Edicao.xlsx` na raiz.
- Campo único: `name_pt` possui unicidade opcional para permitir `ON CONFLICT` em bancos que suportam a constraint.

### Endpoints
- `GET /api/nutrition/v2/search?term=<texto>&page_size=<n>`: conectado ao serviço dinâmico; retorna itens combinando cache, banco e arquivo.

### Personalizações
- Cache: ajustar `ttl_seconds` e `max_items` no `InMemoryCache` para balancear memória vs. latência.
- Mapeamento de colunas: usa `_map_headers` para tolerar variações de cabeçalho na TACO.
- Parsing numérico: `_parse_float` aceita formatos PT-BR e valores nulos.

### Melhorias Futuras
- Cache persistente (Redis) para ambiente cloud/edge.
- Índices textuais (`GIN`/`trigram`) para acelerar buscas por nome.
- Monitoramento de performance no carregamento de arquivo e métricas de latência por termo.
- Upload gerenciado do arquivo TACO via painel admin e versionamento.

### Deploy na Nuvem
- O fluxo lê o arquivo do sistema de arquivos; em ambientes serverless, configure `TACO_FILE_PATH` apontando para storage persistente (ex.: mounted volume ou bucket sincronizado).
- Em Postgres, garanta a constraint `UNIQUE` em `name_pt` para habilitar `ON CONFLICT`. Quando não disponível, o upsert é realizado via seleção/atualização.