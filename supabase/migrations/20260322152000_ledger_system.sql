-- Refatoração para Ledger Financeiro
-- 1. Criar nova tabela unificada de transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Campos para compatibilidade com recorrência e parcelamento
    tipo_transacao TEXT DEFAULT 'unica',
    frequencia TEXT,
    data_inicio DATE,
    data_fim DATE,
    transacao_pai_id UUID REFERENCES public.transactions(id),
    forma_pagamento TEXT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    tipo_conta TEXT DEFAULT 'pessoal',
    numero_parcelas INTEGER,
    parcela_atual INTEGER,
    tipo_despesa TEXT DEFAULT 'expense' -- 'expense' ou 'investment'
);

-- 2. Criar tabela de ledger (razão financeira)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.contas_financeiras(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL, -- Positivo para receita, Negativo para despesa
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(transaction_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own transactions' AND tablename = 'transactions') THEN
        CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own ledger' AND tablename = 'ledger_entries') THEN
        CREATE POLICY "Users can manage own ledger" ON public.ledger_entries FOR ALL USING (
            EXISTS (SELECT 1 FROM public.contas_financeiras WHERE id = account_id AND user_id = auth.uid())
        );
    END IF;
END $$;

-- 5. Função e Trigger para Ledger
CREATE OR REPLACE FUNCTION public.handle_transaction_ledger_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover entrada se status mudar para pendente ou se dados mudarem drasticamente e precisarem ser regerados
    IF (TG_OP = 'UPDATE') THEN
        DELETE FROM public.ledger_entries WHERE transaction_id = OLD.id;
    END IF;

    -- Criar entrada se status for confirmed
    IF (NEW.status = 'confirmed' AND NEW.account_id IS NOT NULL) THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
        VALUES (
            NEW.id, 
            NEW.account_id, 
            CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ledger ON public.transactions;
CREATE TRIGGER trg_sync_ledger
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_ledger_sync();

-- 6. Migração de Dados Existentes
-- Migrar Receitas
INSERT INTO public.transactions (
    id, user_id, account_id, type, amount, status, date, description, category,
    tipo_transacao, frequencia, data_inicio, data_fim, transacao_pai_id, forma_pagamento, cliente_id, tipo_conta
)
SELECT 
    id, user_id, conta_id, 'income', valor, 
    CASE WHEN status = 'recebido' THEN 'confirmed' ELSE 'pending' END, 
    data, descricao, categoria,
    tipo_transacao, frequencia, data_inicio, data_fim, transacao_pai_id, forma_pagamento, cliente_id, tipo_conta
FROM public.receitas
ON CONFLICT (id) DO NOTHING;

-- Migrar Despesas
INSERT INTO public.transactions (
    id, user_id, account_id, type, amount, status, date, description, category,
    tipo_transacao, frequencia, data_inicio, data_fim, transacao_pai_id, tipo_conta, numero_parcelas, parcela_atual, tipo_despesa
)
SELECT 
    id, user_id, conta_id, 'expense', valor, 
    CASE WHEN status = 'pago' THEN 'confirmed' ELSE 'pending' END, 
    data, descricao, categoria,
    tipo_transacao, frequencia, data_inicio, data_fim, transacao_pai_id, tipo_conta, numero_parcelas, parcela_atual, tipo
FROM public.despesas
ON CONFLICT (id) DO NOTHING;

-- 7. Limpeza (Opcional, mas vamos manter as tabelas antigas por segurança, renomeando-as futuramente se necessário)
-- A coluna 'saldo' em contas_financeiras não será mais utilizada pela lógica do app.
