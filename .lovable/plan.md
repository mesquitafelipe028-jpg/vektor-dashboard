

## Plano: Redesign do Dashboard FluxoPro

O dashboard atual já tem cards de resumo, um gráfico de evolução e lista de transações, mas precisa ser reestruturado conforme a especificação solicitada.

### Mudanças

**1. Atualizar `src/lib/mockData.ts`**
- Adicionar dados mock para imposto MEI pendente (valor do DAS, competência, vencimento)
- Adicionar helper para calcular faturamento/despesas do mês atual e lucro líquido

**2. Reescrever `src/pages/Dashboard.tsx`**

**Cards (grid 1-2-4 colunas responsivo):**
- Faturamento do mês: soma das receitas do mês atual, ícone `TrendingUp`, cor verde
- Despesas do mês: soma das despesas do mês atual, ícone `TrendingDown`, cor vermelha
- Lucro líquido: faturamento - despesas, ícone `Wallet`, cor azul/accent
- Imposto MEI pendente: valor do DAS pendente, ícone `Receipt`, cor amarela/warning

**Gráficos (grid 1-2 colunas):**
- Receitas vs Despesas: `BarChart` (recharts) com barras lado a lado por mês usando dados de `mockMonthlyData`
- Evolução de faturamento mensal: `AreaChart` ou `LineChart` mostrando apenas receitas ao longo dos meses

**Listas recentes (grid 1-2 colunas):**
- Últimas receitas: lista das 5 últimas transações tipo "receita", com descrição, valor, data e status
- Últimas despesas: lista das 5 últimas transações tipo "despesa", com descrição, valor, data e status

**Layout:** Totalmente responsivo com `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` para cards e `grid-cols-1 lg:grid-cols-2` para gráficos e listas. Animações com `framer-motion`.

### Arquivos afetados
- `src/lib/mockData.ts` — adicionar mock de imposto MEI pendente e helpers de cálculo mensal
- `src/pages/Dashboard.tsx` — reescrita completa

