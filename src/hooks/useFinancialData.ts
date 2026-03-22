import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { queryKeys } from "@/lib/queryKeys";
import { calcularLimiteProporcional } from "@/lib/fiscal";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFinancialView } from "@/contexts/FinancialViewContext";
import { FinanceService, type FinancialView } from "@/lib/financeService";
import { type DespesaExtended, type ReceitaExtended } from "@/types/transactions";
import { type ContaFinanceira } from "@/types/accounts";

export function useFinancialData(overrideView?: FinancialView) {
  const { view: globalView } = useFinancialView();
  const view = overrideView || globalView;
  const { user } = useAuth();
  const { accounts = [] as ContaFinanceira[], isLoading: loadingAccounts } = useAccounts();
  const { preferences } = useUserPreferences();

  const { data: receitas = [] as ReceitaExtended[], isLoading: loadingReceitas } = useQuery({
    queryKey: queryKeys.receitas(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*, clientes(nome)").order("data", { ascending: false });
      if (error) throw error;
      return data as ReceitaExtended[];
    },
    enabled: !!user,
  });

  const { data: despesas = [] as DespesaExtended[], isLoading: loadingDespesas } = useQuery({
    queryKey: queryKeys.despesas(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data as DespesaExtended[];
    },
    enabled: !!user,
  });

  const { data: empresa } = useQuery({
    queryKey: queryKeys.empresa(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const calculatedData = useMemo(() => {
    // 1. Filter raw sets by view for basic access
    const rSet = FinanceService.filterByView<ReceitaExtended>(receitas, view);
    const dSet = FinanceService.filterByView<DespesaExtended>(despesas, view);
    
    // 2. Calculate core stats using the centralized service
    const stats = FinanceService.calculateStats(
      receitas,
      despesas,
      accounts,
      view,
      currentMonth,
      currentYear
    );

    // 3. MEI Limit (requires empresa data)
    const limiteMei = calcularLimiteProporcional(empresa?.data_abertura);

    return {
      ...stats,
      limiteMei,
      hasCnpj: !!empresa?.cnpj && !preferences.ocultar_mei,
      raw: {
        receitas: rSet,
        despesas: dSet,
        // Settled versions for internal consistency
        settledReceitas: rSet.filter(r => r.status === "recebido"),
        settledDespesas: dSet.filter(d => d.status === "pago")
      }
    };
  }, [receitas, despesas, accounts, empresa, view, currentMonth, currentYear, preferences.ocultar_mei]);

  return {
    ...calculatedData,
    empresa,
    loading: loadingReceitas || loadingDespesas || loadingAccounts,
  };
}
