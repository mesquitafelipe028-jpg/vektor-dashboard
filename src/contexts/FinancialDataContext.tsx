import React, { createContext, useContext, useMemo, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { queryKeys } from "@/lib/queryKeys";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFinancialView } from "@/contexts/FinancialViewContext";
import { FinanceService, type FinancialView } from "@/lib/financeService";
import { calcularLimiteProporcional } from "@/lib/fiscal";
import { type DespesaExtended, type ReceitaExtended } from "@/types/transactions";
import { type ContaFinanceira } from "@/types/accounts";

interface FinancialDataState {
  saldoTotal: number;
  faturamentoMes: number;
  despesasMesTotal: number;
  saldoMes: number;
  totalInvestido: number;
  taxaPoupanca: number;
  orphanedCount: number;
  hasCnpj: boolean;
  loading: boolean;
  raw: {
    receitas: ReceitaExtended[];
    despesas: DespesaExtended[];
    settledReceitas: ReceitaExtended[];
    settledDespesas: DespesaExtended[];
  };
  empresa: any;
  limiteMei: number;
  faturamentoAnual: number;
}

const FinancialDataContext = createContext<FinancialDataState | undefined>(undefined);

export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { accounts = [] as ContaFinanceira[], isLoading: loadingAccounts } = useAccounts();
  const { preferences } = useUserPreferences();
  const { view: globalView } = useFinancialView();

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
      const { data, error } = await supabase.from("empresas").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const loading = loadingAccounts || loadingReceitas || loadingDespesas;

  // 1. Memoize raw results based on the view
  const processedData = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = String(now.getFullYear());

    // We calculate for the global view. Components can still override local if needed,
    // but the global context handles the default app state.
    const rSet = FinanceService.filterByView<ReceitaExtended>(receitas, globalView);
    const dSet = FinanceService.filterByView<DespesaExtended>(despesas, globalView);

    const stats = FinanceService.calculateStats(
      receitas,
      despesas,
      accounts,
      globalView,
      currentMonth,
      currentYear
    );

    const limiteMei = calcularLimiteProporcional(empresa?.data_abertura);

    return {
      ...stats,
      limiteMei,
      loading,
      raw: {
        receitas: rSet,
        despesas: dSet,
        settledReceitas: rSet.filter((r) => r.status === "recebido"),
        settledDespesas: dSet.filter((d) => d.status === "pago"),
      },
      empresa,
      hasCnpj: !!empresa?.cnpj && !preferences.ocultar_mei,
    };
  }, [receitas, despesas, accounts, globalView, empresa, loading, preferences.ocultar_mei]);

  // 2. Use Deferred Value to prevent blocking the main thread during transitions
  const deferredValue = useDeferredValue(processedData);

  return (
    <FinancialDataContext.Provider value={deferredValue}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialDataContext() {
  const context = useContext(FinancialDataContext);
  if (context === undefined) {
    throw new Error("useFinancialDataContext must be used within a FinancialDataProvider");
  }
  return context;
}
