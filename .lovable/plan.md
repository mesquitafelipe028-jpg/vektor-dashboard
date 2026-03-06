

## Plano: Conectar todas as páginas restantes ao Supabase

Quatro páginas ainda usam dados mockados e precisam ser migradas para dados reais.

### Estado atual
- **Conectados:** Dashboard, Receitas, Despesas, Clientes
- **Ainda com mock:** Impostos (Taxes), Fluxo de Caixa (CashFlow), Relatórios (Reports), Configurações (Settings)

---

### 1. Impostos MEI (`src/pages/Taxes.tsx`)
- Substituir dados hardcoded por queries na tabela `impostos_mei`
- CRUD completo: listar guias DAS, marcar como pago, adicionar nova competencia
- Calcular faturamento anual real somando `receitas` do ano corrente
- Card de limite MEI (R$ 81.000) com progresso baseado em dados reais

### 2. Fluxo de Caixa (`src/pages/CashFlow.tsx`)
- Substituir `mockMonthlyData` e `saldo` por queries nas tabelas `receitas` e `despesas`
- Calcular saldo atual (total receitas - total despesas) em tempo real
- Gráfico de fluxo mensal e resumo por mes com dados reais agrupados por mes

### 3. Relatórios (`src/pages/Reports.tsx`)
- Substituir `mockMonthlyData` e `mockTransactions` por queries reais
- Gráfico Receitas vs Despesas com dados agrupados por mês
- Gráfico de pizza de despesas por categoria usando dados reais da tabela `despesas`
- Resumo do período com últimos 3 meses calculados dinamicamente

### 4. Configurações (`src/pages/Settings.tsx`)
- Carregar dados do perfil da tabela `profiles` via `useQuery`
- Salvar alterações de nome via `useMutation` (update na tabela `profiles`)
- Email preenchido via `useAuth()` (read-only, vem do auth)
- Alterar senha via `supabase.auth.updateUser({ password })`

### 5. Dashboard - Imposto pendente (`src/pages/Dashboard.tsx`)
- Substituir `impostoPendente` mockado por query na tabela `impostos_mei` filtrando status pendente

### 6. Limpeza (`src/lib/mockData.ts`)
- Remover exports de mock que não são mais usados (manter apenas `formatCurrency`, `formatDate`, categorias)

### Arquivos afetados
- `src/pages/Taxes.tsx` — reescrita com CRUD real
- `src/pages/CashFlow.tsx` — reescrita com queries reais
- `src/pages/Reports.tsx` — reescrita com queries reais
- `src/pages/Settings.tsx` — reescrita com perfil e auth
- `src/pages/Dashboard.tsx` — remover import de mock de imposto
- `src/lib/mockData.ts` — limpeza de dados mock não utilizados

