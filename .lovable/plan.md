

## Plano: Insights Financeiros Automáticos no Dashboard

### Novo arquivo: `src/hooks/useFinancialInsights.ts`

Hook dedicado que recebe os arrays de `receitas` e `despesas` e retorna uma lista de insights calculados com `useMemo`. Cada insight tem: `type` (warning/danger/info/success), `title`, `description` e `icon`.

**Regras de detecção:**

1. **Aumento de despesas** — Compara despesas do mês atual vs mês anterior. Se aumento > 20%, gera alerta warning.
2. **Queda de faturamento** — Compara receitas do mês atual vs mês anterior. Se queda > 15%, gera alerta danger.
3. **Lucro abaixo da média** — Calcula lucro médio dos últimos 6 meses. Se lucro atual < 70% da média, gera alerta warning.
4. **Previsão de déficit** — Se despesas do mês atual > receitas do mês atual, gera alerta danger.
5. **Mês positivo** — Se lucro atual > média dos últimos 6 meses, gera insight success.

### Alteração: `src/pages/Dashboard.tsx`

- Importar e usar `useFinancialInsights(receitas, despesas)`
- Inserir seção de alertas entre os cards de resumo e os gráficos
- Cada insight renderizado como um card compacto com ícone, cor de borda lateral (verde/amarelo/vermelho/azul) e animação de entrada via `framer-motion`
- Se não houver insights, a seção não aparece

### Arquivos afetados
- `src/hooks/useFinancialInsights.ts` — novo
- `src/pages/Dashboard.tsx` — adicionar seção de insights

