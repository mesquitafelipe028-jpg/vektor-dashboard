
Objetivo: eliminar o erro recorrente do Edge Function (`Failed to fetch`) e garantir que o ticker volte a exibir cotações de forma estável.

Diagnóstico atual (com base no código + logs):
- O frontend está chamando corretamente `supabase.functions.invoke("fetch-quotes")`.
- O erro atual é de transporte (`FunctionsFetchError` / `TypeError: Failed to fetch`), não erro de parsing de resposta.
- Isso normalmente indica problema de deploy/runtime/CORS da função (antes de retornar JSON ao browser).
- Há um segundo risco identificado: `BRAPI_TOKEN` não aparece na lista de secrets do projeto atual, então mesmo com conectividade OK a função pode falhar com 500.
- Existe também um warning separado no UI (`Skeleton` sem `forwardRef`) que não causa o erro do Edge, mas deve ser corrigido para evitar ruído de debug.

Plano de implementação:

1) Fortalecer a função `fetch-quotes` para evitar falhas silenciosas de rede/CORS
- Arquivo: `supabase/functions/fetch-quotes/index.ts`
- Ajustes:
  - Padronizar helper de resposta JSON para garantir CORS em 100% dos retornos (sucesso e erro).
  - Incluir headers CORS adicionais: `Access-Control-Allow-Methods` e `Access-Control-Max-Age`.
  - Responder preflight (`OPTIONS`) com `"ok"` explicitamente.
  - Validar body com tratamento robusto (erro de JSON inválido).
  - Adicionar timeout por chamada externa (BrAPI) via `AbortController`, evitando timeout total da função.
  - Manter execução resiliente por categoria (ações/moedas/crypto), sem derrubar a resposta completa por falha parcial.

2) Tornar o hook do frontend mais resiliente a falhas transitórias
- Arquivo: `src/hooks/useStockQuotes.ts`
- Ajustes:
  - Diferenciar erro de rede/CORS (`Failed to fetch`) de erro de negócio (ex.: token ausente).
  - Fazer 1 retry automático curto para erro de rede.
  - Melhorar mensagem de toast para orientar ação exata (deploy/CORS/secret), em vez de mensagem genérica.

3) Corrigir warning de componente com ref
- Arquivo: `src/components/ui/skeleton.tsx`
- Ajuste:
  - Migrar `Skeleton` para `React.forwardRef<HTMLDivElement, ...>()`.
- Benefício:
  - Remove warning no console e melhora sinal/ruído durante depuração do Edge.

4) Proteger renderização do ticker contra dados inesperados
- Arquivo: `src/components/layout/MarketTicker.tsx`
- Ajustes:
  - Filtrar entradas inválidas (`null`/`undefined`) antes de renderizar.
  - Evitar quebra caso a função retorne payload parcial.

5) Checklist operacional (obrigatório após código)
- No Supabase Dashboard:
  - Confirmar deploy da versão nova da `fetch-quotes`.
  - Confirmar `Verify JWT` desligado para essa função.
  - Confirmar secret `BRAPI_TOKEN` configurado no projeto correto.
- Teste E2E:
  - Abrir `/investimentos`.
  - Verificar no Network: preflight/POST da função com status válido e resposta JSON.
  - Verificar ticker aparecendo com USD/BRL, EUR/BRL, PETR4 etc.
  - Navegar entre páginas e validar que o ticker permanece carregando/atualizando sem novo erro.

Detalhes técnicos (resumo para implementação):
```text
Frontend (invoke)
   -> Supabase Edge Gateway
      -> fetch-quotes (CORS + validação + timeout por provedor)
         -> brapi.dev (quote/currency/crypto)
      <- JSON sempre com CORS
   <- Hook aplica retry + mensagens de erro claras
```

Critérios de aceite:
- Sem `Failed to fetch` no console ao carregar layout autenticado.
- Ticker visível com pelo menos parte dos ativos carregados.
- Em falha externa da BrAPI, app não quebra e mostra feedback adequado.
- Warning de `Skeleton` com ref removido.
