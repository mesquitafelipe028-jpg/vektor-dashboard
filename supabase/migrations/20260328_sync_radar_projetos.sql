-- ═══════════════════════════════════════════════════════════════
-- Migration: Sync Radar de Assinaturas e Projetos para Supabase
-- Corrige a falta de sincronização desktop/mobile PWA
-- ═══════════════════════════════════════════════════════════════

-- ── Radar de Assinaturas ────────────────────────────────────────
-- Tabela separada da `assinaturas` (que é para planos de cobrança do app)
CREATE TABLE IF NOT EXISTS public.radar_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequencia TEXT NOT NULL DEFAULT 'mensal',
  dia_cobranca INTEGER NOT NULL DEFAULT 1,
  categoria TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  cor TEXT DEFAULT '#8b5cf6',
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.radar_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own radar_assinaturas"
  ON public.radar_assinaturas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own radar_assinaturas"
  ON public.radar_assinaturas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own radar_assinaturas"
  ON public.radar_assinaturas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own radar_assinaturas"
  ON public.radar_assinaturas FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER radar_assinaturas_updated_at
  BEFORE UPDATE ON public.radar_assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Projetos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cliente TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  valor_contrato NUMERIC(12,2),
  data_inicio DATE,
  data_fim DATE,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#8b5cf6',
  lancamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projetos"
  ON public.projetos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projetos"
  ON public.projetos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projetos"
  ON public.projetos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projetos"
  ON public.projetos FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER projetos_updated_at
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Metas de Investimento ────────────────────────────────────────
-- Adiciona colunas de metas à user_preferences (se não existirem)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS meta_patrimonio NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_renda NUMERIC(12,2) DEFAULT 0;
