-- View para contas com saldo calculado via ledger
CREATE OR REPLACE VIEW public.v_accounts_with_balance AS
SELECT 
    a.*,
    COALESCE((SELECT SUM(l.amount) FROM public.ledger_entries l WHERE l.account_id = a.id), 0) as ledger_balance
FROM 
    public.contas_financeiras a;

-- Garantir acesso à view
ALTER VIEW public.v_accounts_with_balance OWNER TO postgres;
GRANT SELECT ON public.v_accounts_with_balance TO authenticated;
GRANT SELECT ON public.v_accounts_with_balance TO service_role;
