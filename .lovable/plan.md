

## Diagnóstico

Na imagem, o header do app ("Vektor" + "Nova Receita") aparece cortado pela barra de status do iOS. Isso acontece porque há **duplicação do safe-area-inset**:

1. `body` tem `padding-top: env(safe-area-inset-top)` no CSS global (`index.css` linha 98)
2. O `header` usa `sticky top-[env(safe-area-inset-top)]` — mas isso posiciona o header **abaixo** do padding do body, não cobre a área da status bar

O resultado: a área da status bar do sistema fica sem fundo e sobrepõe o conteúdo.

## Correção

### 1. `src/index.css`
- Remover `padding-top: env(safe-area-inset-top)` do `body`

### 2. `src/components/layout/AppLayout.tsx`
- Header: mudar de `sticky top-[env(safe-area-inset-top)]` para `sticky top-0`
- Adicionar `pt-[env(safe-area-inset-top)]` no header para que ele próprio inclua o espaço da status bar internamente (assim o fundo do header cobre toda a área)

### 3. `src/components/mobile/MobileBottomNav.tsx`
- Já usa `paddingBottom: env(safe-area-inset-bottom)` — sem alteração necessária

| Arquivo | Mudança |
|---|---|
| `src/index.css` | Remover `padding-top: env(safe-area-inset-top)` do body |
| `src/components/layout/AppLayout.tsx` | Header: `sticky top-0 pt-[env(safe-area-inset-top)]` |

