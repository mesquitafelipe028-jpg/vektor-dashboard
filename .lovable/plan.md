

# Vektor -- Sistema Financeiro Inteligente

**Slogan:** "Clareza financeira para quem empreende"

**Público-alvo:** Profissionais autônomos, freelancers e MEI

**Stack:** React + Vite + TypeScript + Tailwind CSS + Supabase (Auth + PostgreSQL) | PWA instalável

---

## Arquitetura

```text
┌─────────────────────────────────────────────────┐
│                   Frontend (PWA)                │
│  React 18 + Vite + Tailwind + Framer Motion     │
├─────────────────────────────────────────────────┤
│              Supabase (Backend)                 │
│  Auth (email/senha) │ PostgreSQL (17 tabelas)   │
│  Edge Functions     │ RLS por usuário           │
│  Storage            │ Realtime                  │
└─────────────────────────────────────────────────┘
```

---

## Fluxo do Usuário

1. **Splash Screen** -- animação da marca Vektor
2. **Login / Cadastro** -- autenticação via Supabase Auth (email + senha)
3. **Onboarding (5 etapas)** -- objetivo (pessoal/MEI/clientes), contas iniciais, categorias, primeira transação, conclusão
4. **Dashboard** -- visão geral financeira
5. **Navegação** -- Sidebar (desktop) / Bottom Nav + menu "Mais" (mobile)

---

## Módulos e Funcionalidades

### 1. Dashboard (`/dashboard`)
- KPIs de topo: Receita, Despesa, Saldo, DAS MEI
- Comparação mês anterior (variação %)
- Toggle Pessoal / MEI / Tudo
- Gráficos: barras (receita vs despesa mensal) + pizza (despesas por categoria)
- Saúde Financeira: score com indicador visual (Excelente/Bom/Atenção/Crítico)
- Alertas inteligentes: limite MEI, DAS pendente, despesas elevadas
- Metas financeiras com progresso
- Últimas transações
- Ações rápidas: Nova Receita, Nova Despesa, Novo Cliente (dropdown "+")
- Quando sem CNPJ: oculta métricas empresariais, mostra banner de convite

### 2. Receitas (`/receitas`)
- Listagem com filtro por mês (MonthNavigator), busca e toggle Pessoal/MEI/Tudo
- Cards responsivos no mobile / tabela no desktop
- Tipos: Única, Recorrente (semanal a anual), com status (Pendente/Recebido/Atrasado)
- Indicadores visuais: 🔁 recorrente, 📅 futura
- Ações: editar, excluir, alterar status inline
- FAB no mobile para nova receita
- Formulário completo (`/receitas/nova`, `/receitas/editar/:id`)

### 3. Despesas (`/despesas`)
- Mesma estrutura de Receitas
- Adiciona: Parcelamento (número de parcelas, parcela atual)
- Geração automática de todas as parcelas no ato da criação
- Classificação Pessoal/MEI
- Transferências internas excluídas dos cálculos consolidados

### 4. Fluxo de Caixa (`/fluxo-de-caixa`)
- Gráfico de área com saldo acumulado ao longo dos meses
- Linha de referência no zero
- Tabela mensal: receitas, despesas, saldo, acumulado
- Detecção automática de padrões recorrentes
- Projeção de próximos 3 meses baseada em histórico
- Tabs: Fluxo / Projeção / Recorrentes

### 5. Clientes (`/clientes`)
- Cadastro completo: nome, email, telefone, CPF/CNPJ, endereço
- Busca inteligente por nome/email/telefone
- Cards mobile / tabela desktop
- **Detalhes do Cliente** (`/clientes/:id`):
  - KPIs: Total Pago, Total em Aberto, Último Pagamento, Próxima Cobrança
  - Próximas cobranças: projeção automática de até 12 ocorrências futuras (sem criar registros)
  - Histórico com status visual (Pago/Pendente/Atrasado)
  - Ações: Registrar Pagamento, Enviar Lembrete (cópia formatada), Nova Cobrança (pré-preenche formulário)

### 6. Contas Financeiras (`/contas`)
- Tipos: banco, carteira, digital
- Campos: nome, banco, saldo, cor, ícone, classificação (pessoal/MEI)
- CRUD completo com identificação visual de bancos

### 7. Cartões de Crédito (`/cartoes`)
- Gestão de cartões: nome, limite total, dia fechamento/vencimento, banco, tipo (pessoal/MEI)
- Limite utilizado e disponível calculados automaticamente
- Registro de compras vinculadas ao cartão
- Gestão de faturas: aberta, fechada, paga
- Gastos no cartão NÃO afetam saldo imediatamente
- Despesa automática gerada apenas quando fatura é marcada como paga
- Cards responsivos no mobile

### 8. Metas Financeiras (`/metas`)
- CRUD de metas: título, valor alvo, prazo, categoria
- Depósitos vinculados com histórico
- Barra de progresso visual (%)
- Gráfico de evolução (AreaChart)
- Cards com troféu quando meta atingida

