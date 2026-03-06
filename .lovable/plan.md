

## Diagnóstico

O Dashboard faz **5 queries simultâneas ao Supabase** (receitas, despesas, impostos_mei, metas_financeiras, empresas) e todas precisam resolver antes de renderizar conteúdo útil. No mobile, a latência de rede é maior, agravando o problema.

Além disso:
- **Todas as páginas são importadas estaticamente** no `App.tsx` — o bundle inicial é pesado
- **Não há skeleton/loading** no Dashboard enquanto os dados carregam — o usuário vê uma tela vazia
- O `ProtectedRoute` mostra apenas um spinner genérico, sem feedback contextual
- O `QueryClient` não tem `staleTime` configurado, causando re-fetches desnecessários

## Plano de Implementação

### 1. Lazy Loading das páginas (App.tsx)
Converter todos os imports de páginas para `React.lazy()` com `Suspense`, reduzindo o bundle inicial drasticamente. Apenas a página sendo acessada será carregada.

### 2. Skeleton loading no Dashboard
Adicionar um componente `DashboardSkeleton` que mostra placeholders visuais (cards, gráficos) enquanto os dados carregam, dando feedback imediato ao usuário em vez de tela vazia.

- Detectar `isLoading` das queries
- Mostrar skeletons nos cards de saldo, stats, gráficos e listas

### 3. Configurar QueryClient com staleTime e cacheTime
Definir `staleTime: 5 * 60 * 1000` (5 min) para evitar re-fetches desnecessários ao navegar entre páginas. Os dados financeiros não mudam a cada segundo.

### 4. Melhorar o loading do ProtectedRoute
Substituir o spinner genérico por um skeleton do layout completo (header + sidebar/bottom nav + área de conteúdo), para que o usuário perceba que o app está carregando e não travado.

### Arquivos a editar
- `src/App.tsx` — lazy imports + Suspense + QueryClient config
- `src/pages/Dashboard.tsx` — skeleton loading states
- `src/components/ProtectedRoute.tsx` — loading skeleton melhorado

