

## Plano: Cores do gráfico de pizza por categoria

### Problema
O gráfico "Despesas por Categoria" usa um array fixo `PIE_COLORS` com cores genéricas, sem relação com as cores reais de cada categoria no banco de dados.

### Solução
Passar a cor real de cada categoria junto com os dados do gráfico, usando o mapeamento de cores do banco de dados.

### Mudanças

**1. `src/pages/Dashboard.tsx`**
- Adicionar um mapa de cor nome→HSL baseado nas categorias do banco (já temos `useCategories` disponível via hook)
- Criar um `colorHslMap` que converte o nome da cor (ex: "orange") para um valor HSL usável no Recharts
- Alterar `categoryData` para incluir um campo `fill` com a cor HSL correspondente
- Tipo do dado passa de `{ name, value }` para `{ name, value, fill }`

**2. `src/components/dashboard/DashboardCharts.tsx`**
- Atualizar a interface para incluir `fill` em `categoryData`
- No `<Cell>`, usar `item.fill` em vez de `PIE_COLORS[idx]`
- Remover o array `PIE_COLORS` (ou mantê-lo apenas como fallback)

### Mapa de cores (nome → HSL para Recharts)
```
orange → hsl(25, 95%, 53%)
violet → hsl(263, 70%, 50%)
blue → hsl(217, 91%, 60%)
rose → hsl(350, 89%, 60%)
// etc.
```

