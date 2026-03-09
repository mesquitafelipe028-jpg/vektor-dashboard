

## Diagnosis

The `user_preferences` table exists in Supabase (created manually) but is missing from the migration file. The error when saving preferences is almost certainly caused by **missing RLS policies** on the `user_preferences` table. With RLS enabled but no policies, all operations are denied by default.

## Plan

### 1. Create a migration to ensure `user_preferences` has proper RLS policies

Add a new migration that:
- Creates the table if it doesn't exist (idempotent with `IF NOT EXISTS`)
- Enables RLS
- Adds SELECT, INSERT, UPDATE, DELETE policies scoped to `auth.uid() = user_id`

```sql
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alerta_vencimento BOOLEAN NOT NULL DEFAULT true,
  alerta_recebimentos BOOLEAN NOT NULL DEFAULT true,
  alerta_lembretes BOOLEAN NOT NULL DEFAULT false,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  dia_fechamento INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);
```

### 2. Add `user_preferences` to the Supabase generated types

Update `src/integrations/supabase/types.ts` to include the `user_preferences` table definition so we can remove the `(supabase as any)` casts.

### 3. Remove `as any` casts from the hook

Update `src/hooks/useUserPreferences.ts` to use properly typed Supabase calls instead of `(supabase as any)`.

### Files to modify
1. **New migration file** — `supabase/migrations/20260309_user_preferences_rls.sql`
2. **`src/integrations/supabase/types.ts`** — Add `user_preferences` table type
3. **`src/hooks/useUserPreferences.ts`** — Remove `as any` casts

