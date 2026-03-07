

## Plano: Corrigir rolagem travada no formulário mobile de Nova Receita/Despesa

### Problema
O formulário de transação abre em um `Sheet` (Radix Dialog) com `side="bottom"` no mobile. O Radix aplica `overflow: hidden` e `position: fixed` no `<body>` via scroll lock (`data-scroll-locked`), o que impede que o toque role o conteúdo interno. Mesmo com `overflow-y-auto` no div interno, em dispositivos touch o scroll lock do body intercepta os eventos de toque, travando a rolagem.

### Causa raiz
1. O Radix Dialog aplica `overflow: hidden` no `<body>` quando aberto
2. Em dispositivos touch, isso pode bloquear a propagação de eventos de scroll para elementos internos
3. O CSS `overflow-y-auto` sozinho não é suficiente — precisa de `-webkit-overflow-scrolling: touch` e `touch-action: pan-y` para garantir que o scroll funcione em iOS/Android
4. O `SheetContent` no `sheet.tsx` tem `p-6` padrão que é sobrescrito, mas o layout flex pode não propagar corretamente a altura

### Mudanças propostas

**1. `src/components/transaction/TransactionFormSheet.tsx`**
- No div scrollável (linha 206), adicionar `touch-action: pan-y` e `-webkit-overflow-scrolling: touch` via style inline para garantir scroll nativo em touch
- Adicionar `overscroll-behavior-y: contain` para evitar que o scroll "escape" para o body
- Mover `pb-[env(safe-area-inset-bottom)]` para um div interno para não interferir com o cálculo de altura do flex

```tsx
// Linha 206 — antes:
<div className="flex-1 overflow-y-auto min-h-0 pb-[env(safe-area-inset-bottom)]">

// Depois:
<div 
  className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
>
  {/* ... conteúdo do form ... */}
  <div className="pb-[env(safe-area-inset-bottom)]" />
</div>
```

**2. `src/components/ui/sheet.tsx`**
- No `SheetContent`, adicionar `onOpenAutoFocus` com `e.preventDefault()` para evitar que o foco automático cause problemas de scroll em mobile
- Garantir que o variant `bottom` não tenha estilos conflitantes

**3. `src/index.css`**
- Adicionar regra CSS global para quando o Radix scroll lock estiver ativo, permitir scroll em elementos internos:
```css
[data-scroll-locked] [data-radix-scroll-area-viewport],
[data-scroll-locked] .overflow-y-auto {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

### Arquivos a editar
- `src/components/transaction/TransactionFormSheet.tsx` — scroll touch no div interno
- `src/components/ui/sheet.tsx` — prevenir auto-focus problemático  
- `src/index.css` — regra global para scroll dentro de modais Radix

### Resultado
O formulário será rolável em todas as telas (celular, tablet, desktop), permitindo acesso a todos os campos incluindo "Tipo de Conta" que fica na parte inferior.

