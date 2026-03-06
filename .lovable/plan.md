

## Problema

Ao clicar nas ações rápidas do FAB (Adicionar Receita/Despesa/Cliente), o `setFabOpen(false)` e o `navigate()` ocorrem simultaneamente. A animação de saída do `AnimatePresence` (overlay `bg-black/50`) não completa corretamente porque o React re-renderiza durante a navegação, deixando o overlay escuro preso na tela e bloqueando toda a interação.

O mesmo pode ocorrer com o Drawer do "Mais" — o overlay do vaul (`bg-black/80`) pode não fechar corretamente quando a navegação acontece antes da animação de saída terminar.

## Solução

### 1. FAB Quick Actions — navegar após fechar (`MobileBottomNav.tsx`)
Adicionar um pequeno delay antes de navegar, garantindo que a animação de saída do overlay complete antes da mudança de rota:

```tsx
onClick={() => {
  setFabOpen(false);
  setTimeout(() => navigate(action.path), 200);
}}
```

### 2. Drawer "Mais" — mesma abordagem
Garantir que o drawer feche completamente antes de navegar:

```tsx
onClick={() => {
  setMoreOpen(false);
  setTimeout(() => navigate(item.path), 200);
}}
```

### 3. Logout — mesmo tratamento
```tsx
const handleLogout = async () => {
  setMoreOpen(false);
  setTimeout(async () => {
    await signOut();
    navigate("/login");
  }, 200);
};
```

### Arquivo a editar
- `src/components/mobile/MobileBottomNav.tsx` — adicionar `setTimeout` nos 3 pontos de navegação (FAB actions, menu items do drawer, e logout)

