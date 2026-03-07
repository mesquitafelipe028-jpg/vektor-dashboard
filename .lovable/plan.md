

## Plano: Página de Categorias editáveis com subcategorias + cores individuais nas listas

### Resumo
Criar uma página dedicada para gerenciar categorias (despesa e receita) com subcategorias editáveis, e corrigir as listas de transações para exibir cores da categoria em vez de cores genéricas do tipo.

### 1. Migration — Expandir tabela `categorias`

A tabela `categorias` atual só tem `nome` e `user_id`. Precisa de novos campos:

```sql
ALTER TABLE categorias 
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('despesa', 'receita')),
  ADD COLUMN icone TEXT DEFAULT 'Package',
  ADD COLUMN cor TEXT DEFAULT 'gray',
  ADD COLUMN categoria_pai_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  ADD COLUMN ordem INT DEFAULT 0;
```

- `tipo`: despesa ou receita
- `icone`: nome do ícone Lucide (ex: "Utensils", "Car")
- `cor`: nome base da cor (ex: "orange", "blue", "rose") — usado para gerar classes Tailwind
- `categoria_pai_id`: referência para subcategorias (NULL = categoria principal)
- `ordem`: ordem de exibição

RLS já está habilitado. Política existente permite CRUD para o próprio user.

### 2. Seed de categorias padrão

Ao abrir a página pela primeira vez (ou via botão "Restaurar padrão"), inserir as categorias do `categories.ts` como dados do usuário no Supabase, com suas cores e ícones.

### 3. Nova página `src/pages/Categories.tsx`

**Layout:**
- Tabs: "Despesas" | "Receitas"
- Lista de categorias com:
  - Ícone colorido + nome + botões editar/excluir
  - Botão para expandir subcategorias
  - Subcategorias indentadas abaixo da categoria pai
- Botão "Nova Categoria" e "Nova Subcategoria" (dentro de cada categoria)
- Modal de edição: nome, ícone (grade de ícones Lucide disponíveis), cor (paleta com ~12 cores)
- Botão "Restaurar Padrão" no rodapé

### 4. Hook `useCategories`

Criar `src/hooks/useCategories.ts`:
- Query para buscar categorias do usuário (com subcategorias)
- Mutations para criar, editar, excluir
- Função de seed (inserir padrão se vazio)
- Exportar lookup functions: `getCategoryMeta(nome, tipo)` → retorna ícone + cor

### 5. Atualizar navegação

- **`AppSidebar.tsx`**: Adicionar "Categorias" no grupo "Sistema" (ícone `Tag`)
- **`More.tsx`**: Adicionar "Categorias" no grupo "Sistema"
- **`App.tsx`**: Adicionar rota `/categorias`

### 6. Corrigir cores nas listas de transações

Atualmente `CategoryIcon` usa `transactionColors[type]` (cor genérica do tipo). Precisa usar a cor individual da categoria.

- **`src/components/CategoryIcon.tsx`**: Atualizar para buscar cor da categoria dos metadados (primeiro do array hardcoded `expenseCategories`/`revenueCategories`, depois do banco via prop). Usar `bg` e `color` da `CategoryMeta` encontrada em vez do `transactionColors` genérico.
- **`src/pages/Expenses.tsx`** e **`src/pages/Revenues.tsx`**: As listas já usam `CategoryIcon` — a correção nesse componente propaga automaticamente.

### 7. Atualizar `TransactionFormSheet`

- Buscar categorias do banco (via hook) em vez de usar arrays hardcoded
- Fallback para arrays hardcoded se o usuário não tiver categorias salvas

### Arquivos a criar
- Migration SQL (nova migration)
- `src/pages/Categories.tsx`
- `src/hooks/useCategories.ts`

### Arquivos a editar
- `src/App.tsx` — rota `/categorias`
- `src/components/layout/AppSidebar.tsx` — link no menu
- `src/pages/More.tsx` — link no menu mobile
- `src/components/CategoryIcon.tsx` — usar cores da categoria
- `src/components/transaction/TransactionFormSheet.tsx` — integrar categorias do banco
- `src/lib/categories.ts` — exportar mapa cor→classes para lookup

