

## Plano: Aprimorar Insights Financeiros com Categorias e Sugestões de Ação

O hook `useFinancialInsights` e a seção no Dashboard já existem. As melhorias adicionam dois elementos novos: **categoria que mais cresceu** e **sugestão de ação** em cada insight.

### Mudanças em `src/hooks/useFinancialInsights.ts`:

1. **Adicionar campo `suggestion`** à interface `FinancialInsight` — string com sugestão de ação prática.

2. **Receber `despesas` com campo `categoria`** — ajustar tipo do parâmetro para incluir `categoria?: string | null`.

3. **Nova regra: Categoria que mais cresceu** — Comparar totais por categoria entre mês atual e anterior. Se alguma categoria cresceu >30%, gerar insight com nome da categoria e percentual. Ex: "Seus gastos com Transporte cresceram 45%. Considere alternativas mais econômicas."

4. **Ajustar regra de lucro** — Usar últimos 3 meses (em vez de 6) conforme solicitado.

5. **Adicionar `suggestion` a todos os insights existentes:**
   - Aumento de despesas → "Revise seus gastos e identifique onde pode economizar."
   - Queda de faturamento → "Avalie novas fontes de receita ou renegocie com clientes."
   - Lucro abaixo da média → "Compare seus custos fixos e variáveis para encontrar oportunidades."
   - Previsão de déficit → "Priorize cobranças pendentes e adie despesas não essenciais."
   - Mês positivo → "Aproveite para criar uma reserva de emergência."

### Mudanças em `src/pages/Dashboard.tsx`:

6. **Exibir `suggestion`** — Adicionar linha extra no card de insight com a sugestão de ação em texto menor e itálico.

7. **Passar campo `categoria` nas despesas** — O query já retorna `select("*")`, então o campo já está disponível; apenas ajustar o tipo passado ao hook.

### Arquivos afetados
- `src/hooks/useFinancialInsights.ts` — adicionar suggestion, regra de categoria, ajustar média para 3 meses
- `src/pages/Dashboard.tsx` — exibir suggestion nos cards

