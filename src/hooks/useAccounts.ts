import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ContaFinanceira, ContaFinanceiraInsert } from "@/types/accounts";

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["contas_financeiras", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_accounts_with_balance")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Mapear ledger_balance para saldo para compatibilidade
      return (data ?? []).map(acc => ({
        ...acc,
        saldo: acc.ledger_balance
      })) as unknown as ContaFinanceira[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: ContaFinanceiraInsert) => {
      // Remover saldo do payload para evitar erro de coluna inexistente
      const { saldo, ...payload } = account as any;
      const { data, error } = await supabase
        .from("contas_financeiras")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ContaFinanceira;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContaFinanceira> & { id: string }) => {
      // Remover saldo do payload
      const { saldo, ...payload } = updates as any;
      const { data, error } = await supabase
        .from("contas_financeiras")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ContaFinanceira;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contas_financeiras")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
  });

  return {
    accounts: accountsQuery.data ?? [],
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
