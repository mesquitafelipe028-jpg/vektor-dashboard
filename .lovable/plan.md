

## Plano: Transações recorrentes sob demanda (lazy generation)

### Problema atual

Quando o usuário cria uma receita ou despesa recorrente, o sistema gera **12 registros de uma vez** no banco de dados. Isso causa:
- Lentidão na inserção
- Lista poluída com transações futuras que ainda não aconteceram
- Totais inflados (soma transações que ainda não foram confirmadas)

### Solução proposta

Mudar a abordagem de "gerar tudo antecipadamente" para **"gerar apenas o registro atual + próximo"**. O sistema só cria novas ocorrências quando o mês seguinte chegar.

### Mudanças planejadas

**1. Receitas (`src/pages/Revenues.tsx`) — Criação de recorrente**
- Ao criar receita recorrente, inserir **apenas 1 registro** (o da data de início) com status "pendente"
- Remover a chamada a `generateRecurringDates` e a inserção em lote de filhos
- Manter os campos `frequencia`, `data_inicio`, `data_fim`, `tipo_transacao` no registro pai

**2. Despesas (`src/pages/Expenses.tsx`) — Criação de recorrente**
- Mesmo tratamento: inserir apenas 1 registro com status "pendente"
- Parceladas permanecem como estão (gerar todas as parcelas faz sentido pois são um número finito e fixo)

**3. Hook de geração automática mensal (`src/hooks/useRecurringGenerator.ts`) — Novo arquivo**
- Criar hook que roda no Dashboard (ou AppLayout) ao carregar
- Busca todas as transações recorrentes onde:
  - `tipo_transacao = 'recorrente'`
  - `transacao_pai_id IS NULL` (é o registro pai)
  - A data da última ocorrência gerada é anterior ao mês atual
- Para cada uma, verifica se já existe registro para o mês atual; se não, cria automaticamente com status "pendente"
- Respeita `data_fim` — não gera se já passou

**4. Totais no Dashboard e listas**
- Os totais já somam apenas registros existentes no banco, então ao gerar sob demanda, naturalmente só contabilizará o que existe
- Transações com status "pendente" continuam aparecendo mas com badge visual diferente
- Apenas transações com status "recebido"/"pago" entram nos KPIs de receita/despesa realizados

**5. Fluxo de Caixa (`src/pages/CashFlow.tsx`)**
- Manter a projeção futura usando os metadados de recorrência (`frequencia`, `data_inicio`, `data_fim`) para calcular previsões sem precisar de registros no banco

### Detalhes técnicos

```text
ANTES:
  Usuário cria recorrente → 12 INSERTs no banco → lista cheia

DEPOIS:
  Usuário cria recorrente → 1 INSERT (mês atual)
  Hook mensal verifica → cria próxima ocorrência quando mês chegar
  Fluxo de caixa → projeta futuro via cálculo, não registros
```

**Arquivos a criar:**
- `src/hooks/useRecurringGenerator.ts`

**Arquivos a editar:**
- `src/pages/Revenues.tsx` — simplificar mutação de recorrente
- `src/pages/Expenses.tsx` — simplificar mutação de recorrente
- `src/pages/Dashboard.tsx` — chamar o hook + filtrar KPIs por status confirmado
- `src/pages/CashFlow.tsx` — projetar recorrentes via cálculo em vez de registros

