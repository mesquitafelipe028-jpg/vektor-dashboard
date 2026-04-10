-- Adiciona campos de pagamento na tabela radar_assinaturas
ALTER TABLE public.radar_assinaturas 
ADD COLUMN IF NOT EXISTS payment_source_type TEXT CHECK (payment_source_type IN ('account', 'credit_card')),
ADD COLUMN IF NOT EXISTS payment_source_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
ADD COLUMN IF NOT EXISTS last_paid_month TEXT;

-- Adiciona campo de referencia flexível na tabela de transações
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Atualizar schema do postgREST
NOTIFY pgrst, 'reload schema';
