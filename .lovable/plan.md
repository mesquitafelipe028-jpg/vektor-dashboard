

# Ticker de Cotações em Tempo Real no Header

## O que será feito

Adicionar uma faixa de cotações animada (ticker/marquee) logo abaixo do header, visível em **todas as páginas** do app. Mostrará os principais índices e ativos do mercado brasileiro com atualização automática a cada 5 minutos.

## Ativos exibidos por padrão

IBOV, USDBRL, EURBRL, PETR4, VALE3, ITUB4, HGLG11, Bitcoin, Ethereum

## Componentes

### 1. `src/components/layout/MarketTicker.tsx` (novo)
- Faixa horizontal com scroll automático (CSS animation marquee) mostrando: ticker, preço atual, variação % (verde/vermelho)
- Usa o hook `useStockQuotes` para buscar cotações dos ativos fixos ao montar
- `useEffect` com `setInterval` de 5 minutos para auto-refresh
- Indicador de "última atualização" discreto no canto
- No mobile: mesma faixa, mas com altura menor e fonte reduzida
- Fallback: skeleton animado enquanto carrega; se falhar, oculta a faixa silenciosamente

### 2. `src/components/layout/AppLayout.tsx` (editado)
- Inserir `<MarketTicker />` entre o `<header>` e o `<main>`, fora do overflow do main

## Detalhes técnicos

- Reutiliza 100% a infra existente (`fetch-quotes` Edge Function + `useStockQuotes` hook)
- Lista de tickers padrão definida como constante no componente
- Animação CSS pura (translateX keyframe), sem lib extra
- A faixa não interfere no layout — altura fixa de ~32px (desktop) / ~28px (mobile)

