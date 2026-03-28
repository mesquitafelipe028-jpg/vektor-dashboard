-- =====================================================
-- Refatoração do Sistema de Assinaturas e Trial
-- =====================================================

-- 1. Adicionar campos de trial e tipo de plano na tabela assinaturas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- 2. Atualizar a função de criação de novo usuário para iniciar trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cria o perfil público do usuário
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Cria o registro de assinatura com trial de 5 dias
  INSERT INTO public.assinaturas (user_id, plano, status, plan_type, trial_start_at, trial_expires_at)
  VALUES (
    NEW.id,
    'free',
    'ativo',
    'TRIAL',
    now(),
    now() + INTERVAL '5 days'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Garantir que trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Migrar usuários existentes sem trial (compatibilidade retroativa)
--    Usuários sem plan_type recebem FREE (já ultrapassaram o trial)
UPDATE public.assinaturas
  SET plan_type = 'FREE',
      trial_start_at = created_at,
      trial_expires_at = created_at + INTERVAL '5 days'
  WHERE plan_type = 'FREE' AND trial_start_at IS NULL;

-- 5. Garantir RLS na tabela assinaturas (já existia, mas reforçando)
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas e recriar limpas
DROP POLICY IF EXISTS "Users can view own assinatura" ON public.assinaturas;
DROP POLICY IF EXISTS "Users can insert own assinatura" ON public.assinaturas;
DROP POLICY IF EXISTS "Users can update own assinatura" ON public.assinaturas;

CREATE POLICY "Users can view own assinatura" ON public.assinaturas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assinatura" ON public.assinaturas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assinatura" ON public.assinaturas
  FOR UPDATE USING (auth.uid() = user_id);
