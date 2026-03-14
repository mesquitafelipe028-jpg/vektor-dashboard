-- Adicionar coluna categoria na tabela de receitas para paridade com despesas
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral';

-- Atualizar RLS se necessário (já deve estar coberto pelo ALL)
