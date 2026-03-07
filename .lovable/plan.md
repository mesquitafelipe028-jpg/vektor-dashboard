

## Plano: Corrigir rolagem travada no formulário mobile

### Problema
No mobile, o `SheetContent` usa `side="bottom"` com `h-[92vh]`, mas o Sheet do Radix aplica estilos que impedem a rolagem interna. O `formContent` tem `overflow-y-auto` no div interno (linha 206), porém o container pai (`SheetContent`) não permite que ele ocupe o espaço disponível corretamente — o conteúdo fica cortado ao expandir categoria ou recorrência.

### Causa raiz
O `SheetContent` com `side="bottom"` no `sheet.tsx` tem `p-6` de padding padrão e não possui `overflow-hidden` ou flex layout adequado. Quando o formulário cresce (categorias abertas), o conteúdo excede o viewport e não rola.

### Mudanças

**1. `src/components/transaction/TransactionFormSheet.tsx` (linha 504)**
- Adicionar `overflow-hidden flex flex-col` ao SheetContent para garantir que o layout flex funcione e o `overflow-y-auto` interno seja respeitado:
```tsx
<SheetContent side="bottom" className="h-[92vh] p-0 rounded-t-2xl overflow-hidden flex flex-col">
```

**2. `src/components/ui/sheet.tsx`**
- No variant `bottom`, garantir que não haja `max-height` implícito e que o safe-area-inset-bottom seja respeitado com `pb-[env(safe-area-inset-bottom)]`

**3. `src/components/transaction/TransactionFormSheet.tsx` (linha 188)**
- O wrapper `formContent` já tem `flex flex-col h-full` — verificar que `h-full` funcione dentro do Sheet. Adicionar `min-h-0` para permitir que o flex-child com `overflow-y-auto` encolha corretamente:
```tsx
<div className="flex flex-col h-full min-h-0">
```
- No div de scroll (linha 206), adicionar `min-h-0` também:
```tsx
<div className="flex-1 overflow-y-auto min-h-0 pb-[env(safe-area-inset-bottom)]">
```

### Resultado
O formulário mobile será totalmente rolável, permitindo acesso a todos os campos mesmo com categorias e recorrência expandidas.

