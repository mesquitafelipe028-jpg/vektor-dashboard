-- Adicionar coluna ocultar_mei à tabela user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS ocultar_mei BOOLEAN DEFAULT false;
