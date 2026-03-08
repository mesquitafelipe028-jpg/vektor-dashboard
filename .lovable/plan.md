

## Diagnóstico: Por que o scroll ainda trava nos formulários

Identifiquei duas causas raiz que não foram corrigidas nas rodadas anteriores:

### Causa 1: `onPointerDownOutside={(e) => e.preventDefault()}` no SelectContent
Na linha 68 de `select.tsx`, foi adicionado `onPointerDownOutside={(e) => e.preventDefault()}`. Isso **impede que o Select feche ao tocar fora dele**, o que na prática bloqueia toda interação (incluindo scroll) enquanto o dropdown está aberto. O usuário fica "preso" no dropdown.

### Causa 2: Select ainda é `SelectPrimitive.Root` sem nenhuma alteração
Na linha 7 de `select.tsx`, o Select continua sendo `const Select = SelectPrimitive.Root` — a correção planejada de forçar `modal={false}` nunca foi aplicada. Porém, o Radix Select **não possui prop `modal`** no Root (diferente do Dialog). A solução real é outra.

### Causa 3: Dialog (usado na página de Clientes) ainda usa `modal={true}` padrão
O Dialog da página de Clientes mantém o comportamento modal padrão do Radix, que aplica scroll-lock no body.

---

## Plano de correção

### 1. `src/components/ui/select.tsx`
- **Remover** `onPointerDownOutside={(e) => e.preventDefault()}` da linha 68 do SelectContent — isso é o que trava o scroll, pois impede fechar o dropdown e bloqueia todos os toques fora dele

### 2. `src/components/ui/dialog.tsx`
- Wrapper do Dialog com `modal={false}` por padrão, igual foi feito no Sheet:
```tsx
const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => (
  <DialogPrimitive.Root modal={false} {...props} />
);
```
- Isso elimina o scroll-lock do body quando qualquer Dialog abre (Clientes, Contas, etc.)

### 3. `src/components/ui/sheet.tsx` (já está correto com `modal={false}`)
- Sem alterações necessárias

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `src/components/ui/select.tsx` | Remover `onPointerDownOutside` do SelectContent |
| `src/components/ui/dialog.tsx` | Forçar `modal={false}` no wrapper do Dialog |

