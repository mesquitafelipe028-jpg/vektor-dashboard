

## Plano: Substituir botões de registro por menu dropdown com "+"

### Mudança em `src/pages/Dashboard.tsx` (linhas 438-448)

Substituir os 3 botões visíveis por um único botão "+" que abre um `DropdownMenu` com as opções:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="outline">
      <Plus className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => navigate("/receitas?novo=true")}>
      <TrendingUp /> Registrar Receita
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/despesas?novo=true")}>
      <TrendingDown /> Registrar Despesa
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/clientes?novo=true")}>
      <Users /> Novo Cliente
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Importar `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` de `@/components/ui/dropdown-menu`.

### Resultado
Layout do header mais limpo, com um único botão "+" que expande as ações rápidas ao clicar.

