

## Plano: Projeção de cobranças futuras no painel do cliente

### O que muda
No `ClientDetails.tsx`, adicionar uma seção "Próximas Cobranças" que detecta receitas recorrentes do cliente e calcula automaticamente as próximas ocorrências (até 3 meses à frente), exibindo-as de forma limpa e compacta.

### Como funciona
- Usar `useMemo` para identificar receitas recorrentes parentais (`tipo_transacao === "recorrente"` e `transacao_pai_id === null`) do cliente
- Reutilizar a função `generateRecurringDates` já existente em `src/types/transactions.ts` para projetar as datas futuras
- Filtrar apenas datas futuras (após hoje) e limitar a ~6 próximas ocorrências
- Exibir como uma lista compacta com data, descrição, valor e badge "Prevista" em azul claro
- Se não houver cobranças recorrentes, a seção não aparece (zero poluição)

### Posição no layout
Entre os KPI cards e o "Histórico do Cliente" — seção colapsável via estado simples, iniciando expandida. Título: "Próximas Cobranças" com ícone de calendário.

### Detalhes visuais
- Cards compactos com bordas tracejadas (border-dashed) para diferenciar de registros reais
- Badge "Prevista" em azul claro para distinguir de cobranças reais
- Indicação da frequência (Mensal, Semanal, etc.) no card
- Botão "Ver mais" se houver mais de 6 ocorrências projetadas

### Arquivo a editar
- `src/pages/ClientDetails.tsx` — adicionar seção de projeção com `useMemo` + import de `generateRecurringDates` e `frequenciaLabels`

