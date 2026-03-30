-- =====================================================
-- Setup da Conta Demonstrativa Vektor
-- =====================================================

-- 1. Adicionar coluna is_demo na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- 2. Adicionar coluna is_demo em assinaturas (para rastreamento)
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- =====================================================
-- Políticas de proteção dos dados da conta demo
-- Impede DELETE e UPDATE nas transactions do usuário demo
-- As políticas existentes (FOR ALL) precisam ser substituídas
-- =====================================================

-- Remover política genérica existente de transactions para recriar com proteção demo
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;

-- Recriar política de SELECT (todos podem ver os próprios)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own transactions' AND tablename = 'transactions') THEN
    CREATE POLICY "Users can select own transactions"
      ON public.transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- INSERT: qualquer usuário autenticado pode inserir nas próprias contas
-- (mas o seed vai inserir como service_role, então vai funcionar)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own transactions' AND tablename = 'transactions') THEN
    CREATE POLICY "Users can insert own transactions"
      ON public.transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- UPDATE: bloqueado para conta demo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own non-demo transactions' AND tablename = 'transactions') THEN
    CREATE POLICY "Users can update own non-demo transactions"
      ON public.transactions FOR UPDATE
      USING (
        auth.uid() = user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_demo = true
        )
      );
  END IF;
END $$;

-- DELETE: bloqueado para conta demo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own non-demo transactions' AND tablename = 'transactions') THEN
    CREATE POLICY "Users can delete own non-demo transactions"
      ON public.transactions FOR DELETE
      USING (
        auth.uid() = user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_demo = true
        )
      );
  END IF;
END $$;

-- =====================================================
-- Mesma proteção para contas_financeiras da demo
-- =====================================================

-- DELETE bloqueado para conta demo em contas_financeiras
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Demo cannot delete accounts' AND tablename = 'contas_financeiras') THEN
    CREATE POLICY "Demo cannot delete accounts"
      ON public.contas_financeiras FOR DELETE
      USING (
        auth.uid() = user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_demo = true
        )
      );
  END IF;
END $$;
