

## Plano: Substituir modais/sheets por páginas dedicadas de formulário

### Problema
Os formulários de Receitas, Despesas e Clientes usam Sheet (mobile) e Dialog (desktop) que causam travamento de scroll por conta do sistema modal do Radix UI. Mesmo com as correções anteriores, o problema persiste.

### Solução
Criar páginas dedicadas de preenchimento de dados — sem modais, sem sheets, sem scroll lock. O formulário ocupa a página inteira com scroll nativo do navegador.

### Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `src/pages/TransactionForm.tsx` | Página de formulário para receita e despesa (reutiliza a lógica existente). Detecta o tipo via rota (`/receitas/nova`, `/despesas/nova`). Para edição, recebe o ID via `/receitas/editar/:id`. |
| `src/pages/ClientForm.tsx` | Página de formulário para cliente. Rotas: `/clientes/novo`, `/clientes/editar/:id`. |

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adicionar rotas: `/receitas/nova`, `/receitas/editar/:id`, `/despesas/nova`, `/despesas/editar/:id`, `/clientes/novo`, `/clientes/editar/:id` |
| `src/pages/Revenues.tsx` | Botão "Nova Receita" navega para `/receitas/nova`. Botão editar navega para `/receitas/editar/:id`. Remover estado do Sheet e import do TransactionFormSheet. |
| `src/pages/Expenses.tsx` | Mesmo padrão: navegar para `/despesas/nova` e `/despesas/editar/:id`. |
| `src/pages/Clients.tsx` | Botão "Novo Cliente" navega para `/clientes/novo`. Editar navega para `/clientes/editar/:id`. Remover Dialog de formulário. |
| `src/pages/ClientDetails.tsx` | Botão "Nova Cobrança" navega para `/receitas/nova?cliente=ID` (mantém comportamento atual). |

### Estrutura da página de formulário (TransactionForm)

- Header com botão "Voltar" (← seta) e título ("Nova Receita" / "Editar Despesa")
- Formulário vertical com scroll nativo da página — sem container modal
- Reutiliza toda a lógica de validação (zod), mutations e campos do TransactionFormSheet
- Reutiliza o `CategoryGrid` e `FormRow` existentes (extrair do TransactionFormSheet)
- Após salvar, navega de volta para a página de lista (`/receitas` ou `/despesas`)
- Carrega dados existentes via query quando em modo edição

### Estrutura da página ClientForm

- Header com botão voltar e título
- Campos: Nome, Email, Telefone (mesmos do Dialog atual)
- Após salvar, navega de volta para `/clientes`

### Conexões mantidas
- Todas as mutations Supabase (insert/update) permanecem idênticas
- Queries de clientes, categorias, etc. reutilizadas
- Invalidação de cache (`queryClient.invalidateQueries`) mantida
- Parâmetros de URL (`?cliente=ID`, `?novo=true`) continuam funcionando via redirect para a rota de formulário

