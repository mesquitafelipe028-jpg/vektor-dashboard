import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InvestimentoAtivo {
  id: string;
  user_id: string;
  nome: string;
  tipo: "acao" | "fii" | "etf" | "cripto" | "renda_fixa" | "fundo";
  quantidade: number;
  preco_medio: number;
  preco_atual: number;
  data_compra: string;
  created_at: string;
}

export interface InvestimentoAtivoInsert {
  nome: string;
  tipo: string;
  quantidade: number;
  preco_medio: number;
  preco_atual?: number;
  data_compra: string;
}

export interface InvestimentoDividendo {
  id: string;
  user_id: string;
  ativo_id: string | null;
  valor: number;
  data_recebimento: string;
  tipo: "dividendo" | "jcp" | "rendimento";
  created_at: string;
}

export interface InvestimentoDividendoInsert {
  ativo_id?: string | null;
  valor: number;
  data_recebimento: string;
  tipo?: string;
}

// Use untyped client for tables not yet in generated types
const db = supabase as any;

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const ativos = useQuery({
    queryKey: ["investimento_ativos", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("investimento_ativos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestimentoAtivo[];
    },
    enabled: !!userId,
  });

  const addAtivo = useMutation({
    mutationFn: async (ativo: InvestimentoAtivoInsert) => {
      const { error } = await db
        .from("investimento_ativos")
        .insert({ ...ativo, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] }),
  });

  const updateAtivo = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InvestimentoAtivo> & { id: string }) => {
      const { error } = await db
        .from("investimento_ativos")
        .update(data)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] }),
  });

  const deleteAtivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("investimento_ativos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] }),
  });

  const dividendos = useQuery({
    queryKey: ["investimento_dividendos", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("investimento_dividendos")
        .select("*")
        .eq("user_id", userId)
        .order("data_recebimento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestimentoDividendo[];
    },
    enabled: !!userId,
  });

  const addDividendo = useMutation({
    mutationFn: async (div: InvestimentoDividendoInsert) => {
      const { error } = await db
        .from("investimento_dividendos")
        .insert({ ...div, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_dividendos"] }),
  });

  const deleteDividendo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("investimento_dividendos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_dividendos"] }),
  });

  return { ativos, addAtivo, updateAtivo, deleteAtivo, dividendos, addDividendo, deleteDividendo };
}
