-- Criação da tabela de persistência do Agente Inteligente
CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: o usuário só vê as próprias mensagens
CREATE POLICY "Users can view own assistant messages" ON public.assistant_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistant messages" ON public.assistant_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistant messages" ON public.assistant_messages
    FOR DELETE USING (auth.uid() = user_id);
