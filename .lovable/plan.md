

## Plano: Transformar ClientDetails em painel de controle financeiro do cliente

### Visao geral
Reformular a pagina `/clientes/:id` (ClientDetails.tsx) para funcionar como um painel completo de gestao de cobrancas do cliente, com indicadores financeiros, historico com status visual, acoes rapidas e suporte a cobrancas recorrentes. A pagina de listagem (Clients.tsx) permanece como esta.

### Mudancas

**1. `src/pages/ClientDetails.tsx` -- Reescrita completa**

**Header com acoes rapidas (responsivo):**
- Botao voltar + Nome/telefone/email do cliente
- Botoes: "Nova Cobranca" (navega `/receitas?novo=true&cliente=ID`), "Registrar Pagamento" (abre modal inline para marcar receita pendente como recebida), "Enviar Lembrete" (copia texto de cobranca para clipboard com toast), "Editar Cliente" (abre dialog de edicao inline)
- No mobile: botoes empilham em grid 2x2

**KPI Cards (grid 2x2 mobile, 4 colunas desktop):**
- Total Pago: soma das receitas com status `recebido`
- Total em Aberto: soma das receitas com status `pendente` ou `atrasado`
- Ultimo Pagamento: data da receita mais recente com status `recebido`
- Proxima Cobranca: data da receita pendente mais proxima no futuro

**Historico financeiro com status visual:**
- Tabela com colunas: Data, Descricao, Valor, Status
- Status badges coloridos reutilizando `StatusBadge` de `TransactionBadge.tsx` (verde=recebido, amarelo=pendente, vermelho=atrasado)
- Badge de tipo (recorrente/parcelada) via `TransactionTypeBadge`
- No mobile: layout em cards empilhados ao inves de tabela

**Dialog "Editar Cliente":**
- Reutilizar o mesmo schema e form que ja existe em Clients.tsx (extrair ou duplicar inline)

**2. `src/pages/Revenues.tsx` -- Aceitar query param `cliente`**
- Ler `searchParams.get("cliente")` e pre-preencher o campo `cliente_id` no formulario de nova receita quando presente

### Detalhes tecnicos

- Query de receitas ja busca `select("*")` com todos os campos incluindo `status`, `tipo_transacao`, `frequencia` -- dados suficientes para os KPIs e badges
- Para "Registrar Pagamento": modal simples que lista receitas pendentes do cliente e permite marcar como `recebido` via update no Supabase
- Para "Enviar Lembrete": gera texto formatado com dados da cobranca pendente e copia para clipboard (sem integracao externa)
- Cobrancas recorrentes ja sao suportadas pelo sistema existente (`useRecurringGenerator`), basta criar receitas com `tipo_transacao: "recorrente"` vinculadas ao `cliente_id`

### Arquivos a editar
- `src/pages/ClientDetails.tsx` -- reescrita principal
- `src/pages/Revenues.tsx` -- aceitar param `cliente` para pre-selecionar cliente no form

