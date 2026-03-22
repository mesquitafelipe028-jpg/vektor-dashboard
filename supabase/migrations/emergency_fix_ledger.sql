-- ==========================================================
-- SCRIPT DE CORREÇÃO DEFINITIVO (V2)
-- Execute este script no SQL Editor do Supabase
-- ==========================================================

-- 1. Garantir que a coluna user_id existe em ledger_entries (se a tabela já existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ledger_entries' AND column_name='user_id') THEN
        ALTER TABLE public.ledger_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Garantir tabelas e RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own ledger' AND tablename = 'ledger_entries') THEN
        CREATE POLICY "Users can manage own ledger" ON public.ledger_entries FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own transactions' AND tablename = 'transactions') THEN
        CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Remover coluna saldo se existir em contas_financeiras
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_financeiras' AND column_name='saldo') THEN
        ALTER TABLE public.contas_financeiras DROP COLUMN saldo;
    END IF;
END $$;

-- 4. Funções e Triggers (SECURITY DEFINER essencial para o ledger)
CREATE OR REPLACE FUNCTION public.handle_transaction_ledger_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Limpar registro antigo se houver
    DELETE FROM public.ledger_entries WHERE transaction_id = OLD.id;

    -- Inserir novo se confirmado e vinculado a conta
    IF (NEW.status = 'confirmed' AND NEW.account_id IS NOT NULL) THEN
        INSERT INTO public.ledger_entries (user_id, account_id, transaction_id, amount)
        VALUES (
            NEW.user_id, 
            NEW.account_id, 
            NEW.id, 
            CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_transaction_ledger_sync ON public.transactions;
CREATE TRIGGER tr_transaction_ledger_sync
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_ledger_sync();

-- 5. Recriar View de Saldos com Security Invoker
DROP VIEW IF EXISTS public.v_accounts_with_balance;
CREATE OR REPLACE VIEW public.v_accounts_with_balance 
WITH (security_invoker = true)
AS
SELECT 
    a.*,
    COALESCE((SELECT SUM(l.amount) FROM public.ledger_entries l WHERE l.account_id = a.id), 0) as ledger_balance
FROM 
    public.contas_financeiras a;

GRANT SELECT ON public.v_accounts_with_balance TO authenticated;
GRANT SELECT ON public.v_accounts_with_balance TO service_role;

-- 6. Populando dados no Ledger baseado no histórico de transações
-- Preenche o user_id baseado na transação original
INSERT INTO public.ledger_entries (user_id, account_id, transaction_id, amount)
SELECT 
    user_id, 
    account_id, 
    id, 
    CASE WHEN type = 'income' THEN amount ELSE -amount END
FROM 
    public.transactions
WHERE 
    account_id IS NOT NULL 
    AND status = 'confirmed'
    AND id NOT IN (SELECT transaction_id FROM public.ledger_entries)
ON CONFLICT (transaction_id) DO NOTHING;
