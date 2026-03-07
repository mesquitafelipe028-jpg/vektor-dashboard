

## Plano: Corrigir seleção e persistência de categoria em Receitas e Despesas

### Problema raiz
1. **Receitas**: A tabela `receitas` no banco **não possui coluna `categoria`**. Quando o usuário seleciona uma categoria no formulário, ela não é salva. Ao editar, volta como vazia.
2. **Receitas**: O `upsert` não inclui `categoria` no payload enviado ao Supabase.
3. **Receitas**: O `openEdit` não carrega `categoria` do registro (porque não existe no banco).
4. **CategoryIcon em Receitas**: Usa `r.forma_pagamento` (método de pagamento) em vez de `r.categoria`.

### Arquivos a editar

**1. Nova migration SQL** (`supabase/migrations/...add_categoria_to_receitas.sql`)
- `ALTER TABLE receitas ADD COLUMN categoria text;`

**2. `src/types/transactions.ts`**
- Adicionar `categoria: string | null` ao `ReceitaExtended`

**3. `src/pages/Revenues.tsx`**
- Adicionar `categoria` ao payload do `upsert` (tanto no insert recorrente quanto no insert/update único): `categoria: form.categoria || null`
- No `openEdit`, carregar `categoria: r.categoria ?? ""`
- No `CategoryIcon` da tabela, trocar `r.forma_pagamento ?? r.descricao` por `r.categoria ?? r.descricao`

**4. `src/pages/Expenses.tsx`** (verificação)
- O CategoryIcon já usa `d.categoria` — OK
- O upsert já inclui `categoria` — OK

### Resultado
A categoria selecionada no formulário será salva no banco, exibida corretamente na lista e pré-selecionada ao editar, tanto para receitas quanto despesas.

