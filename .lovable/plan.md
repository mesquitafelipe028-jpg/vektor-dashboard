

# Reestruturar Área de Investimentos Inspirada no Investidor10

## Visão Geral

Redesenhar completamente `src/pages/Investments.tsx` com visual e estrutura inspirados no Investidor10: cards de indicadores com cores distintas (verde/vermelho para variação), layout mais profissional com seções bem definidas, e melhor organização visual da carteira.

## Mudanças Principais

### 1. Dashboard - Redesign Visual
- **Barra de resumo** no topo com cards coloridos estilo Investidor10 (fundo com gradiente sutil, labels no topo, valores grandes centralizados)
- 5 indicadores: Patrimônio Total, Variação Total (%), Total Investido, Dividendos (mês), Dividendos (ano)
- Cores: verde para positivo, vermelho para negativo, tons neutros para informativo
- **Gráfico de evolução** com seletor de período (1M, 6M, 1A, Total)
- **Composição da carteira** com PieChart por tipo de ativo (Ações, FIIs, ETFs, etc.)
- **Rankings pessoais**: Melhores rendimentos, Maiores posições, Maiores pagadores de dividendos - em cards lado a lado estilo Investidor10

### 2. Carteira - Layout Profissional
- Cards individuais por ativo (em vez de tabela pura) com:
  - Nome e ticker em destaque
  - Badge colorido por tipo
  - Cotação atual grande
  - Variação % com seta verde/vermelha
  - Valor total da posição
  - Preço médio e quantidade em texto menor
- Filtros por tipo de ativo (Ações, FIIs, ETFs, Cripto, Renda Fixa, Fundos) como chips/tabs horizontais
- Manter modal de criação existente

### 3. Dividendos - Painel Aprimorado
- Cards de resumo: Recebidos no mês, Acumulado no ano, Yield médio da carteira
- Gráfico de barras de dividendos por mês (últimos 12 meses)
- Lista de dividendos mantida mas com visual melhorado

### 4. Simulador
- Manter lógica atual, sem alterações significativas

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/pages/Investments.tsx` | Reescrever completo com novo layout |

## Detalhes Técnicos

- Usar `PieChart` do recharts para composição da carteira
- Usar `BarChart` do recharts para dividendos mensais
- Filtros de tipo usam estado local, sem queries adicionais
- Dados continuam vindo do hook `useInvestments` existente (sem mudanças no backend)
- Rankings pessoais calculados client-side via `useMemo` ordenando ativos por resultado %