### 9. Área Fiscal (`/impostos`)
- Controle de DAS MEI mensal
- Cálculo automático de valores por tipo de atividade (comércio/serviço/ambos)
- Acompanhamento do limite anual MEI (R$ 81.000)
- Gráfico de faturamento acumulado vs limite
- Status: em dia, pendente, atrasado
- Alertas quando próximo do limite
- Integração com dados da empresa (CNPJ)

### 10. Relatórios (`/relatorios`)
- Análise mensal comparativa
- Gráficos de barras: receitas vs despesas
- Pizza: distribuição por categoria
- KPIs: receita, despesa, lucro, margem %
- Indicadores de variação mês anterior
- Filtro por período
- Exportação PDF (jsPDF + html2canvas)

### 11. Análise Financeira (`/analise-financeira`)
- Score de saúde financeira
- Top categorias de gasto
- Alertas e recomendações automáticas
- Gráfico comparativo trimestral
- Insights baseados em padrões de gastos

### 12. Simulador de Investimentos (`/calculadora-investimentos`)
- Juros compostos com aportes mensais
- Taxa de rendimento customizável + presets (6%, 10%, 14%)
- Desconto de inflação (opcional)
- Gráfico de evolução: acumulado vs investido
- Resultado: montante final, total investido, juros ganhos

### 13. Categorias (`/categorias`)
- Gestão de categorias de receita e despesa
- Ícones customizáveis (biblioteca Lucide completa)
- Cores customizáveis
- Categorias hierárquicas (pai/filho)
- Tabs: Despesas / Receitas
- Reset para categorias padrão

### 14. Configurações (`/configuracoes`)
- **Conta:** nome, email (somente leitura), senha
- **Aparência:** tema (claro/escuro/sistema)
- **Empresa:** cadastro CNPJ com busca automática (API ReceitaWS), razão social, nome fantasia, CNAE, natureza jurídica
- **Notificações:** alertas de vencimento, resumo semanal
- **Financeiro:** moeda padrão, primeiro dia da semana
- **Sistema:** exportar dados, limpar dados, excluir conta
- Busca para filtrar itens dinamicamente
- Animações staggered

---

## Recursos Técnicos

- **PWA:** manifesto + service worker (vite-plugin-pwa), instalável em mobile
- **Autenticação:** Supabase Auth com persistência de sessão e auto-refresh
- **Banco de dados:** 17 tabelas PostgreSQL com RLS (Row Level Security) por `auth.uid()`
- **Lazy Loading:** todas as páginas carregadas sob demanda (React.lazy + Suspense)
- **Cache:** React Query com staleTime 5min, gcTime 10min
- **Transações recorrentes:** Lazy Generation via `useRecurringGenerator` -- gera ocorrências conforme o tempo avança
- **Responsividade:** layout adaptativo com `useIsMobile()` -- cards no mobile, tabelas no desktop
- **Temas:** claro/escuro/sistema via next-themes
- **Animações:** Framer Motion em cards, modais, navegação
- **Gráficos:** Recharts (BarChart, PieChart, AreaChart, LineChart)
- **Exportação:** PDF via jsPDF + html2canvas
- **Splash Screen:** animação de entrada da marca

---

## Banco de Dados (17 tabelas)

| Tabela | Finalidade |
|--------|-----------|
| `profiles` | Dados do usuário (nome) |
| `receitas` | Transações de entrada |
| `despesas` | Transações de saída |
| `clientes` | Base de clientes |
| `categorias` | Categorias hierárquicas |
| `impostos_mei` | Controle DAS MEI |
| `assinaturas` | Assinaturas/planos |
| `empresas` | Dados empresa/CNPJ |
| `contas_financeiras` | Contas bancárias/carteiras |
| `cartoes_credito` | Cartões de crédito |
| `compras_cartao` | Compras no cartão |
| `faturas_cartao` | Faturas mensais |
| `metas_financeiras` | Metas de economia |
| `depositos_meta` | Depósitos nas metas |
| `investimento_ativos` | Ativos de investimento |
| `investimento_dividendos` | Dividendos recebidos |
| `user_preferences` | Preferências do usuário |

---

## Navegação

**Desktop (Sidebar):**
- Visão Geral: Dashboard, Fluxo de Caixa
- Finanças: Receitas, Despesas, Contas, Cartões, Clientes
- Investimentos: Simulador
- Planejamento: Metas, Análise Financeira, Relatórios
- Fiscal: Área Fiscal
- Sistema: Configurações
- Ações Rápidas: Nova Receita, Nova Despesa, Novo Cliente
- Busca integrada na sidebar

**Mobile (Bottom Nav):**
- Dashboard | Receitas | FAB (+) | Despesas | Mais (...)
- FAB abre: Nova Receita, Nova Despesa, Novo Cliente
- Menu "Mais": acesso a todos os módulos em grid 3 colunas

