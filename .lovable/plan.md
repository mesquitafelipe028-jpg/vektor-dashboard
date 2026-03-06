

## Plano: Melhorar Layout do Fluxo de Caixa

O layout atual tem três blocos empilhados verticalmente (cards, gráfico, tabela longa) sem hierarquia visual clara. A melhoria foca em organização, legibilidade e separação visual.

### Mudanças propostas em `src/pages/CashFlow.tsx`:

**1. Cards de resumo com melhor destaque visual**
- Saldo Atual ganha destaque como card maior (span 2 colunas em desktop), com valor maior e indicador visual de positivo/negativo
- Os outros 3 cards ficam menores ao lado, em grid 1x3

**2. Layout em duas colunas para gráfico + resumo lateral**
- Gráfico de projeção ocupa 2/3 da largura (lg:col-span-2)
- Novo card lateral (1/3) com mini-resumo: lista das próximas 5 movimentações futuras com data, tipo e valor — dá contexto rápido sem precisar rolar até a tabela

**3. Tabela de movimentações com tabs e filtros**
- Adicionar tabs: "Todas", "Receitas", "Despesas" para filtrar a tabela
- Limitar exibição inicial a 20 itens com botão "Ver mais"
- Adicionar indicador visual na linha separando passado/futuro (linha divisória "Hoje")
- Badge com cores mais distintas: verde para receita, vermelho para despesa (ao invés de default/secondary)

**4. Ajustes visuais gerais**
- Tooltip do gráfico estilizado com fundo card e borda
- Espaçamento mais generoso entre seções
- Descrição do header mais informativa mostrando o período exibido

### Arquivo afetado
- `src/pages/CashFlow.tsx` — reescrita do layout

