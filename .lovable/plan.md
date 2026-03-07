

# Plano: Área de Investimentos no Vektor

## Visão Geral

Criar uma área completa de Investimentos com 4 sub-páginas organizadas por abas (Tabs), acessível via um novo grupo no menu lateral. Requer 2 novas tabelas no Supabase e 4 novos arquivos de código.

## SQL para Supabase (executar antes da implementação)

```sql
-- Tabela de ativos da carteira
CREATE TABLE public.investimento_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('acao', 'fii', 'etf', 'cripto', 'renda_fixa', 'fundo')),
    quantidade NUMERIC NOT NULL DEFAULT 0,
    preco_medio NUMERIC(12,2) NOT NULL DEFAULT 0,
    preco_atual NUMERIC(12,2) DEFAULT 0,
    data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.investimento_ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON public.investimento_ativos FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Tabela de dividendos
CREATE TABLE public.investimento_dividendos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ativo_id UUID REFERENCES public.investimento_ativos(id) ON DELETE CASCADE,
    valor NUMERIC(12,2) NOT NULL,
    data_recebimento DATE NOT NULL,
    tipo TEXT DEFAULT 'dividendo' CHECK (tipo IN ('dividendo', 'jcp', 'rendimento')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.investimento_dividendos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dividends" ON public.investimento_dividendos FOR ALL TO authenticated USING (auth.uid() = user_id);
```

## Arquitetura de Arquivos

| Arquivo | Descrição |
|---|---|
| `src/pages/Investments.tsx` | Página principal com Tabs (Dashboard, Carteira, Dividendos, Simulador) |
| `src/hooks/useInvestments.ts` | Hook com queries/mutations para ativos e dividendos |
| `src/components/layout/AppSidebar.tsx` | Adicionar grupo "Investimentos" no menu |
| `src/App.tsx` | Registrar rota `/investimentos` |

## Estrutura das Abas

### 1. Dashboard de Investimentos
- 4 cards indicadores: Patrimônio total, Lucro/Prejuízo, Dividendos no mês, Dividendos previstos
- Gráfico de evolução patrimonial (AreaChart) baseado nos dados dos ativos

### 2. Carteira
- Tabela/lista de ativos com: nome, tipo (badge colorido), quantidade, preço médio, preço atual, valor total, resultado (%)
- Modal de criação/edição com campos: nome, tipo (select), quantidade, preço médio, preço atual, data compra
- Botão de excluir ativo

### 3. Dividendos
- Resumo: recebidos no mês, acumulados no ano
- Lista de dividendos com: ativo vinculado, valor, data, tipo (dividendo/JCP/rendimento)
- Modal para registrar novo dividendo

### 4. Simulador
- Mover o conteúdo atual de `/calculadora-investimentos` para esta aba
- Manter a rota `/calculadora-investimentos` como redirect para `/investimentos?tab=simulador`

## Navegação

- Novo grupo "Investimentos" no sidebar com ícone `LineChart`, contendo link único para `/investimentos`
- Remover "Calculadora" do grupo "Planejamento" (migra para dentro de Investimentos)

## Detalhes Técnicos

- Hook `useInvestments` usa `@tanstack/react-query` com `supabase` client direto (mesmo padrão de `useAccounts`)
- Cálculos derivados (patrimônio total, lucro/prejuízo) computados client-side via `useMemo`
- Patrimônio = Σ(quantidade × preço_atual) por ativo
- Resultado = ((preço_atual - preço_medio) / preço_medio) × 100

