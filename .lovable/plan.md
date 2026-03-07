

## Plan: Add 3 Key Financial Indicator Cards to Dashboard Top

### What Changes

Add three new highlight cards between the Financial View Selector and the Financial Alerts section in `src/pages/Dashboard.tsx`:

1. **Faturamento MEI no mês** — Sum of all `receitas` where `tipo_conta === 'mei'` in current month
2. **Lucro MEI no mês** — MEI revenues minus MEI expenses in current month
3. **Taxa de poupança pessoal** — `((pessoal revenues - pessoal expenses) / pessoal revenues) * 100`%, displayed as percentage

### Technical Details

**File: `src/pages/Dashboard.tsx`**

- Add `useMemo` computations for:
  - `faturamentoMeiMes`: filter `receitas` by `tipo_conta === 'mei'` and current month, sum values
  - `despesasMeiMes`: filter `despesas` by `tipo_conta === 'mei'` and current month, sum values
  - `lucroMeiMes`: `faturamentoMeiMes - despesasMeiMes`
  - `rendaPessoalMes`: filter `receitas` by `tipo_conta === 'pessoal'` and current month, sum values
  - `despesasPessoalMes`: filter `despesas` by `tipo_conta === 'pessoal'` and current month, sum values
  - `taxaPoupanca`: `rendaPessoalMes > 0 ? ((rendaPessoalMes - despesasPessoalMes) / rendaPessoalMes) * 100 : 0`
  - Previous month equivalents for variation arrows

- Add comparison with previous month to show small trend indicator (arrow up/down + percentage change) on each card

- Insert a `grid grid-cols-1 sm:grid-cols-3 gap-4` section after the view selector (line ~292) and before the alerts section (line ~294), with three `Card` components using existing styling patterns

- Each card: icon, title (text-sm muted), large value (text-2xl font-bold), and a small variation badge with `ArrowUpRight`/`ArrowDownRight` icon

- Wrap in skeleton loader when `isLoading` is true

- Uses only existing data already fetched (receitas/despesas queries) — no new API calls needed

