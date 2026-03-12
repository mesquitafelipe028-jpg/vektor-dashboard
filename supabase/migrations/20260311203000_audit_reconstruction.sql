-- Consolidação de Esquema Pós-Auditoria
-- Este arquivo unifica as tabelas e colunas que estavam apenas no banco remoto/código

-- 1. Extensão de tabelas existentes
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS tipo_transacao TEXT DEFAULT 'unica',
ADD COLUMN IF NOT EXISTS frequencia TEXT,
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE,
ADD COLUMN IF NOT EXISTS transacao_pai_id UUID REFERENCES public.receitas(id),
ADD COLUMN IF NOT EXISTS conta_id UUID,
ADD COLUMN IF NOT EXISTS tipo_conta TEXT DEFAULT 'mei';

ALTER TABLE public.despesas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS tipo_transacao TEXT DEFAULT 'unica',
ADD COLUMN IF NOT EXISTS frequencia TEXT,
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER,
ADD COLUMN IF NOT EXISTS parcela_atual INTEGER,
ADD COLUMN IF NOT EXISTS transacao_pai_id UUID REFERENCES public.despesas(id),
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE,
ADD COLUMN IF NOT EXISTS tipo_conta TEXT DEFAULT 'mei';

ALTER TABLE public.categorias
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'despesa',
ADD COLUMN IF NOT EXISTS categoria_pai_id UUID REFERENCES public.categorias(id),
ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- 2. Criação de tabelas órfãs

-- Contas Financeiras
CREATE TABLE IF NOT EXISTS public.contas_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    banco_id TEXT,
    saldo NUMERIC(12,2) DEFAULT 0,
    cor TEXT,
    icone TEXT,
    classificacao TEXT DEFAULT 'pessoal',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cartões de Crédito
CREATE TABLE IF NOT EXISTS public.cartoes_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    limite_total NUMERIC(12,2) DEFAULT 0,
    dia_fechamento INTEGER DEFAULT 1,
    dia_vencimento INTEGER DEFAULT 10,
    tipo_conta TEXT DEFAULT 'pessoal',
    banco TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras_cartao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cartao_id UUID NOT NULL REFERENCES public.cartoes_credito(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data DATE NOT NULL,
    categoria TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faturas_cartao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cartao_id UUID NOT NULL REFERENCES public.cartoes_credito(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    valor_total NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    data_pagamento DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Metas Financeiras
CREATE TABLE IF NOT EXISTS public.metas_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    valor_alvo NUMERIC(12,2) NOT NULL,
    valor_atual NUMERIC(12,2) DEFAULT 0,
    prazo DATE,
    categoria TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.depositos_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meta_id UUID NOT NULL REFERENCES public.metas_financeiras(id) ON DELETE CASCADE,
    valor NUMERIC(12,2) NOT NULL,
    descricao TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Preferências e Empresa
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    alerta_vencimento BOOLEAN DEFAULT true,
    alerta_recebimentos BOOLEAN DEFAULT true,
    alerta_lembretes BOOLEAN DEFAULT false,
    moeda TEXT DEFAULT 'BRL',
    dia_fechamento INTEGER DEFAULT 20,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    cnpj TEXT,
    razao_social TEXT,
    nome_fantasia TEXT,
    data_abertura DATE,
    situacao_cadastral TEXT,
    cnae_principal TEXT,
    natureza_juridica TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Investimentos
CREATE TABLE IF NOT EXISTS public.investimento_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    quantidade NUMERIC(12,4) DEFAULT 0,
    preco_medio NUMERIC(12,4) DEFAULT 0,
    preco_atual NUMERIC(12,4) DEFAULT 0,
    data_compra DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investimento_dividendos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ativo_id UUID REFERENCES public.investimento_ativos(id) ON DELETE SET NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_recebimento DATE NOT NULL,
    tipo TEXT DEFAULT 'dividendo',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS) e Políticas Idempotentes
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimento_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimento_dividendos ENABLE ROW LEVEL SECURITY;

-- Helper para criar políticas apenas se não existirem
DO $$ 
BEGIN
    -- Política contas_financeiras
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own accounts' AND tablename = 'contas_financeiras') THEN
        CREATE POLICY "Users can manage own accounts" ON public.contas_financeiras FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política cartoes_credito
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own cards' AND tablename = 'cartoes_credito') THEN
        CREATE POLICY "Users can manage own cards" ON public.cartoes_credito FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política compras_cartao
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own card purchases' AND tablename = 'compras_cartao') THEN
        CREATE POLICY "Users can manage own card purchases" ON public.compras_cartao FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política faturas_cartao
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own card invoices' AND tablename = 'faturas_cartao') THEN
        CREATE POLICY "Users can manage own card invoices" ON public.faturas_cartao FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política metas_financeiras
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own goals' AND tablename = 'metas_financeiras') THEN
        CREATE POLICY "Users can manage own goals" ON public.metas_financeiras FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política depositos_meta
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own goal deposits' AND tablename = 'depositos_meta') THEN
        CREATE POLICY "Users can manage own goal deposits" ON public.depositos_meta FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política user_preferences
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own preferences' AND tablename = 'user_preferences') THEN
        CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política empresas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own company' AND tablename = 'empresas') THEN
        CREATE POLICY "Users can manage own company" ON public.empresas FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política investimento_ativos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own assets' AND tablename = 'investimento_ativos') THEN
        CREATE POLICY "Users can manage own assets" ON public.investimento_ativos FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Política investimento_dividendos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own dividends' AND tablename = 'investimento_dividendos') THEN
        CREATE POLICY "Users can manage own dividends" ON public.investimento_dividendos FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
