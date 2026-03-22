-- ==========================================================
-- SCRIPT DE RESET MESTRE E LIMPEZA DE DUPLICATAS
-- Execute este script no SQL Editor do Supabase
-- ==========================================================

-- 1. Remover TODOS os gatilhos antigos para evitar execução múltipla
DROP TRIGGER IF EXISTS trg_sync_ledger ON public.transactions;
DROP TRIGGER IF EXISTS tr_transaction_ledger_sync ON public.transactions;
DROP TRIGGER IF EXISTS trg_transactions_ledger_sync ON public.transactions;
DROP TRIGGER IF EXISTS sync_ledger_trigger ON public.transactions;

-- 2. Limpar a tabela de ledger para reconstrução limpa
TRUNCATE TABLE public.ledger_entries CASCADE;

-- 3. Identificar e Remover Transações Duplicadas na tabela base
-- Consideramos duplicata se tiverem mesma descrição, valor, data, tipo e conta, criadas no mesmo segundo.
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id, description, amount, date, type, account_id, date_trunc('second', created_at)
        ORDER BY created_at
    ) as row_num
    FROM public.transactions
)
DELETE FROM public.transactions
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 4. Função de Sincronização Unificada (Segurança Definer)
CREATE OR REPLACE FUNCTION public.handle_transaction_ledger_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Limpeza preventiva de qualquer registro órfão de ledger para este ID
    DELETE FROM public.ledger_entries WHERE transaction_id = OLD.id;

    -- Registrar no ledger apenas se confirmado e vinculado a uma conta
    IF (NEW.status = 'confirmed' AND NEW.account_id IS NOT NULL) THEN
        INSERT INTO public.ledger_entries (user_id, account_id, transaction_id, amount)
        VALUES (
            NEW.user_id, 
            NEW.account_id, 
            NEW.id, 
            CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END
        )
        ON CONFLICT (transaction_id) DO UPDATE 
        SET amount = EXCLUDED.amount, account_id = EXCLUDED.account_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar o Gatilho Único e Definitivo
CREATE TRIGGER tr_unified_ledger_sync
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_ledger_sync();

-- 6. Reconstruir o Ledger baseado no estado atual da tabela transactions
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
ON CONFLICT (transaction_id) DO UPDATE 
SET amount = EXCLUDED.amount;

-- 7. Garantir que a View de Saldos está correta
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
