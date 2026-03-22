import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type InvestimentoAtivo = Tables<"investimento_ativos">;
export type InvestimentoAtivoInsert = TablesInsert<"investimento_ativos">;
export type InvestimentoDividendo = Tables<"investimento_dividendos">;
export type InvestimentoDividendoInsert = TablesInsert<"investimento_dividendos">;

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const ativos = useQuery({
    queryKey: ["investimento_ativos", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investimento_ativos")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestimentoAtivo[];
    },
    enabled: !!userId,
  });

  const addAtivo = useMutation({
    mutationFn: async ({ ativo, accountId }: { ativo: Omit<InvestimentoAtivoInsert, "user_id">, accountId?: string }) => {
      const { data: newAtivo, error } = await supabase
        .from("investimento_ativos")
        .insert({ ...ativo, user_id: userId! } as InvestimentoAtivoInsert)
        .select()
        .single();
      
      if (error) throw error;

      // Se uma conta foi selecionada, criar transação de despesa (aporte)
      if (accountId && newAtivo) {
        const { error: txError } = await supabase.from("transactions").insert({
          description: `Aporte: ${newAtivo.nome}`,
          amount: Number(newAtivo.quantidade) * Number(newAtivo.preco_medio),
          date: newAtivo.data_compra || new Date().toISOString().split('T')[0],
          category: "Investimentos",
          type: "expense",
          status: "confirmed",
          account_id: accountId,
          user_id: userId!,
        } as any);
        
        if (txError) throw txError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
  });

  const updateAtivo = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InvestimentoAtivo> & { id: string }) => {
      const { error } = await supabase
        .from("investimento_ativos")
        .update(data as any)
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] }),
  });

  const deleteAtivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investimento_ativos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_ativos"] }),
  });

  const dividendos = useQuery({
    queryKey: ["investimento_dividendos", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investimento_dividendos")
        .select("*")
        .eq("user_id", userId!)
        .order("data_recebimento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestimentoDividendo[];
    },
    enabled: !!userId,
  });

  const addDividendo = useMutation({
    mutationFn: async ({ dividendo, accountId }: { dividendo: Omit<InvestimentoDividendoInsert, "user_id">, accountId?: string }) => {
      const { data: newDiv, error } = await supabase
        .from("investimento_dividendos")
        .insert({ ...dividendo, user_id: userId! } as InvestimentoDividendoInsert)
        .select()
        .single();
        
      if (error) throw error;

      // Se uma conta foi selecionada, criar transação de receita (provento)
      if (accountId && newDiv) {
        // Buscar nome do ativo se possível para a descrição
        const { data: ativo } = await supabase
          .from("investimento_ativos")
          .select("nome")
          .eq("id", newDiv.ativo_id)
          .maybeSingle();

        const { error: txError } = await supabase.from("transactions").insert({
          description: `Dividendo/Rendimento: ${ativo?.nome || 'Ativo'}`,
          amount: newDiv.valor,
          date: newDiv.data_recebimento,
          category: "Investimentos",
          type: "income",
          status: "confirmed",
          account_id: accountId,
          user_id: userId!,
        } as any);
        
        if (txError) throw txError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investimento_dividendos"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
  });

  const deleteDividendo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investimento_dividendos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investimento_dividendos"] }),
  });

  return { ativos, addAtivo, updateAtivo, deleteAtivo, dividendos, addDividendo, deleteDividendo };
}
