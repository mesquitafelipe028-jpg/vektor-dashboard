-- 1. Otimização da View de Contas com Saldo
-- Usando CTE para cálculo mais eficiente de agregados
CREATE OR REPLACE VIEW public.v_accounts_with_balance AS
WITH ledger_sums AS (
    SELECT 
        account_id, 
        SUM(amount) as estimated_balance,
        COUNT(*) as entries_count
    FROM public.ledger_entries
    GROUP BY account_id
)
SELECT 
    a.*,
    COALESCE(ls.estimated_balance, 0) as ledger_balance,
    COALESCE(ls.entries_count, 0) as ledger_entries_count
FROM 
    public.contas_financeiras a
LEFT JOIN 
    ledger_sums ls ON a.id = ls.account_id;

-- 2. View para Transações Órfãs (Confirmadas mas sem conta vinculada)
-- Essencial para o cálculo do saldo total "solto" no sistema
CREATE OR REPLACE VIEW public.v_orphaned_transactions AS
SELECT 
    *
FROM 
    public.transactions
WHERE 
    status = 'confirmed' 
    AND account_id IS NULL;

-- 3. Refinamento da Função de Sincronização do Ledger
-- Melhora a resiliência e trata deleções explicitamente
CREATE OR REPLACE FUNCTION public.handle_transaction_ledger_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for UPDATE e mudar status para pending ou mudar conta/valor, limpa o antigo
    IF (TG_OP = 'UPDATE') THEN
        DELETE FROM public.ledger_entries WHERE transaction_id = OLD.id;
    END IF;

    -- Se for DELETE, o ON DELETE CASCADE na tabela ledger_entries cuidará da remoção automatica,
    -- mas vamos manter a lógica limpa para futuras extensões.
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;

    -- Insere apenas se for confirmed e tiver conta
    IF (NEW.status = 'confirmed' AND NEW.account_id IS NOT NULL) THEN
        INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
        VALUES (
            NEW.id, 
            NEW.account_id, 
            CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END
        )
        ON CONFLICT (transaction_id) DO UPDATE 
        SET 
            account_id = EXCLUDED.account_id, 
            amount = EXCLUDED.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Garantir permissões nas novas views
GRANT SELECT ON public.v_accounts_with_balance TO authenticated;
GRANT SELECT ON public.v_orphaned_transactions TO authenticated;
