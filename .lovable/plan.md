

## Audit Summary: Supabase Connections

After analyzing all pages, hooks, and data flows, the system is **mostly well-connected**. All modules (Receitas, Despesas, Clientes, Contas, Cartões, Metas, Impostos, Categorias, Investimentos) correctly use the Supabase client for CRUD operations.

However, I found **2 concrete issues** to fix:

---

### Issue 1: "Começar do zero" (Clear Data) is incomplete

In `Settings.tsx` line 186, the `clearData` function only deletes from 7 tables:

```text
Current:  receitas, despesas, clientes, categorias, impostos_mei, empresas, metas_financeiras
```

**Missing tables** (data would survive a reset):
- `contas_financeiras` (bank accounts)
- `cartoes_credito` (credit cards)
- `compras_cartao` (card purchases)
- `faturas_cartao` (card invoices)
- `investimento_ativos` (investment assets)
- `investimento_dividendos` (dividends)
- `depositos_meta` (goal deposits — must be deleted BEFORE `metas_financeiras` due to FK)
- `user_preferences` (user settings)

**Fix**: Update the `clearData` mutation to include all tables in the correct order (child tables first to avoid FK violations).

---

### Issue 2: Inconsistent query keys reduce cache reliability

Several queries use the same key across pages but some include `user?.id` and others don't:

- Dashboard: `["receitas"]`, `["despesas"]` — no `user_id`
- Revenues: `["receitas"]` — no `user_id`  
- Accounts hook: `["contas_financeiras", user?.id]` — with `user_id`

This is not a bug (RLS handles filtering), but inconsistency means cache invalidation may not work perfectly across modules. 

**Fix**: Standardize query keys to always include `user?.id` for user-scoped data. This ensures proper cache isolation and invalidation.

---

### Files to modify

1. **`src/pages/Settings.tsx`** — Add missing tables to `clearData`, ordered correctly (child → parent)
2. **`src/pages/Revenues.tsx`** — Add `user?.id` to query keys for `receitas` and `clientes`
3. **`src/pages/Expenses.tsx`** — Add `user?.id` to query key for `despesas`
4. **`src/pages/Dashboard.tsx`** — Add `user?.id` to query keys for `receitas`, `despesas`, `impostos_mei_pendente`, `metas_financeiras`
5. **`src/pages/CashFlow.tsx`** — Add `user?.id` to query keys
6. **`src/pages/Clients.tsx`** — Add `user?.id` to query keys
7. **`src/pages/CreditCards.tsx`** — Add `user?.id` to query keys
8. **`src/pages/Goals.tsx`** — Add `user?.id` to query keys
9. **`src/pages/Taxes.tsx`** — Add `user?.id` to query keys
10. **`src/pages/Reports.tsx`** — Add `user?.id` to query keys

All invalidation calls (`queryClient.invalidateQueries`) will also be updated to match the new keys where necessary.

