-- Adicionar coluna onboarding_completed à tabela user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
