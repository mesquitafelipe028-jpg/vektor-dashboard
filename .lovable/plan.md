

## Plan: Fix Dashboard Chart Data & Remove Repeated Information

### Problems Identified

1. **Flow chart incorrect data**: Transaction dates may include time components (e.g., `"2026-03-09T14:00:00"`), but the chart uses strict equality (`r.data === "2026-03-09"`), causing most transactions to be missed. Fix: use `startsWith(dayStr)` instead.

2. **Repeated information** — receitas/despesas values appear in **5 different places**:
   - Saldo do Mês (receitas + despesas inline)
   - Resumo do mês (same values as text)
   - Movimentação do Mês (same values with % variation)
   - Insights Financeiros section (similar analysis from `useFinancialInsights`)
   - DashboardCharts bar chart (receitas vs despesas by month)

### Changes — `src/pages/Dashboard.tsx`

**Fix 1: Flow chart date matching (line ~365)**
- Change `r.data === dayStr` to `r.data.startsWith(dayStr)` for both receitas and despesas in `flowChartData` computation.

**Fix 2: Remove "Resumo do mês" card (lines ~483-504)**
- Delete entirely — the Saldo do Mês hero card already shows faturamento, despesas, and saldo. The text summary is pure repetition.

**Fix 3: Remove duplicate "Insights Financeiros" section (lines ~729-748)**
- Delete the `useFinancialInsights`-powered grid of insight cards. The single "Insight Financeiro" card (line ~609-625) already provides the smart tip. Having both is redundant.
- Remove the `useFinancialInsights` import and call since it's no longer used.

**Fix 4: Remove `resumoTexto` useMemo (lines ~346-356)**
- No longer needed after removing the Resumo card.

### Result
- Dashboard goes from showing receitas/despesas in 5 places to 3 (Saldo hero, Movimentação with trends, and Charts for historical view) — each serving a distinct purpose.
- Flow chart will correctly aggregate daily transactions regardless of date format.
- Cleaner, less repetitive layout.

