

# O ticker está funcionando, mas a BrAPI não reconhece os símbolos

## Diagnóstico

A chamada para `fetch-quotes` retornou **status 200** com `{"quotes":{}}` — ou seja, a função está rodando corretamente, o JWT foi resolvido, mas a **BrAPI não reconheceu nenhum dos tickers enviados**.

O problema é que os símbolos `^BVSP`, `USDBRL=X` e `EURBRL=X` são formato **Yahoo Finance**, não BrAPI. A BrAPI usa formatos diferentes.

## Correção necessária

**Arquivo:** `supabase/functions/fetch-quotes/index.ts` e `src/components/layout/MarketTicker.tsx`

Atualizar os tickers para o formato correto da BrAPI:

| Atual (Yahoo) | BrAPI correto |
|---|---|
| `^BVSP` | `IBOV` (via endpoint `/api/quote/^BVSP` ou usar índice) |
| `USDBRL=X` | `USDBRL` (via endpoint `/api/v2/currency`) |
| `EURBRL=X` | `EURBRL` (via endpoint `/api/v2/currency`) |

A BrAPI tem 3 endpoints diferentes:
- **Ações/FIIs**: `/api/quote/PETR4` — funciona com PETR4, VALE3, ITUB4, HGLG11
- **Moedas**: `/api/v2/currency?currency=USD-BRL` — para câmbio
- **Crypto**: `/api/v2/crypto?coin=bitcoin` — já implementado

### Mudanças:

1. **Edge Function** — adicionar lógica para buscar moedas via endpoint `/api/v2/currency` e tratar o IBOV separadamente
2. **MarketTicker** — atualizar `DEFAULT_TICKERS` e `LABEL_MAP` com os formatos corretos
3. Separar tickers em 3 categorias: ações (regular), moedas (currency) e crypto

