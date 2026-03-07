

## Plano: Reformular formulários de Receitas e Despesas no estilo lista com ícones

### Referência visual
As imagens mostram um layout mobile-first com campos em formato de **lista vertical**, onde cada campo é uma linha com ícone à esquerda, label no meio e valor/ação à direita, separados por divisores. Elementos-chave:
- Descrição (campo de texto)
- Valor (R$)
- Recorrência (linha clicável com chevron → abre configuração)
- Data de Vencimento
- Toggle "Efetivada" (confirma recebimento/pagamento)
- Categoria (com ícone colorido + dropdown)
- Tipo de Conta
- Toggle "Salvar e continuar"

### Mudanças planejadas

**1. Criar componente reutilizável `TransactionFormSheet` (`src/components/transaction/TransactionFormSheet.tsx`)**
- Componente Sheet (drawer) em mobile, Dialog em desktop
- Layout de lista vertical com ícones (Lucide) à esquerda de cada campo
- Separadores entre campos usando `<Separator />`
- Campos organizados na ordem da imagem:
  - Descrição (ícone Menu/AlignLeft)
  - Valor R$ (ícone DollarSign/CircleDollarSign)
  - Recorrência (ícone RefreshCw) — linha clicável que expande/abre configuração de frequência
  - Data de Vencimento (ícone Calendar)
  - Toggle "Efetivada" (ícone CheckCircle2) — mapeia para status "recebido"/"pago" vs "pendente"
  - Categoria (ícone dinâmico baseado na categoria selecionada)
  - Tipo de Conta (ícone Building2)
- Para receitas: campo Cliente antes da categoria
- Para despesas: campo Subcategoria após Categoria; opção "Parcelada" no seletor de recorrência
- Botão "Salvar" no header (estilo da imagem, cor primária para receita verde, despesa vermelha)
- Responsivo: funciona bem em mobile (full-screen sheet) e desktop (dialog centralizado)

**2. Editar `src/pages/Revenues.tsx`**
- Substituir o Dialog atual pelo novo componente TransactionFormSheet
- Adicionar campo `efetivada` (boolean) no form que mapeia para status: efetivada=true → "recebido", false → "pendente"
- Passar props: type="receita", form state, clientes, callbacks

**3. Editar `src/pages/Expenses.tsx`**
- Mesma substituição pelo TransactionFormSheet
- efetivada=true → "pago", false → "pendente"
- Incluir opção "parcelada" no seletor de recorrência
- Manter auto-categorização na descrição

**4. Lógica do toggle "Efetivada"**
- Novo campo no form state: `efetivada: boolean`
- Na mutação de save, mapear: 
  - Receita: efetivada ? "recebido" : "pendente"
  - Despesa: efetivada ? "pago" : "pendente"
- Ao editar, inicializar efetivada baseado no status existente

### Detalhes técnicos do layout

```text
┌─────────────────────────────────┐
│  ✕  Nova Receita      [Salvar] │
├─────────────────────────────────┤
│  ≡  Descrição ................. │
├─────────────────────────────────┤
│  $  R$ 0,00                    │
├─────────────────────────────────┤
│  🔄 Não recorrente          >  │
├─────────────────────────────────┤
│  📅 Data de Vencimento  07/03  │
├─────────────────────────────────┤
│  ✓  Efetivada          [====]  │
├─────────────────────────────────┤
│  Categoria                     │
│  🏷  Fixa                  ▼   │
├─────────────────────────────────┤
│  Tipo de Conta                 │
│  🏛  MEI                   ▼   │
└─────────────────────────────────┘
```

### Arquivos a criar
- `src/components/transaction/TransactionFormSheet.tsx`

### Arquivos a editar
- `src/pages/Revenues.tsx` — substituir Dialog pelo novo componente
- `src/pages/Expenses.tsx` — substituir Dialog pelo novo componente

