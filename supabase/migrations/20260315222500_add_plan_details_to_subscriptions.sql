-- Atualizar tabela de assinaturas para suportar o novo sistema de planos
ALTER TABLE public.assinaturas 
ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS transaction_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS ai_message_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{"ia": false, "billing": false, "advanced_cashflow": false}'::jsonb;

-- Atualizar planos existentes (se houver) para o padrão Free
UPDATE public.assinaturas SET 
  plan_name = 'Free',
  billing_type = 'free',
  transaction_limit = 50,
  ai_message_limit = 0,
  features_enabled = '{"ia": false, "billing": false, "advanced_cashflow": false}'::jsonb
WHERE plan_name IS NULL OR plan_name = 'free';

-- Criar política para que o sistema possa atualizar planos se necessário (opcional, dependendo de como o upgrade será feito)
-- Normalmente upgrades são feitos via Edge Functions ou Admin bypass, mas garantimos que o usuário veja
