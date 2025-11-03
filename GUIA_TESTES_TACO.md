# Guia de Testes - Web Scraping TACO

## ⚠️ ANTES DE TESTAR

### 1. Ajustar URLs do Scraper (OBRIGATÓRIO)

Edite o arquivo: `backend/app/services/taco_scraper.py`

**Linhas 48-49:**
```python
# URL base da TACO online (exemplo - ajustar conforme site real)
BASE_URL = "http://www.tbca.net.br/base-dados/int_composicao_alimentos.php"
SEARCH_URL = "http://www.tbca.net.br/base-dados/composicao_alimentos.php"
```

**Substitua pelas URLs reais do site TACO que você deseja usar para scraping.**

### 2. Ajustar Seletores HTML (OBRIGATÓRIO)

No mesmo arquivo, método `_parse_food_table` (linhas 120-140):

1. Inspecione a página HTML do site TACO
2. Identifique a estrutura da tabela de resultados
3. Ajuste os seletores CSS/XPath
4. Verifique os índices das colunas

**Exemplo de ajuste:**
```python
# Localizar tabela de resultados
table = soup.find('table', {'class': 'nome-da-classe-real'})

# Ajustar índices das colunas conforme tabela real
food_data = {
    "nome": cols[0].get_text(strip=True),        # Índice da coluna nome
    "categoria": cols[1].get_text(strip=True),   # Índice da coluna categoria
    "kcal": _parse_float(cols[2].get_text(strip=True)),  # etc...
    # ... ajustar todos os índices
}
```

---

## 📋 CHECKLIST DE PRÉ-REQUISITOS

Antes de iniciar os testes, verifique:

- [ ] URLs do scraper configuradas
- [ ] Seletores HTML ajustados
- [ ] Dependências Python instaladas
- [ ] Dependências Node.js instaladas
- [ ] Backend rodando
- [ ] Frontend rodando
- [ ] Acesso à internet (para web scraping)

---

## 🔧 SETUP

### Backend

```bash
# Navegar para pasta backend
cd backend

# Instalar dependências (se ainda não instalou)
pip install beautifulsoup4==4.12.2 lxml==4.9.3

# Ou instalar todas as dependências
pip install -r requirements.txt

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

**Verifique se o servidor iniciou:**
- Console deve mostrar: `Application startup complete`
- Acesse: `http://localhost:8000/docs` (Swagger UI)

### Frontend

```bash
# Navegar para pasta frontend
cd frontend

# Instalar dependências (se ainda não instalou)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

**Verifique se o frontend iniciou:**
- Console deve mostrar: `ready - started server on http://localhost:3000`
- Acesse: `http://localhost:3000`

---

## 🧪 TESTES BACKEND

### 1. Teste de Health Check

```bash
curl http://localhost:8000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-03T19:30:00",
  "version": "1.0.0",
  "environment": "development"
}
```

### 2. Teste do Endpoint TACO Search - Query Válida

```bash
curl "http://localhost:8000/api/taco/search?query=arroz&limit=5"
```

**Resposta esperada (sucesso):**
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
  "total_found": 5,
  "source": "taco_online",
  "cached": false,
  "search_time_ms": 245.67,
  "timestamp": "2024-11-03T19:30:00"
}
```

### 3. Teste com Query Curta (Deve Falhar)

```bash
curl "http://localhost:8000/api/taco/search?query=a"
```

**Resposta esperada (erro 400):**
```json
{
  "detail": {
    "error": "invalid_query",
    "message": "O termo de busca deve ter pelo menos 2 caracteres",
    "timestamp": "2024-11-03T19:30:00"
  }
}
```

### 4. Teste com Limit Inválido (Deve Falhar)

```bash
curl "http://localhost:8000/api/taco/search?query=arroz&limit=100"
```

**Resposta esperada (erro 400):**
```json
{
  "detail": {
    "error": "invalid_limit",
    "message": "O limite deve estar entre 1 e 50",
    "timestamp": "2024-11-03T19:30:00"
  }
}
```

### 5. Teste com Caracteres Especiais

```bash
curl "http://localhost:8000/api/taco/search?query=feij%C3%A3o"
```

**Resposta esperada:**
Deve retornar alimentos contendo "feijão" (se disponíveis no site).

### 6. Teste de Performance

```bash
# Executar mesma query 3 vezes e comparar tempos
curl "http://localhost:8000/api/taco/search?query=arroz"
# Observe o campo "search_time_ms"
# Segunda chamada pode ser mais rápida devido ao cache
```

---

## 🌐 TESTES FRONTEND

### 1. Acesso à Página de Nutrição

1. Abra o navegador em `http://localhost:3000`
2. Faça login (se necessário)
3. Navegue até a página de Nutrição
4. Verifique se a página carrega sem erros

