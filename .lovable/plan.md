

# Reestruturação Completa da Área de Investimentos

## Visão Geral

Reescrever `src/pages/Investments.tsx` com todas as melhorias solicitadas: cabeçalho com nome da carteira e período, hero de patrimônio expandido (5 KPIs incluindo rentabilidade mês/ano), tabela de ativos mais rica (com dividend yield e colunas extras), bloco de metas de investimento, agenda de dividendos, estado vazio com wizard de onboarding, e simulador pré-preenchido com patrimônio atual.

## Mudanças por Seção

### 1. Cabeçalho da Carteira (novo)
- Título "Carteira Geral - março 2026" dinâmico com mês/ano atual
- Botões: "Adicionar ativo", "Novo lançamento" (dividendo), "Importar da B3" (desabilitado, badge "Em breve")

### 2. Hero de Patrimônio (expandido)
- 5 cards: Patrimônio real atual, Lucro/Prejuízo (R$ e %), Rentabilidade no mês (%), Dividendos no mês, Dividendos no ano
- Rentabilidade no mês calculada comparando patrimônio atual vs início do mês (aproximação baseada em aportes do mês)

### 3. Dashboard Visual (melhorado)
- PieChart de alocação por classe (mantém)
- AreaChart de evolução com **duas linhas**: patrimônio total + linha de aportes
- BarChart de dividendos por mês (últimos 12 meses) - movido para o dashboard

### 4. Tabela "Meus Ativos" (substituir cards por tabela rica)
- Colunas: Código/Nome, Tipo, Qtd, PM, Preço Atual, Variação %, DY 12m (calculado dos dividendos), Valor Investido, Valor Atual, Resultado R$
- Filtros por tipo mantidos como chips
- Campo de nota/tag por ativo (novo campo `nota` no formulário, armazenado client-side por enquanto)
- Botão "Editar colunas" que mostra/oculta colunas via checkboxes em popover

### 5. Dividendos (aprimorado)
- Card "Agenda de Dividendos / Próximos Proventos" com lista de próximos pagamentos
- Tabela de dividendos do mês com: Ativo, Data, Tipo, Valor R$, Yield sobre custo
- Gráfico de barras mensal mantido
- Filtro por mês (mostrar ativos que costumam pagar naquele mês)

### 6. Metas de Investimento (novo bloco no Dashboard)
- Meta de patrimônio (input editável, salvo em localStorage)
- Meta de renda mensal em dividendos (input editável, salvo em localStorage)
- Barras de progresso: "Você está em X% da sua meta de patrimônio" / "X% da meta de renda mensal"

### 7. Simulador (melhorado)
- Pré-preencher "Quanto você possui?" com patrimônio atual da carteira
- Mostrar montante futuro nominal E real (descontada inflação) lado a lado
- Botão "Comparar cenários" que permite simular 3 taxas simultaneamente (6%, 10%, 14%) com gráfico sobreposto
- Botão "Salvar como meta" que seta o resultado como meta de patrimônio

### 8. Estado Vazio com Onboarding (novo)
- Quando sem ativos, mostrar wizard visual com 4 passos:
  1. "Cadastre seus ativos"
  2. "Veja sua alocação e evolução"
  3. "Acompanhe dividendos"
  4. "Defina metas e simule aportes"
- CTA principal: "Cadastre seu primeiro ativo"
- CTA secundário: "Simule uma carteira fictícia" (preenche dados demo)

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/pages/Investments.tsx` | Reescrita completa (~1500 linhas) |

## Detalhes Técnicos

- Metas armazenadas em `localStorage` (chaves `vektor_meta_patrimonio`, `vektor_meta_renda`) para evitar nova tabela no Supabase
- DY 12m por ativo = soma dividendos últimos 12 meses / valor investido no ativo × 100
- Comparação de cenários: roda `calcCompoundInterest` 3x com taxas diferentes, plota 3 linhas no mesmo AreaChart
- Colunas visíveis gerenciadas via estado local com `useState<string[]>` e Popover com checkboxes
- Dados demo para onboarding: array estático de 5 ativos fictícios inseridos temporariamente no state (sem salvar no banco)

