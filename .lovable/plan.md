

## Plano: Responsividade Mobile + PWA (App Web Instalável)

O projeto será otimizado para funcionar perfeitamente em telas pequenas e configurado como Progressive Web App (PWA), permitindo instalação direta do navegador na tela inicial do celular.

---

### Parte 1: Responsividade Mobile

**Problemas identificados nas páginas:**

1. **AppLayout** (`src/components/layout/AppLayout.tsx`)
   - Reduzir padding do `main` em mobile (`p-3 sm:p-6`)
   - Header mais compacto em mobile

2. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Botões "Registrar Receita/Despesa" empilhados em mobile
   - Textos de saldo (`text-4xl` -> `text-2xl sm:text-4xl`)
   - Gráficos com altura reduzida em mobile (`h-52 sm:h-72`)
   - Pie chart labels cortados - usar `outerRadius` menor
   - Tabelas de transações recentes com scroll horizontal

3. **Receitas e Despesas** (`Revenues.tsx`, `Expenses.tsx`)
   - Tabelas com `overflow-x-auto` (já parcial em Clients)
   - Header com título e botão empilhados em mobile
   - Filtros empilhados verticalmente em mobile

4. **Fluxo de Caixa** (`CashFlow.tsx`)
   - Grid de 5 colunas -> stack em mobile
   - Cards de recorrência em coluna única
   - Tabela timeline com scroll horizontal

5. **Impostos** (`Taxes.tsx`)
   - Grid de 4 KPIs -> 2 colunas em mobile
   - Tabela de guias com scroll horizontal

6. **Metas** (`Goals.tsx`)
   - Grid de 3 stats em coluna no mobile
   - Botões Depositar/Sacar/Histórico empilhados

7. **Configurações** (`Settings.tsx`)
   - Já razoavelmente responsivo, ajustes menores

8. **Análise Financeira** (`FinancialAnalysis.tsx`)
   - KPIs 4 colunas -> 2 em mobile

9. **Landing** (`Landing.tsx`)
   - Planos com `scale-105` causa overflow em mobile - remover em telas pequenas

10. **Login/Signup** - Verificar se formulários estão ok em mobile

---

### Parte 2: PWA (Progressive Web App)

1. **Instalar `vite-plugin-pwa`** como dependência
2. **Configurar `vite.config.ts`**:
   - Adicionar plugin VitePWA com manifest (nome: FluxoPro, cores: tema esmeralda, ícones)
   - `navigateFallbackDenylist: [/^\/~oauth/]` para não cachear rotas OAuth
3. **Criar ícones PWA** em `public/` (192x192 e 512x512 placeholder SVGs)
4. **Atualizar `index.html`**:
   - Meta tags mobile: `apple-mobile-web-app-capable`, `theme-color`, `apple-mobile-web-app-status-bar-style`
5. **Remover `src/App.css`** - estilos default do Vite que causam `max-width: 1280px` no `#root` (isso limita o layout)

---

### Arquivos a serem editados:
- `vite.config.ts` (PWA plugin)
- `index.html` (meta tags mobile + PWA)
- `src/App.css` (remover ou limpar)
- `src/components/layout/AppLayout.tsx` (padding responsivo)
- `src/pages/Dashboard.tsx` (grids, textos, gráficos)
- `src/pages/Revenues.tsx` (header, tabela)
- `src/pages/Expenses.tsx` (header, tabela)
- `src/pages/CashFlow.tsx` (grids, tabela)
- `src/pages/Taxes.tsx` (grids, tabela)
- `src/pages/Goals.tsx` (grids, botões)
- `src/pages/Reports.tsx` (gráficos)
- `src/pages/Clients.tsx` (header, tabela)
- `src/pages/FinancialAnalysis.tsx` (KPIs)
- `src/pages/Landing.tsx` (planos)
- `src/pages/Settings.tsx` (ajustes menores)
- Criar `public/pwa-192x192.svg` e `public/pwa-512x512.svg`

