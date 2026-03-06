

## Plano: Aprimorar Módulo de Impostos MEI

A página `src/pages/Taxes.tsx` já existe com funcionalidades básicas (adicionar guia, marcar como pago, limite anual). Faltam: **edição**, **exclusão** e **alerta de vencimento próximo**.

### Mudanças em `src/pages/Taxes.tsx`:

1. **Editar guia DAS** — Reutilizar o Dialog do formulário em modo edição, preenchendo os campos com dados existentes e usando `update` no Supabase.

2. **Excluir guia DAS** — Botão de exclusão com `AlertDialog` de confirmação, usando `delete` no Supabase.

3. **Alerta de vencimento próximo** — Calcular guias pendentes com vencimento nos próximos 7 dias. Exibir banner de alerta no topo da página com ícone `AlertTriangle` e lista das guias próximas do vencimento.

4. **Melhorias visuais** — Badges com cores mais distintas (verde pago, amarelo pendente, vermelho vencido). Adicionar status "vencido" automaticamente para guias pendentes com data passada. Botões de ação (editar/excluir) em cada linha da lista.

### Arquivo afetado
- `src/pages/Taxes.tsx` — reescrita com funcionalidades completas

