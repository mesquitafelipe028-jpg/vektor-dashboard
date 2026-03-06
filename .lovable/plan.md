

## Plano: Unificar Relatórios e Relatório Mensal em uma única página

### Análise da duplicação

As duas páginas compartilham:
- Mesmas queries (receitas/despesas)
- Gráfico de pizza "Despesas por Categoria" (duplicado)
- Dados de comparação mensal

A página **MonthlyReport** é mais completa (seletor de mês, comparação com mês anterior, indicadores de saúde). A **Reports** tem o gráfico de barras dos últimos 6 meses e o resumo dos últimos 3 meses que não existem no MonthlyReport.

### Solução

Unificar tudo em **uma única página `Reports.tsx`** usando **Tabs**: "Visão Geral" e "Análise Mensal".

**Tab "Visão Geral"** (conteúdo do antigo Reports):
- Gráfico de barras Receitas vs Despesas (6 meses)
- Resumo do período (últimos 3 meses com receitas/despesas/saldo)

**Tab "Análise Mensal"** (conteúdo do antigo MonthlyReport):
- Seletor de mês
- Cards de faturamento/despesas/lucro com variação
- Percentual de despesas + Maior categoria
- Gráfico de pizza por categoria (fica apenas aqui, removendo a duplicata)
- Painel de Saúde Financeira (indicadores de 6 meses)

### Arquivos a alterar

1. **`src/pages/Reports.tsx`** — Reescrever unificando ambas as páginas com Tabs
2. **Deletar `src/pages/MonthlyReport.tsx`**
3. **`src/App.tsx`** — Remover rota `/relatorio-mensal` e import do MonthlyReport
4. **`src/components/layout/AppSidebar.tsx`** — Remover item "Relatório Mensal" do menu
5. **`src/pages/More.tsx`** — Remover item "Rel. Mensal" do grid, ficando apenas "Relatórios"

### Responsividade
- Tabs empilham naturalmente no mobile
- Grids usam `grid-cols-1` no mobile, expandem no desktop
- Gráficos com `ResponsiveContainer` e alturas adaptáveis (`h-52 sm:h-72`)
- Seletor de mês ocupa largura total no mobile (`w-full sm:w-48`)

