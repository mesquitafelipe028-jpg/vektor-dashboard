

## Diagnóstico

O problema persiste porque a correção anterior **não aplicou `modal={false}`** no `Select`. A linha 7 de `select.tsx` ainda é `const Select = SelectPrimitive.Root;` — sem wrapper. Isso significa que todo Select continua operando em modo modal, que bloqueia pointer events fora do dropdown e impede o scroll.

Além disso, o `Sheet` (usado no TransactionFormSheet mobile) é baseado em `@radix-ui/react-dialog`, que aplica `data-scroll-locked` no body. As regras CSS atuais tentam contornar isso mas não são suficientes porque o Radix injeta `overflow: hidden` inline no `<body>`, e o CSS global não tem `!important` para sobrepor.

### Causas raiz
1. **Select sem `modal={false}`** — o wrapper não foi alterado, então dropdowns ainda travam gestos
2. **Radix scroll lock inline** — o `overflow: hidden` é aplicado inline no body pelo Dialog/Sheet, e as regras CSS não conseguem sobrepor sem `!important`
3. **Sheet bottom não desabilita o scroll lock** do Radix

## Plano de correção

### 1. `src/components/ui/select.tsx`
- Substituir `const Select = SelectPrimitive.Root` por um wrapper que força `modal={false}`:
```tsx
const Select = (props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) => (
  <SelectPrimitive.Root modal={false} {...props} />
);
```

### 2. `src/components/ui/sheet.tsx`
- No `Sheet` wrapper, adicionar `modal={false}` para que o Sheet não aplique scroll lock no body:
```tsx
const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => (
  <SheetPrimitive.Root modal={false} {...props} />
);
```
- Isso desabilita o scroll lock do Radix. O overlay continua funcionando visualmente.

### 3. `src/index.css`
- Adicionar regra com `!important` para garantir que mesmo quando `data-scroll-locked` está presente, o scroll interno de dialogs funcione:
```css
[data-scroll-locked] {
  overflow: auto !important;
}
```
- Isso é uma rede de segurança para Dialog (que mantém modal=true para acessibilidade).

### 4. `src/components/ui/dialog.tsx`
- Mesma abordagem: wrapper com `modal` prop flexível, mas manter `modal={true}` por padrão (dialogs de confirmação precisam de modal). Adicionar `onPointerDownOutside` no Content para fechar ao clicar fora (já que com a regra CSS acima o body não está mais truly locked).

### Arquivos afetados
| Arquivo | Causa | Correção |
|---|---|---|
| `select.tsx` | Select sem modal={false} | Wrapper com modal={false} |
| `sheet.tsx` | Sheet aplica scroll lock | Sheet com modal={false} |
| `index.css` | Radix inline overflow:hidden não sobreposto | Regra !important de segurança |
| `dialog.tsx` | Scroll lock bloqueia body | Regra CSS de segurança (sem mudar modal) |

