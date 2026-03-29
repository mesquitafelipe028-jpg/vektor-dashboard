-- =====================================================
-- Conceder acesso PAID (Vitalício + IA ilimitada) para contas específicas
-- =====================================================

-- Atualiza assinaturas existentes para as contas especificadas
UPDATE public.assinaturas
SET
  plan_type       = 'PAID',
  plano           = 'vitalicio',
  status          = 'ativo',
  plan_name       = 'Vitalício com IA',
  features_enabled = '{"ia": true, "billing": true, "advanced_cashflow": true}'::jsonb
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'mesquitafelipe028@gmail.com',
    'elisane0708@gmail.com'
  )
);

-- Caso ainda não exista registro de assinatura para essas contas, insere um novo
INSERT INTO public.assinaturas (user_id, plano, status, plan_type, plan_name, features_enabled)
SELECT
  u.id,
  'vitalicio',
  'ativo',
  'PAID',
  'Vitalício com IA',
  '{"ia": true, "billing": true, "advanced_cashflow": true}'::jsonb
FROM auth.users u
WHERE u.email IN (
  'mesquitafelipe028@gmail.com',
  'elisane0708@gmail.com'
)
AND NOT EXISTS (
  SELECT 1 FROM public.assinaturas a WHERE a.user_id = u.id
);
