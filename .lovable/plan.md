

## Plano: Botões do Dashboard abrem formulários diretamente + adicionar botão Novo Cliente

### Mudanças em `src/pages/Dashboard.tsx`

**Alterar os botões existentes** (linhas 438-445) para navegar com `?novo=true`, e adicionar um terceiro botão para "Novo Cliente":

```tsx
<div className="hidden md:flex gap-2">
  <Button size="sm" onClick={() => navigate("/receitas?novo=true")}>
    <Plus className="h-4 w-4" /> Registrar Receita
  </Button>
  <Button size="sm" variant="outline" onClick={() => navigate("/despesas?novo=true")}>
    <Plus className="h-4 w-4" /> Registrar Despesa
  </Button>
  <Button size="sm" variant="outline" onClick={() => navigate("/clientes?novo=true")}>
    <Plus className="h-4 w-4" /> Novo Cliente
  </Button>
</div>
```

As páginas Revenues, Expenses e Clients já têm a lógica de `useSearchParams` para abrir o formulário automaticamente quando `?novo=true` está presente (implementado anteriormente).

### Arquivo a editar
- `src/pages/Dashboard.tsx` — linhas 438-445

