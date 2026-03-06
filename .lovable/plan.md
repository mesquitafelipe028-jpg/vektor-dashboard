

## Análise: O que já existe vs O que falta

### Já implementado (descartar):
- **Estado vazio inteligente no módulo Clientes** — Já existe (linhas 276-291) com ícone UserPlus, título, descrição e botão "Cadastrar Primeiro Cliente"
- **Gráfico de Faturamento Mensal (linha)** — Já existe no Dashboard (LineChart "Evolução do Faturamento")
- **Gráfico Receitas vs Despesas (barras)** — Já existe no Dashboard (BarChart)
- **Ícones nos cards** — Já existem (TrendingUp, TrendingDown, Wallet, Receipt)
- **Insights Financeiros** — Já implementado com hook dedicado e cards animados

### A implementar:

**1. Card de Saúde Financeira**
Novo card no Dashboard que calcula o percentual de despesas sobre faturamento e exibe status com cores:
- Verde (Saudável): despesas < 50%
- Amarelo (Atenção): 50%–75%
- Vermelho (Crítico): > 75%
Inclui lucro do mês e percentual de despesas.

**2. Gráfico Despesas por Categoria (Pizza/Donut)**
Substituir o gráfico de linha "Evolução do Faturamento" por um PieChart de despesas por categoria (já existe na página Reports, trazer para o Dashboard).

**3. Reorganizar hierarquia visual**
- Saldo do mês como card destacado (maior, ocupando largura total ou metade com destaque visual)
- Reordenar: Saldo → Faturamento → Despesas → Imposto MEI
- Card Saúde Financeira ao lado do Saldo destacado

**4. CTAs de Ação Rápida**
Dois botões no topo do Dashboard (abaixo do título, acima dos cards):
- "Registrar Receita" → navega para `/receitas` com dialog aberto (ou abre dialog inline)
- "Registrar Despesa" → navega para `/despesas`

**5. Melhorar espaçamento e separação visual**
Ajustar padding, adicionar separadores visuais entre seções e garantir responsividade mobile.

### Arquivo afetado
- `src/pages/Dashboard.tsx` — todas as mudanças concentradas aqui

### Estrutura final do Dashboard (de cima para baixo):
```text
┌─────────────────────────────────────────────┐
│ Dashboard          [+ Receita] [+ Despesa]  │
├──────────────────────┬──────────────────────┤
│   SALDO DO MÊS      │  SAÚDE FINANCEIRA    │
│   R$ 3.200 (grande)  │  Saudável ● 42%     │
├───────┬───────┬──────┴──────────────────────┤
│ Fatur.│ Desp. │ Imposto MEI                 │
├───────┴───────┴─────────────────────────────┤
│ Insights Financeiros (já existente)         │
├─────────────────────┬───────────────────────┤
│ Receitas vs Despesas│ Despesas por Categoria│
│ (BarChart)          │ (PieChart - NOVO)     │
├─────────────────────┴───────────────────────┤
│ Últimas Receitas  │ Últimas Despesas        │
└─────────────────────────────────────────────┘
```

