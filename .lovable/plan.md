

## Plan: Dashboard Intelligence Enhancements

### Overview
Add 3 new elements to the Dashboard: a **Resumo do Mês** card (auto-generated text summary), an **Insight Financeiro** card (single smart tip), and a **Mini Gráfico de Fluxo** (small AreaChart showing daily flow within the month).

### Changes

**File: `src/pages/Dashboard.tsx`**

Insert 3 new sections into the existing JSX structure. No new files needed -- all logic lives inline using existing data (`faturamentoMes`, `despesasMesTotal`, `saldoMes`, `prevMonth`, `despesaPercent`, `filteredReceitas`, `filteredDespesas`).

**1. Resumo do Mês** (after Saldo do Mês card, ~line 427)
- Card with `FileText` icon and title "Resumo do mês"
- 3 auto-generated lines:
  - "Você faturou R$ X neste mês."
  - "Suas despesas foram R$ X."
  - "Seu lucro atual é de R$ X." (or deficit warning if negative)
- Conditional alert line when `despesasMesTotal > faturamentoMes`
- Simple `useMemo` producing an array of strings from existing computed values

**2. Mini Gráfico de Fluxo** (after Movimentação do Mês card, ~line 475)
- Small `AreaChart` (height ~120px) using Recharts
- Data: group current month's `filteredReceitas` and `filteredDespesas` by day (1-31)
- 3 areas: Receitas (green), Despesas (red), Saldo acumulado (blue/primary)
- `useMemo` that iterates days 1..today, sums transactions per day, computes running balance
- Minimal styling: no legend, simple tooltip, `CartesianGrid` with dashes

**3. Insight Financeiro** (after Alertas Financeiros, before Saúde Financeira, ~line 505)
- Card showing **one** smart insight (the most relevant)
- Priority logic in a `useMemo`:
  1. Deficit: `despesasMesTotal > faturamentoMes` → danger message
  2. High expenses: `despesaPercent > 80` → warning message
  3. Good savings: savings rate > 20% → success message
  4. Revenue growth: `prevMonth.varFat > 10` → success message
  5. Fallback: neutral tip about tracking expenses
- Shows icon, colored badge, title, and description
- Only the first matching insight is displayed

**4. Visual adjustments**
- Increase `space-y-5` to `space-y-6` on root container for better breathing room
- Ensure all new cards use consistent padding (`p-4` or `p-5`)

### Final Dashboard Order
```text
Header + CTAs
Financial View Selector
1. Saldo do Mês (hero)
2. Resumo do Mês (NEW)
3. Movimentação do Mês
4. Mini Gráfico de Fluxo (NEW)
5. Alertas Financeiros
6. Insight Financeiro (NEW)
7. Saúde Financeira
8. Taxa de Poupança
9. Banner MEI / Company info
--- Separator ---
10. Insights Financeiros (existing detailed)
11. Charts
12. Meta + Resumo
13. Recent lists
```

### No new files or dependencies needed
All components use existing Recharts imports and existing computed data.

