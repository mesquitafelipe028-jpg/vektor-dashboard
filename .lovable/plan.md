

## Problema

No modo PWA/mobile, a barra de status do celular (hora, bateria, sinal) sobrepõe o header do app porque o `apple-mobile-web-app-status-bar-style` está definido como `black-translucent`, o que faz o conteúdo renderizar por baixo da status bar. Porém, não há `padding-top` com `safe-area-inset` para compensar essa área.

## Solução

Adicionar suporte a **safe area insets** do iOS/PWA para que o header respeite a área da barra de status:

1. **`src/index.css`** — Adicionar `padding-top: env(safe-area-inset-top)` no `body` para empurrar todo o conteúdo abaixo da status bar do celular.

2. **`src/components/layout/AppLayout.tsx`** — Adicionar `pt-[env(safe-area-inset-top)]` no header sticky para garantir que o botão do menu nunca fique coberto pela status bar. Também aumentar levemente a altura do header no mobile para dar mais espaço ao toque.

3. **`index.html`** — Já possui `viewport-fit=cover` (correto). Manter como está.

Essas alterações garantem que em qualquer dispositivo iOS/Android com notch ou barra de status, o conteúdo do app começa abaixo da área segura.