### 2. Teste de Busca - Fluxo Completo

**Passo a passo:**

1. **Localizar campo de busca**
   - Deve haver um input com ícone de lupa
   - Placeholder: "Buscar alimento..."

2. **Digite termo curto (< 2 caracteres)**
   - Digite: "a"
   - **Resultado esperado:** Nada acontece (não busca)

3. **Digite termo válido**
   - Digite: "arroz"
   - **Resultado esperado:**
     - Ícone de loading aparece
     - Após ~300ms, dropdown de resultados abre
     - Lista de alimentos aparece

4. **Verificar resultados locais**
   - Se houver resultados do banco local, aparecem SEM badge
   - Se NÃO houver resultados locais, busca automática no scraping

5. **Verificar resultados do web scraping**
   - Alimentos do scraping têm badge verde "Online"
   - Dados nutricionais exibidos: carboidratos e kcal

6. **Selecionar um alimento**
   - Clique em um resultado
   - **Resultado esperado:**
     - Modal de cálculo de porção abre
     - Nome do alimento aparece
     - Pode ajustar quantidade (gramas)

7. **Adicionar ao prato**
   - Ajuste quantidade (ex: 150g)
   - Clique em "Adicionar"
   - **Resultado esperado:**
     - Alimento aparece na lista do prato atual
     - Totais nutricionais são atualizados

### 3. Teste de Erros

1. **Sem conexão com backend**
   - Pare o servidor backend
   - Tente buscar um alimento
   - **Resultado esperado:** Mensagem de erro em vermelho

2. **Busca sem resultados**
   - Digite: "alimentoinexistentexyz123"
   - **Resultado esperado:** Mensagem "Nenhum alimento encontrado"

3. **Timeout**
   - Se o site TACO estiver lento ou indisponível
   - **Resultado esperado:** Mensagem de erro após ~10 segundos

### 4. Teste de Navegação por Teclado

1. Digite "arroz" no campo de busca
2. Aguarde resultados aparecerem
3. Pressione **↓** (seta para baixo)
   - Item deve ser destacado
4. Pressione **↑** (seta para cima)
   - Navegação reversa
5. Pressione **Enter**
   - Item selecionado deve abrir modal
6. Pressione **ESC**
   - Dropdown deve fechar

### 5. Teste de Responsividade

1. **Desktop (> 1024px)**
   - Interface completa
   - Dropdown alinhado corretamente

2. **Tablet (768px - 1024px)**
   - Interface adaptada
   - Dropdown deve ser responsivo

3. **Mobile (< 768px)**
   - Campo de busca ocupa largura total
   - Dropdown ocupa largura total
   - Touch funciona corretamente

---

## 🔍 VERIFICAÇÃO DE LOGS

### Backend Logs

Monitore o console do backend durante os testes:

**Logs esperados:**
```
🔍 Iniciando busca TACO online: 'arroz' (limit=20)
🌐 Buscando página TACO para query: 'arroz'
✅ Página obtida com sucesso (status=200)
📊 Total de alimentos parseados: 15
✅ Busca TACO online concluída: 'arroz' - 15 resultados em 245.67ms
```

**Logs de erro (se houver):**
```
❌ Erro HTTP ao buscar página TACO: ...
⏱️ Timeout ao buscar página TACO para 'arroz'
⚠️ Nenhuma tabela encontrada no HTML
```

### Frontend Logs (Console do Navegador)

Abra DevTools (F12) e monitore o console:

**Logs esperados:**
```
Buscando alimentos: arroz
Busca local falhou, tentando web scraping...
Busca online concluída: 15 resultados
```

**Verifique também:**
- **Network tab:** Requisições para `/api/taco/search`
- **Status code:** 200 (sucesso) ou 400/503/500 (erros esperados)
- **Response time:** Deve ser < 5 segundos

---

## ✅ CRITÉRIOS DE ACEITE

### Backend

- [ ] Endpoint `/api/taco/search` responde
- [ ] Validações funcionam (query min 2 chars, limit 1-50)
- [ ] Retorna JSON padronizado
- [ ] Campos obrigatórios presentes (nome, kcal, carb, prot, lip, fibra)
- [ ] Tratamento de erros funciona
- [ ] Timeout configurado (10s)
- [ ] Cache implementado
- [ ] Logs informativos aparecem

