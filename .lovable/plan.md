

## Plano: FAB abre formulários diretamente + remover "Registro Rápido"

### Problema atual
Ao clicar nas opções do FAB ("Adicionar Receita", "Adicionar Despesa", "Adicionar Cliente"), o app apenas navega para a página correspondente sem abrir o formulário de criação. O usuário quer que o formulário abra automaticamente. Além disso, a opção "Registro Rápido" deve ser removida.

### Abordagem
Usar query params (`?novo=true`) na URL para sinalizar que o formulário deve abrir automaticamente ao chegar na página. Cada página (Revenues, Expenses, Clients) lê esse parâmetro e abre o formulário.

### Mudanças

**1. `src/components/mobile/MobileBottomNav.tsx`**
- Remover o botão "Registro Rápido" e toda referência ao `QuickAddModal`
- Remover o state `quickAddOpen` e a importação do `QuickAddModal`
- Alterar os `quickActions` para navegar com query param `?novo=true`:
  - "Adicionar Receita" → `/receitas?novo=true`
  - "Adicionar Despesa" → `/despesas?novo=true`
  - "Adicionar Cliente" → `/clientes?novo=true`

**2. `src/pages/Revenues.tsx`**
- Importar `useSearchParams` do react-router-dom
- No mount, verificar se `searchParams.get("novo") === "true"` → se sim, chamar `setOpen(true)` e limpar o param

**3. `src/pages/Expenses.tsx`**
- Mesma lógica: ler `?novo=true` e abrir o formulário automaticamente

**4. `src/pages/Clients.tsx`**
- Mesma lógica: ler `?novo=true` e abrir o dialog de novo cliente automaticamente

### Arquivos a editar
- `src/components/mobile/MobileBottomNav.tsx`
- `src/pages/Revenues.tsx`
- `src/pages/Expenses.tsx`
- `src/pages/Clients.tsx`

