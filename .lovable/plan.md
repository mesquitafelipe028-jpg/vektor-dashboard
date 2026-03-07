

## Plano: Conectar categorias do banco aos formulários de Receitas e Despesas

### Problema
O `TransactionFormSheet` usa arrays hardcoded (`expenseCategories`/`revenueCategories`) de `@/lib/categories.ts` para a grade de seleção de categoria. As categorias customizadas do banco de dados (tabela `categorias`) não são utilizadas.

### Solução

**1. `src/components/transaction/TransactionFormSheet.tsx`**
- Adicionar prop opcional `customCategories?: CategoryMeta[]` para receber categorias convertidas do banco
- Na `CategoryGrid` (linha 466), usar `customCategories` quando disponível, com fallback para os arrays hardcoded

**2. `src/hooks/useCategories.ts`**
- Adicionar função utilitária `toCategoryMeta()` que converte `CategoriaDB` para `CategoryMeta` (mapeando `cor` → classes Tailwind via `colorMap` de `categoryColors.ts`, e `icone` → componente Lucide)
- Exportar essa função para uso nas páginas

**3. `src/pages/Expenses.tsx`**
- Importar `useCategories` e `toCategoryMeta`
- Buscar categorias tipo "despesa" do banco
- Converter para `CategoryMeta[]` e passar como `customCategories` ao `TransactionFormSheet`

**4. `src/pages/Revenues.tsx`**
- Mesmo padrão: importar hook, buscar categorias tipo "receita", converter e passar ao formulário

### Arquivos a editar
- `src/hooks/useCategories.ts` — adicionar `toCategoryMeta` helper
- `src/components/transaction/TransactionFormSheet.tsx` — nova prop `customCategories`
- `src/pages/Expenses.tsx` — integrar categorias do banco
- `src/pages/Revenues.tsx` — integrar categorias do banco