### Frontend

- [ ] Campo de busca funciona
- [ ] Debounce implementado (300ms)
- [ ] Busca híbrida funciona (local → online)
- [ ] Badge "Online" aparece para resultados do scraping
- [ ] Loading state visível durante busca
- [ ] Mensagens de erro aparecem quando apropriado
- [ ] Navegação por teclado funciona
- [ ] Adicionar alimento ao prato funciona
- [ ] Totais nutricionais calculados corretamente
- [ ] Interface responsiva

### Integração

- [ ] Fluxo completo funciona sem erros
- [ ] Dados do scraping são corretamente convertidos
- [ ] Performance aceitável (< 5s para busca)
- [ ] Sem memory leaks
- [ ] Sem erros no console

---

## 🐛 TROUBLESHOOTING

### Problema: "Nenhum alimento encontrado" sempre

**Possíveis causas:**
1. URLs do scraper não configuradas
2. Seletores HTML incorretos
3. Site TACO indisponível
4. Firewall bloqueando requisições

**Solução:**
1. Verifique URLs em `taco_scraper.py`
2. Inspecione HTML do site real
3. Teste manualmente no navegador
4. Verifique logs do backend

### Problema: Erro 503 "Serviço temporariamente indisponível"

**Possíveis causas:**
1. Site TACO offline
2. Timeout HTTP (> 10s)
3. Rate limiting do site

**Solução:**
1. Teste URL manualmente no navegador
2. Aumente timeout se necessário
3. Adicione delays entre requisições

### Problema: Dados incorretos ou incompletos

**Possíveis causas:**
1. Índices de colunas incorretos
2. Estrutura HTML mudou
3. Parsing de números falhou

**Solução:**
1. Re-inspecione HTML do site
2. Ajuste índices em `_parse_food_table`
3. Verifique função `_parse_float`

### Problema: Frontend não conecta com backend

**Possíveis causas:**
1. Backend não está rodando
2. CORS configurado incorretamente
3. URL errada no frontend

**Solução:**
1. Verifique se backend está em `http://localhost:8000`
2. Verifique configuração de CORS em `main.py`
3. Verifique `axios-config.ts` no frontend

---

## 📊 MÉTRICAS DE SUCESSO

### Performance

- **Busca local:** < 500ms
- **Busca online:** < 5s
- **Cache hit:** < 50ms
- **Conversão de dados:** < 100ms

### Qualidade

- **Cobertura de testes:** > 80% dos casos de uso
- **Taxa de erro:** < 5% das requisições
- **Disponibilidade:** > 95% do tempo

### UX

- **Tempo de resposta percebido:** < 3s
- **Taxa de conclusão:** > 90% dos fluxos
- **Satisfação do usuário:** Feedback positivo

---

## 📝 RELATÓRIO DE TESTES

Após completar os testes, documente:

### Testes Executados

| # | Teste | Status | Observações |
|---|-------|--------|-------------|
| 1 | Health check | ⏳ | |
| 2 | Query válida | ⏳ | |
| 3 | Query curta | ⏳ | |
| 4 | Limit inválido | ⏳ | |
| 5 | Caracteres especiais | ⏳ | |
| 6 | Busca híbrida | ⏳ | |
| 7 | Badge Online | ⏳ | |
| 8 | Navegação teclado | ⏳ | |
| 9 | Adicionar ao prato | ⏳ | |
| 10 | Responsividade | ⏳ | |

**Legenda:** ✅ Passou | ❌ Falhou | ⏳ Pendente

### Bugs Encontrados

| # | Descrição | Severidade | Status |
|---|-----------|------------|--------|
| | | | |

### Melhorias Sugeridas

| # | Descrição | Prioridade |
|---|-----------|------------|
| | | |

---

## 🚀 PRÓXIMOS PASSOS

Após testes bem-sucedidos:

1. [ ] Documentar bugs encontrados
2. [ ] Corrigir bugs críticos
3. [ ] Atualizar documentação
4. [ ] Criar testes automatizados
5. [ ] Code review
6. [ ] Merge para main
7. [ ] Deploy em staging
8. [ ] Testes de aceitação
9. [ ] Deploy em produção
10. [ ] Monitoramento pós-deploy

---

**Boa sorte nos testes! 🎉**
