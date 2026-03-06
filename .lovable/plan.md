

## Problema

A tela branca no mobile ocorre por dois fatores principais:

1. **Google Fonts bloqueante** — A linha `@import url('https://fonts.googleapis.com/css2?...')` no `index.css` bloqueia toda a renderização CSS até o download completo das fontes. Em conexões móveis lentas (3G/4G instável), isso causa vários segundos de tela branca.

2. **Nenhum conteúdo visual antes do React montar** — O `index.html` tem apenas `<div id="root"></div>` sem nenhum indicador visual. Até o JS carregar, compilar e montar o React + Suspense + AuthProvider (que faz chamada ao Supabase), o usuário vê branco absoluto.

3. **Dashboard pesado** — 617 linhas com recharts (BarChart, PieChart), framer-motion, múltiplas queries Supabase. Tudo carrega antes de mostrar algo útil.

## Solução

### 1. Fontes não-bloqueantes (`index.html`)
Mover o carregamento de fontes do `@import` CSS para `<link rel="preload">` + `font-display: swap` no HTML. Isso permite que o browser renderize imediatamente com fontes do sistema e troque quando as fontes carregarem.

- Remover `@import url(...)` do `index.css`
- Adicionar no `<head>` do `index.html`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'" />
  ```

### 2. Splash screen inline no HTML (`index.html`)
Adicionar um indicador de carregamento direto no `<div id="root">` que aparece instantaneamente e é substituído quando o React monta:

```html
<div id="root">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f7f5">
    <div style="text-align:center">
      <svg ...>⚡</svg>
      <p style="color:#1a7a5a;font-size:14px;margin-top:12px">Carregando...</p>
    </div>
  </div>
</div>
```

### 3. Lazy-load recharts no Dashboard (`src/pages/Dashboard.tsx`)
Os gráficos (recharts) são pesados e não precisam carregar antes do conteúdo principal. Renderizar os gráficos apenas após os dados estarem prontos, usando `lazy()` para o bloco de charts ou renderização condicional para adiar os componentes pesados.

### Arquivos a editar
1. **`index.html`** — Splash screen inline + preload de fontes
2. **`src/index.css`** — Remover `@import` de fontes (linha 1)
3. **`src/pages/Dashboard.tsx`** — Adiar renderização de gráficos recharts

