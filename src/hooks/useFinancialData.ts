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
      
      return (data ?? []).map(t => ({
        ...t,
        valor: t.amount,
        descricao: t.description,
        data: t.date,
        status: t.type === "income" 
          ? (t.status === "confirmed" ? "recebido" : "pendente")
          : (t.status === "confirmed" ? "pago" : "pendente"),
        tipo: t.tipo_despesa
      }));
    },
    enabled: false, // Usually fetched by context, but available if needed
  });

  const receitas = useMemo(() => 
    allTransactions.filter(t => t.type === "income") as ReceitaExtended[], 
  [allTransactions]);

  const despesas = useMemo(() => 
    allTransactions.filter(t => t.type === "expense") as DespesaExtended[], 
  [allTransactions]);

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

    const rSet = FinanceService.filterByView<ReceitaExtended>(receitas, view);
    const dSet = FinanceService.filterByView<DespesaExtended>(despesas, view);

    const stats = FinanceService.calculateStats(
      receitas,
      despesas,
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
        receitas: rSet,
        despesas: dSet,
        settledReceitas: rSet.filter((r) => r.status === "recebido"),
        settledDespesas: dSet.filter((d) => d.status === "pago"),
      },
      empresa,
      hasCnpj: !!empresa?.cnpj && !preferences.ocultar_mei,
    };
  }, [receitas, despesas, accounts, view, empresa, preferences.ocultar_mei]);
}
