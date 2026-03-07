

## Análise: Subcategorias já estão implementadas

Após revisar o código de `src/pages/Categories.tsx` e `src/hooks/useCategories.ts`, a funcionalidade de subcategorias **já existe** na página de Categorias:

### O que já funciona
- **Botão "+"** aparece ao passar o mouse sobre cada categoria pai → abre modal "Nova Subcategoria"
- **`categoria_pai_id`** é passado na criação, vinculando ao pai
- **Hierarquia** é construída no hook (`useCategories`) agrupando filhos por `categoria_pai_id`
- **Expand/collapse** com chevrons para mostrar/esconder subcategorias
- **Editar/excluir** subcategorias individualmente

### Possível problema
Os botões de ação ("+", editar, excluir) usam `opacity-0 group-hover:opacity-100`, ou seja, só aparecem ao passar o mouse — **invisíveis em dispositivos touch/mobile**.

### Proposta de melhoria (se desejado)
Tornar os botões de ação sempre visíveis em mobile (`opacity-0 md:group-hover:opacity-100` + sempre visíveis em telas pequenas), para que a funcionalidade de criar subcategorias seja acessível em todos os dispositivos.

Se o problema for outro (erro ao salvar, categorias não aparecendo), por favor descreva o que está acontecendo para eu investigar.

