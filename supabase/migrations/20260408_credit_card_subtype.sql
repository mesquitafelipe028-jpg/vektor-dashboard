-- Adds the subtype column so we can differentiate credit card expenses without breaking the enums
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS subtype TEXT;

ALTER TABLE public.credit_card_invoices
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER;

-- We want credit_card expenses to NOT affect the ledger_entries (aka the physical accounts balance)
-- To ensure this, we must update the handle_transaction_ledger_sync() 
-- ONLY payment types (or regular expenses) go to the ledger.
-- credit_card_expense drops out of the physical ledger!

CREATE OR REPLACE FUNCTION public.handle_transaction_ledger_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        DELETE FROM public.ledger_entries WHERE transaction_id = OLD.id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;

    -- Only allow things that are confirmed, have an account, AND are NOT just virtual credit card expenses
    IF (NEW.status = 'confirmed' AND NEW.account_id IS NOT NULL AND (NEW.subtype IS NULL OR NEW.subtype != 'credit_card_expense')) THEN
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

-- Notify postgrest
NOTIFY pgrst, 'reload schema';
