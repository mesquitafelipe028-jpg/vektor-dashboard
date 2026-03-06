

## Diagnostico

Analisei o video e o codigo. O splash screen inline ja esta implementado no `index.html`, as fontes ja sao non-blocking, e o Dashboard ja usa lazy-load para os graficos. Porem, o problema de lentidao persiste por dois motivos principais:

1. **Landing page carrega framer-motion de forma sincrona** — A pagina inicial (`/`) importa `motion` do framer-motion diretamente. Em mobile, esse bundle e pesado e bloqueia a renderizacao.

2. **AuthProvider bloqueia toda a arvore** — O `AuthProvider` faz `supabase.auth.getSession()` + `onAuthStateChange` antes de renderizar qualquer conteudo. Como ele envolve TODAS as rotas (incluindo Landing, Login), mesmo paginas publicas ficam bloqueadas ate o Supabase responder.

3. **ProtectedRoute mostra skeleton pesado** — Quando o `loading` esta `true`, renderiza um skeleton complexo. Mas o problema real e que o `loading` depende de uma chamada de rede ao Supabase.

4. **Dashboard.tsx tem 557 linhas com 5 queries Supabase simultaneas** — Todas disparam ao mesmo tempo, e o componente so renderiza apos `loadingReceitas` e `loadingDespesas` completarem, mostrando skeleton ate la.

## Solucao

### 1. Nao bloquear paginas publicas com auth (`AuthContext.tsx`)
Otimizar o `AuthProvider` para definir `loading = false` mais rapidamente. Usar `getSession()` como fonte primaria e nao esperar o `onAuthStateChange` para desbloquer a renderizacao.

### 2. Dashboard — renderizacao progressiva (`Dashboard.tsx`)
Em vez de mostrar skeleton completo ate TODAS as queries carregarem, renderizar cada secao independentemente conforme os dados chegam. Remover o bloco `if (isLoading) return <Skeleton...>` e usar skeletons inline por secao.

### 3. Landing page — reduzir peso inicial (`Landing.tsx`)
Substituir `motion.div` por elementos HTML simples com CSS animations, eliminando o framer-motion do bundle da landing page (que e a primeira coisa que carrega).

### 4. Prefetch da sessao no HTML (`index.html`)
Adicionar `<link rel="preconnect">` para o dominio do Supabase para que a conexao TCP/TLS comece antes do JS carregar.

### Arquivos a editar
1. **`src/contexts/AuthContext.tsx`** — Otimizar fluxo de loading
2. **`src/pages/Dashboard.tsx`** — Renderizacao progressiva (remover skeleton bloqueante)
3. **`src/pages/Landing.tsx`** — Remover framer-motion, usar CSS animations
4. **`index.html`** — Preconnect ao Supabase

