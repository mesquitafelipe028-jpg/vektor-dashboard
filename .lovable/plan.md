
Objetivo: eliminar travamentos de rolagem quando Select/Dropdown abre, garantir scroll com teclado aberto e criar um padrão reutilizável para telas de formulário.

Diagnóstico (após análise do código)
1) Stack é React Web (não React Native): não há ScrollView/FlatList/KeyboardAvoidingView nativos.  
   Equivalentes atuais no projeto: containers com `overflow-y-auto`, `Dialog`, `Sheet`, `Select` (Radix).

2) Causa raiz principal:
- `Select` global usa comportamento padrão do Radix (`modal=true`), que bloqueia interações/scroll fora do dropdown enquanto aberto.
- Muitos formulários estão dentro de `DialogContent` sem limite de altura/scroll interno consistente.
- Em telas com modal + select + teclado mobile, o corpo fica bloqueado e o conteúdo útil não tem scroller único confiável.

3) Causas secundárias:
- Estruturas com múltiplos scrollers em cadeia (modal + bloco interno), sem padrão único.
- Alguns dialogs com conteúdo longo sem `max-height` + `overflow-y-auto`.
- Inconsistência entre formulários (alguns já têm padrão bom, outros não).

Plano de correção (implementação)
1. Correção global de Select (fonte do travamento de gesto)
- Arquivo: `src/components/ui/select.tsx`
- Ajustes:
  - Definir `modal={false}` por padrão no `Select` wrapper.
  - Ajustar `SelectContent` para comportamento touch-safe (`max-height` responsivo, `overflow-y-auto`, `overscroll-contain`).
- Resultado esperado: abrir dropdown não “congela” o scroll da tela/formulário ao redor.

2. Correção global de Dialog (scroll interno padrão)
- Arquivo: `src/components/ui/dialog.tsx`
- Ajustes:
  - `DialogContent` com `max-h` baseado em viewport (`dvh`) + `overflow-y-auto` + `overscroll-contain`.
  - Preservar compatibilidade com telas que explicitamente usam `overflow-hidden` (ex.: formulário transacional custom).
- Resultado esperado: qualquer modal longo mantém rolagem interna estável em mobile/desktop.

3. Padronização reutilizável para telas de formulário
- Novo arquivo: `src/components/layout/FormScrollableLayout.tsx` (ou `src/components/ui/form-scroll-container.tsx`)
- Estrutura padrão:
  - container raiz `flex flex-col min-h-0`
  - área principal `flex-1 min-h-0 overflow-y-auto overscroll-contain`
  - suporte touch (`WebkitOverflowScrolling: touch`, `touchAction: pan-y`)
  - wrapper interno com `min-h-full` (equivalente ao `flexGrow:1` do RN)
- Resultado: padrão único para evitar regressão em novos formulários.

4. Aplicar o padrão nas telas com maior risco
- `src/components/transaction/TransactionFormSheet.tsx` (já avançado; alinhar ao padrão reutilizável)
- `src/components/mobile/QuickAddModal.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/CreditCards.tsx`
- `src/pages/Goals.tsx`
- `src/pages/Taxes.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Clients.tsx`
- `src/pages/ClientDetails.tsx`

5. Ajustes CSS globais de suporte
- Arquivo: `src/index.css`
- Consolidar utilitário global de scroll seguro em lock state:
  - manter/expandir regra `[data-scroll-locked]` para classes padrão do novo layout reutilizável.
- Resultado: comportamento consistente mesmo com lock do Radix ativo.

Arquivos afetados (planejados)
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/index.css`
- `src/components/layout/FormScrollableLayout.tsx` (novo)
- `src/components/transaction/TransactionFormSheet.tsx`
- `src/components/mobile/QuickAddModal.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/CreditCards.tsx`
- `src/pages/Goals.tsx`
- `src/pages/Taxes.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Clients.tsx`
- `src/pages/ClientDetails.tsx`

Causa e correção por tela (resumo)
- Receitas/Despesas (TransactionFormSheet):  
  Causa: Select modal + contexto de Sheet com scroll lock.  
  Correção: Select não-modal + container padrão único de rolagem.
- Quick Add (modal mobile):  
  Causa: select dentro de dialog com lock/teclado.  
  Correção: padrão reutilizável + select não-modal.
- Contas:  
  Causa: dialog com seletor e conteúdo variável.  
  Correção: dialog scroll-safe + padrão reutilizável.
- Cartões:  
  Causa: dialogs longos com múltiplos selects sem padrão único.  
  Correção: dialog scroll-safe + aplicação do layout padrão.
- Metas:  
  Causa: vários dialogs sem padronização de altura/scroll.  
  Correção: aplicar padrão reutilizável em todos os dialogs de formulário.
- Impostos:  
  Causa: dialog de cadastro e select em tela com lock eventual.  
  Correção: dialog scroll-safe + select não-modal.
- Categorias:  
  Causa: modal com grade longa de ícones (scroll interno local).  
  Correção: manter grid scrollável e encapsular em dialog padrão.
- Clientes/Detalhe do Cliente:  
  Causa: dialogs sem padrão único (potencial regressão em mobile).  
  Correção: padronizar para comportamento consistente.

Validação (obrigatória após implementação)
1) Teste mobile end-to-end em todas as telas acima: abrir modal → abrir select → fechar select → continuar rolando até fim do formulário.  
2) Repetir com teclado aberto (inputs focados).  
3) Confirmar ausência de travamento em rolagem vertical e que apenas 1 scroller principal está ativo por formulário.
