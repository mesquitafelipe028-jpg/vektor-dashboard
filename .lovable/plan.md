

## Plano: Corrigir INP de 208ms nos spans do menu

### Problema

Os `<span>` dentro dos `NavLink` na sidebar herdam event handlers pesados. Quando o usuário clica num span (texto do menu), o browser processa: className function do NavLink (chamada `cn()` com lógica `isActive/isPending`), navegação do React Router, e re-render de todo o sidebar.

### Causa raiz

1. A função `className` do `RouterNavLink` é recalculada a cada render — `cn()` é chamada inline
2. O `{!collapsed && <span>}` causa conditional rendering que força reconciliação extra
3. Cada `NavLink` recria a função className a cada render (não memoizada)

### Solução

1. **`src/components/layout/AppSidebar.tsx`**
   - Extrair cada item de menu para um componente `React.memo`-izado (`SidebarNavItem`) que só re-renderiza quando `isActive` ou `collapsed` mudam
   - Remover os spans condicionais — deixar o texto sempre presente e usar CSS (`group-data-[collapsible=icon]:hidden`) para ocultar, evitando reconciliação DOM

2. **`src/components/NavLink.tsx`**
   - Memoizar a função `className` com `useMemo`/`useCallback` para evitar recriação a cada render

### Arquivos a editar
1. `src/components/layout/AppSidebar.tsx` — Extrair `SidebarNavItem` com `React.memo`, remover conditional spans
2. `src/components/NavLink.tsx` — Memoizar className callback

