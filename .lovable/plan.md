

## Plano: Corrigir CategoryIcon para usar categorias do banco de dados

### Problema
O componente `CategoryIcon` busca ícones e cores **apenas** dos arrays hardcoded em `@/lib/categories.ts`. Como as categorias agora vivem no banco de dados (tabela `categorias`), os ícones e cores exibidos nas listas de transações não correspondem às categorias customizadas do usuário.

### Solução
Atualizar `CategoryIcon` para usar o hook `useCategories` internamente, buscando ícone e cor do banco de dados. Fallback para os arrays hardcoded caso não encontre no banco.

### Arquivos a editar

**1. `src/components/CategoryIcon.tsx`**
- Importar `useCategories` e `toCategoryMeta` do hook, além do `iconMap`
- Chamar `useCategories()` (sem filtro de tipo) para ter todas as categorias
- Flatten a hierarquia (pais + subcategorias) e buscar pelo `nome` que bate com `category`
- Se encontrar no banco → usar ícone e cor do banco (via `toCategoryMeta`)
- Se não encontrar → fallback atual (arrays hardcoded)

**2. `src/pages/Dashboard.tsx`** (ajuste menor)
- Na linha 693, `CategoryIcon` recebe `r.descricao` em vez de `r.categoria` para receitas — corrigir para usar `r.categoria` ou `r.forma_pagamento` consistentemente (se a coluna `categoria` existir na tabela receitas)

### Resultado
Todas as páginas que usam `CategoryIcon` (Dashboard, Expenses, Revenues, Reports, FinancialAnalysis) passarão automaticamente a exibir os ícones e cores corretos do banco de dados.

