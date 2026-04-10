import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { queryKeys } from "@/lib/queryKeys";
import { calcularLimiteProporcional } from "@/lib/fiscal";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFinancialView } from "@/contexts/FinancialViewContext";
import { FinanceService } from "@/lib/financeService";
import { type UnifiedTransaction, type FinancialView } from "@/types/transactions";
import { type ContaFinanceira } from "@/types/accounts";
import { generateVirtualTransactions, type ExtendedUnifiedTransaction } from "@/lib/virtualTransactions";

import { useFinancialDataContext } from "@/contexts/FinancialDataContext";

export function useFinancialData(overrideView?: FinancialView) {
  const contextData = useFinancialDataContext();
  const { view: globalView } = useFinancialView();
  const view = overrideView || globalView;

  // If we are using the global view, just return the context data
  if (!overrideView || overrideView === globalView) {
    return contextData;
  }

  // If there's an overrideView, we perform a local calculation
  const { user } = useAuth();
  const { accounts = [] as ContaFinanceira[] } = useAccounts();
  const { preferences } = useUserPreferences();

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, clientes(nome)")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UnifiedTransaction[];
    },
    enabled: false, // Usually fetched by context, but available if needed
  });

  // Separate processing is now done during calculation to avoid redundant loops

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
    enabled: false,
  });

  return useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = String(now.getFullYear());

    // Injetar instâncias virtuais para projeção de transações recorrentes previstas
    const allWithVirtuals = generateVirtualTransactions(allTransactions as UnifiedTransaction[], 6);

    const rFiltered = FinanceService.filterByView(allWithVirtuals.filter(t => t.type === "income"), view);
    const dFiltered = FinanceService.filterByView(allWithVirtuals.filter(t => t.type === "expense"), view);

    const stats = FinanceService.calculateStats(
      allWithVirtuals as UnifiedTransaction[],
      accounts,
      view,
      currentMonth,
      currentYear
    );

    const limiteMei = calcularLimiteProporcional(empresa?.data_abertura);

    return {
      ...stats,
      limiteMei,
      loading: false,
      raw: {
        receitas: rFiltered as any,
        despesas: dFiltered as any,
        settledReceitas: rFiltered.filter((r) => r.status === "confirmed") as any,
        settledDespesas: dFiltered.filter((d) => d.status === "confirmed") as any,
      },
      empresa,
      hasCnpj: !!empresa?.cnpj && !preferences.ocultar_mei,
    };
  }, [allTransactions, accounts, view, empresa, preferences.ocultar_mei]);
}
