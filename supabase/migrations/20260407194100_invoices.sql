-- Create the invoices table
CREATE TABLE IF NOT EXISTS public.credit_card_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.contas_financeiras(id) ON DELETE CASCADE, -- the credit card account
  source TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  minimum_payment NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed' (paid), 'processing'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invoices"
  ON public.credit_card_invoices
  FOR ALL
  USING (auth.uid() = user_id);

-- Alter transactions table to link to an invoice
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL;

-- Notify postgrest to reload schema for typings (optional depending on tooling, but good practice in supabase)
NOTIFY pgrst, 'reload schema';
