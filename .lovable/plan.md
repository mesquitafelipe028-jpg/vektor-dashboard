

## Plano: Categorias ocultas com expansão ao clicar

Tornar a seção de categorias colapsável — fechada por padrão, abre ao clicar na linha "Categoria".

### Mudança

**`src/components/transaction/TransactionFormSheet.tsx`**
- Adicionar estado `categoryOpen` (boolean, default `false`)
- Transformar o header "Categoria" em uma linha clicável usando o componente `FormRow` existente, com `expandable` e chevron
- Envolver o `CategoryGrid` em `AnimatePresence` + `motion.div` (mesmo padrão já usado na seção de recorrência)
- Mostrar o nome da categoria selecionada como sublabel quando fechado

