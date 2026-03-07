

## Plano: Corrigir ícones de categoria que não aparecem

### Diagnóstico

Analisei o código e identifiquei os problemas:

1. **Dashboard — Receitas**: O `CategoryIcon` recebe `r.forma_pagamento` (ex: "PIX", "Boleto", "Transferência") como categoria, mas o mapa `revenueCategoryIcons` não tem essas chaves. Resultado: sempre cai no fallback `Banknote`, que até renderiza mas não corresponde à categoria real. O correto seria usar a categoria da receita (se existir no schema) ou mapear formas de pagamento.

2. **Receitas page**: Mesmo problema — usa `r.forma_pagamento` em vez de uma categoria de receita.

3. **Mapa de ícones incompleto**: Algumas categorias usadas no sistema (`expenseCategories` em mockData) não estão no mapa de ícones. Exemplo: "Entretenimento" está mapeado mas "Software/Assinaturas" e "Internet/Telefone" estão. Porém, categorias de receita do mockData como "Prestação de Serviço" estão no mapa.

4. **Possível invisibilidade visual**: Os ícones usam cores com opacidade muito baixa no background (`bg-emerald-500/10`) que em certos temas podem ser quase invisíveis. Isso pode dar a impressão de "não aparecer".

### Correções planejadas

**Arquivo: `src/lib/categories.ts`**
- Adicionar mapeamento de formas de pagamento (PIX, Boleto, Transferência, Dinheiro, Cartão) com ícones correspondentes
- Garantir que todas as categorias de `expenseCategories` e `revenueCategories` do mockData tenham ícones mapeados

**Arquivo: `src/components/CategoryIcon.tsx`**
- Aumentar opacidade do background de `/10` para `/15` ou `/20` para melhor visibilidade
- Adicionar suporte ao tipo de transação para buscar no mapa correto (incluindo formas de pagamento)

**Arquivo: `src/pages/Dashboard.tsx`**
- Corrigir: receitas devem mostrar ícone baseado na categoria real, não em `forma_pagamento`

**Arquivo: `src/pages/Revenues.tsx`**
- Mesmo ajuste: usar categoria de receita no `CategoryIcon`

### Detalhes técnicos

Adicionar ao `categories.ts`:
```ts
const paymentMethodIcons: Record<string, LucideIcon> = {
  "PIX": Zap,
  "Boleto": FileText, 
  "Transferência": ArrowRightLeft,
  "Dinheiro": Banknote,
  "Cartão": CreditCard,
  "Cartão de Crédito": CreditCard,
  "Cartão de Débito": CreditCard,
};
```

Verificar schema da tabela `receitas` no Supabase para confirmar se existe campo `categoria` disponível além de `forma_pagamento`.

