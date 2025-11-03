# Documentação: Web Scraping TACO

## Resumo das Implementações

### 1. Módulo de Web Scraping (`taco_scraper.py`)

**Localização:** `backend/app/services/taco_scraper.py`

**Funcionalidades:**
- Web scraping da tabela TACO online
- Cache LRU (`@lru_cache`) para otimizar performance
- Tratamento robusto de erros (timeout, HTTP errors, parsing errors)
- Normalização de texto para melhor matching
- Parsing de valores numéricos com formato PT-BR

**Classes:**
- `TACOWebScraper`: Classe principal do scraper
  - `search_foods(query, limit)`: Busca alimentos na TACO online
  - `clear_cache()`: Limpa cache de requisições
  - `_fetch_page(query)`: Busca página HTML (com cache)
  - `_parse_food_table(html, query)`: Faz parsing da tabela HTML

**Função auxiliar:**
- `get_taco_scraper()`: Retorna instância singleton do scraper

### 2. Endpoint REST

**Rota:** `GET /api/taco/search`

**Parâmetros de Query:**
- `query` (string, obrigatório): Termo de busca (mínimo 2 caracteres)
- `limit` (int, opcional): Número máximo de resultados (1-50, padrão: 20)

**Exemplo de Requisição:**
```bash
GET /api/taco/search?query=arroz&limit=10
```

**Resposta de Sucesso (200):**
```json
{
  "query": "arroz",
  "items": [
    {
      "nome": "Arroz branco cozido",
      "categoria": "Cereais",
      "kcal": 130.0,
      "carb": 28.1,
      "prot": 2.5,
      "lip": 0.2,
      "fibra": 0.4,
      "porcao": "100g",
      "porcao_gr": 100.0
    }
  ],
  "count": 1,
  "total_found": 1,
  "source": "taco_online",
  "cached": false,
  "search_time_ms": 245.67,
  "timestamp": "2024-11-03T19:12:00"
}
```

**Respostas de Erro:**

**400 - Bad Request:**
```json
{
  "error": "invalid_query",
  "message": "O termo de busca deve ter pelo menos 2 caracteres",
  "timestamp": "2024-11-03T19:12:00"
}
```

**503 - Service Unavailable:**
```json
{
  "query": "arroz",
  "items": [],
  "count": 0,
  "error": "Não foi possível acessar o site da TACO",
  "message": "Serviço de scraping TACO temporariamente indisponível",
  "timestamp": "2024-11-03T19:12:00"
}
```

**500 - Internal Server Error:**
```json
{
  "query": "arroz",
  "items": [],
  "count": 0,
  "error": "internal_error",
  "message": "Erro ao buscar alimentos TACO: ...",
  "timestamp": "2024-11-03T19:12:00"
}
```

### 3. Campos Retornados

Cada item no array `items` contém:
- **nome** (string): Nome do alimento
- **categoria** (string): Categoria/grupo alimentar
- **kcal** (float|null): Energia em kcal por 100g
- **carb** (float|null): Carboidratos em g por 100g
- **prot** (float|null): Proteínas em g por 100g
- **lip** (float|null): Lipídios em g por 100g
- **fibra** (float|null): Fibras em g por 100g
- **porcao** (string): Descrição da porção (ex: "100g")
- **porcao_gr** (float): Porção em gramas

### 4. Dependências Adicionadas

No `requirements.txt`:
```
beautifulsoup4==4.12.2
lxml==4.9.3
```

### 5. Cache e Performance

**Estratégia de Cache:**
- Cache LRU em memória com `functools.lru_cache`
- Tamanho máximo: 100 queries
- Cache aplicado na função `_fetch_page` para evitar requisições duplicadas

**Performance:**
- Timeout de requisições HTTP: 10 segundos
- Parsing otimizado com BeautifulSoup e lxml
- Logging estruturado para monitoramento

### 6. Tratamento de Erros

**Níveis de Tratamento:**
1. **Validação de entrada**: Query mínima de 2 chars, limit entre 1-50
2. **Timeout HTTP**: Retorna erro 503 se site não responder
3. **Parsing HTML**: Trata tabelas ausentes ou malformadas
4. **Valores numéricos**: Converte formatos PT-BR (vírgula para ponto)
5. **Fallback**: Retorna array vazio em caso de erro, nunca quebra

### 7. Logging

Todas as operações são logadas com níveis apropriados:
- `INFO`: Operações bem-sucedidas, inicializações
- `WARNING`: Estruturas HTML inesperadas, dados ausentes
- `ERROR`: Falhas HTTP, timeouts, exceções

**Exemplos de Logs:**
```
🕷️ TACO Web Scraper inicializado (cache_size=100, timeout=10s)
🌐 Buscando página TACO para query: 'arroz'
✅ Página obtida com sucesso (status=200)
📊 Total de alimentos parseados: 15
✅ Busca TACO online concluída: 'arroz' - 15 resultados em 245.67ms
```

### 8. Integração com Frontend

**Uso no React/Next.js:**
```typescript
const searchTaco = async (query: string, limit: number = 20) => {
  const response = await fetch(
    `/api/taco/search?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};

// Uso
const results = await searchTaco("arroz", 10);
console.log(`Encontrados ${results.count} alimentos`);
```

### 9. Notas Importantes

⚠️ **IMPORTANTE:** A URL do site TACO (`BASE_URL` e `SEARCH_URL`) no arquivo `taco_scraper.py` são exemplos genéricos. **Você deve ajustar** essas URLs e os seletores CSS no método `_parse_food_table` para corresponder à estrutura real do site que será usado para scraping.

**Ajustes necessários:**
1. Verificar URL correta da base TACO online
2. Inspecionar estrutura HTML da tabela de resultados
3. Ajustar seletores CSS/XPath no método `_parse_food_table`
4. Validar índices das colunas da tabela

### 10. Testes Sugeridos

```bash
# Teste básico
curl "http://localhost:8000/api/taco/search?query=arroz&limit=5"

# Teste com query curta (deve retornar erro 400)
curl "http://localhost:8000/api/taco/search?query=a"

# Teste com limit inválido (deve retornar erro 400)
curl "http://localhost:8000/api/taco/search?query=arroz&limit=100"

# Teste com caracteres especiais
curl "http://localhost:8000/api/taco/search?query=feij%C3%A3o&limit=10"
```

### 11. Melhorias Futuras

- [ ] Adicionar cache persistente (Redis/Memcached)
- [ ] Implementar rate limiting para proteger o site TACO
- [ ] Adicionar suporte a paginação
- [ ] Melhorar detecção de cache no response
- [ ] Adicionar métricas de performance (Prometheus)
- [ ] Implementar fallback para base local em caso de falha
- [ ] Adicionar testes unitários e de integração

---

## Checklist de Deploy

- [x] Código implementado
- [x] Dependências adicionadas ao `requirements.txt`
- [x] Endpoint documentado
- [x] Logging implementado
- [x] Tratamento de erros robusto
- [ ] URLs e seletores ajustados para site real
- [ ] Testes manuais realizados
- [ ] Testes automatizados criados
- [ ] Documentação de API atualizada
- [ ] Frontend integrado
- [ ] Deploy em ambiente de staging
- [ ] Monitoramento configurado
