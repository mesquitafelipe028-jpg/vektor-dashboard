-- Add tipo column to despesas table
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'expense';

-- Add check constraint to ensure only valid types are used
ALTER TABLE public.despesas DROP CONSTRAINT IF EXISTS despesas_tipo_check;
ALTER TABLE public.despesas ADD CONSTRAINT despesas_tipo_check CHECK (tipo IN ('expense', 'investment'));

-- Index for performance when filtering and summing
CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON public.despesas(tipo);
