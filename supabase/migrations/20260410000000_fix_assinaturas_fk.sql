-- A foreign key radar_assinaturas_payment_source_id_fkey força o ID a ser de contas_financeiras.
ALTER TABLE public.radar_assinaturas 
  DROP CONSTRAINT IF EXISTS radar_assinaturas_payment_source_id_fkey;

-- A foreign key transactions_account_id_fkey força a transação a vir de contas_financeiras,
-- bloqueando lançamentos diretos atrelados aos cartões de crédito no campo genérico account_id.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
