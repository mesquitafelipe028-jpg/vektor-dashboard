

## Plano: Corrigir INP no SidebarContent

### Problema

O elemento `SidebarContent` (`div.flex.min-h-0.flex-1.flex-col.gap-2.overflow-auto`) está bloqueando a UI por 248ms. O `overflow-auto` nesse container faz o browser recalcular layout ao processar eventos de scroll/interação nos itens filhos (NavLinks).

### Causa raiz

O `SidebarContent` usa `overflow-auto` que, combinado com muitos itens de menu e transições CSS do sidebar (`transition-[width] duration-200`), causa reflows caros durante interações. Cada clique num item do menu dispara recálculos de layout no container scrollável.

### Solução

1. **`src/components/ui/sidebar.tsx`** (SidebarContent, ~linha 334)
   - Trocar `overflow-auto` por `overflow-y-auto` para limitar reflows ao eixo vertical
   - Adicionar `will-change-transform` para promover o elemento a sua própria camada de composição, isolando repaints
   - Adicionar `contain: layout` via style inline para limitar o escopo de recálculos de layout

2. **`src/components/layout/AppSidebar.tsx`**
   - Memoizar os arrays `mainItems` e `configItems` (já são `const` fora do componente — ok)
   - Wrap `handleLogout` com `useCallback`
   - Memoizar a função `isActive` com `useCallback`

3. **`src/components/ui/sidebar.tsx`** (Sidebar transition, ~linha 195)
   - Na div fixa do sidebar desktop, trocar `transition-[left,right,width]` por `transition-[transform,width]` usando `translate-x` em vez de `left`/`right` para animações mais performáticas (composite-only)

### Arquivos a editar
1. `src/components/ui/sidebar.tsx` — Otimizar SidebarContent e transição do Sidebar
2. `src/components/layout/AppSidebar.tsx` — Memoizar callbacks

