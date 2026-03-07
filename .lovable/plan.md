

## Plano: Categorias em grade visual com ícones coloridos

### O que muda

Substituir o dropdown de categoria atual (Select) por uma **grade clicável** com ícones coloridos dentro do formulário de transação, tanto para despesas quanto receitas.

### Mudanças

**1. Atualizar `src/lib/categories.ts`**
- Adicionar cores individuais por categoria (bg + text) para despesas e receitas
- Exportar arrays de categorias com metadados (nome, ícone, cor) para uso na grade

**2. Atualizar `src/components/transaction/TransactionFormSheet.tsx`**
- Substituir o `<Select>` de categoria por uma grade de ícones (grid 4 colunas em mobile, 5 em desktop)
- Cada item: círculo colorido com ícone + nome abaixo, com borda/destaque ao selecionar
- A seção de categoria fica visível (não precisa expandir), clicável diretamente
- Para receitas: adicionar campo de categoria com as categorias de receita na mesma grade
- Manter badge "Sugerida" quando a auto-categorização sugerir uma

**3. Atualizar `src/pages/Revenues.tsx`**
- Passar `categories` (receita) e `suggestedCategory` para o TransactionFormSheet, já que atualmente só despesas passam categorias

### Layout da grade

```text
┌──────────────────────────────┐
│ 🏷 Categoria                │
│                              │
│  🍽  🚗  🏠  ❤️           │
│ Alim Trans Alug Saúde       │
│                              │
│  🎓  🎮  💻  📱           │
│ Educ Lazer Tech  Net        │
│                              │
│  📢  📝  🧾  📦           │
│ Mktg  Mat  Imp  Outr        │
└──────────────────────────────┘
```

Cada ícone tem sua cor própria (ex: Alimentação = laranja, Transporte = azul, Saúde = rosa).

### Arquivos a editar
- `src/lib/categories.ts` — adicionar cores por categoria
- `src/components/transaction/TransactionFormSheet.tsx` — grade visual
- `src/pages/Revenues.tsx` — passar categorias de receita

