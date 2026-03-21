import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRef, useCallback } from "react";
import { Tables } from "@/integrations/supabase/types";

export interface UserPreferences {
  alerta_vencimento: boolean;
  alerta_recebimentos: boolean;
  alerta_lembretes: boolean;
  moeda: string;
  dia_fechamento: number;
  onboarding_completed: boolean;
  ocultar_mei: boolean;
}

const defaults: UserPreferences = {
  alerta_vencimento: true,
  alerta_recebimentos: true,
  alerta_lembretes: false,
  moeda: "BRL",
  dia_fechamento: 20,
  onboarding_completed: false,
  ocultar_mei: false,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      
      const dbPrefs = data || {};
      
      // Load local-only preferences from localStorage
      const localOnboarding = localStorage.getItem(`vektor_onboarding_done_${user!.id}`) === "true";
      const localOcultarMei = localStorage.getItem(`vektor_ocultar_mei_${user!.id}`) === "true";
      
      return {
        alerta_vencimento: dbPrefs.alerta_vencimento ?? defaults.alerta_vencimento,
        alerta_recebimentos: dbPrefs.alerta_recebimentos ?? defaults.alerta_recebimentos,
        alerta_lembretes: dbPrefs.alerta_lembretes ?? defaults.alerta_lembretes,
        moeda: dbPrefs.moeda ?? defaults.moeda,
        dia_fechamento: dbPrefs.dia_fechamento ?? defaults.dia_fechamento,
        ocultar_mei: localOcultarMei || (dbPrefs as any).ocultar_mei || defaults.ocultar_mei,
        onboarding_completed: localOnboarding || (dbPrefs as any).onboarding_completed || defaults.onboarding_completed,
      } as UserPreferences;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Partial<UserPreferences>) => {
      if (!user) return;

      // Persist local-only fields specifically
      if (payload.onboarding_completed !== undefined) {
        localStorage.setItem(`vektor_onboarding_done_${user.id}`, String(payload.onboarding_completed));
      }
      if (payload.ocultar_mei !== undefined) {
        localStorage.setItem(`vektor_ocultar_mei_${user.id}`, String(payload.ocultar_mei));
      }

      // Filter out fields that don't exist in the DB schema to avoid 400 errors
      const { onboarding_completed, ocultar_mei, ...dbUpdates } = payload;
      
      // If there are no DB fields to update, we just return
      if (Object.keys(dbUpdates).length === 0) return;

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update(dbUpdates as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, ...dbUpdates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_preferences", user?.id] });
    },
    onError: (err: any) => {
      console.error("Erro ao salvar preferências:", err);
      // Se o erro for sobre coluna inexistente, não mostramos toast pois já salvamos no localStorage
      if (err?.message?.includes("column") || err?.message?.includes("cache")) {
        return;
      }
      toast.error("Erro ao salvar preferência");
    },
  });

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    // Optimistic update (instant UI feedback)
    queryClient.setQueryData(["user_preferences", user?.id], (old: UserPreferences | undefined) => ({
      ...(old ?? defaults),
      [key]: value,
    }));

    // Debounce the actual API call
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      mutation.mutate({ [key]: value });
    }, 500);
  }, [user?.id, queryClient, mutation]);

  return {
    preferences: (query.data ?? defaults) as UserPreferences,
    isLoading: query.isLoading,
    updatePreference,
  };
}
