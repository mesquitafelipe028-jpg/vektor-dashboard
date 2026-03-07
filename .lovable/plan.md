

## Plano: Reorganizar o Dashboard

O Dashboard atual tem muitas seções empilhadas verticalmente, criando uma página longa e repetitiva. Principais problemas identificados:

1. **KPI Cards (3 cards)** + **Secondary Stats (3 cards)** mostram dados redundantes (Faturamento do Mês aparece nos dois grupos)
2. **Card da Empresa/CTA CNPJ** ocupa espaço entre os KPIs e o conteúdo principal
3. **Saldo + Saúde Financeira** poderiam estar mais integrados aos KPIs
4. **Imposto MEI Pendente** nos Secondary Stats é irrelevante sem CNPJ
5. **CategoryIcon em Receitas** (linha 693) ainda usa `r.forma_pagamento` em vez de `r.categoria`

### Mudanças propostas

**1. Consolidar KPIs e eliminar Secondary Stats redundantes**
- Manter os 3 KPI Cards no topo (Faturamento/Receita, Lucro/Despesa, Taxa de Poupança)
- Remover a seção "Secondary Stats" (linhas 573-596) pois repete Faturamento e Despesas
- Mover "Imposto MEI Pendente" para dentro dos Alertas Financeiros (já tem alerta de DAS)

**2. Reorganizar layout em grid de 2 colunas**
- Linha 1: KPI Cards (3 colunas, como está)
- Linha 2: Saldo do Mês + Saúde Financeira (2 colunas, como está)
- Linha 3: Card Empresa/CTA CNPJ (largura total, mais compacto)
- Linha 4: Alertas + Insights lado a lado (se houver)
- Linha 5: Charts (2 colunas)
- Linha 6: Meta Financeira + Resumo Mensal (2 colunas lado a lado)
- Linha 7: Últimas Receitas + Despesas (2 colunas, como está)

**3. Corrigir CategoryIcon nas receitas**
- Linha 693: trocar `r.forma_pagamento` por `r.categoria ?? r.forma_pagamento`

### Arquivos a editar
- `src/pages/Dashboard.tsx` — reorganizar ordem das seções, remover Secondary Stats, ajustar layout

### Resultado
Dashboard mais limpo, sem informação redundante, com melhor hierarquia visual e dados organizados logicamente.

