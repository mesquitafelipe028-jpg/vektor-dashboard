import React, { createContext, useContext, useMemo, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { queryKeys } from "@/lib/queryKeys";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFinancialView } from "@/contexts/FinancialViewContext";
import { FinanceService } from "@/lib/financeService";
import { calcularLimiteProporcional } from "@/lib/fiscal";
import { type UnifiedTransaction, type DespesaExtended, type ReceitaExtended, type FinancialView } from "@/types/transactions";
import { type ContaFinanceira } from "@/types/accounts";
import { getLocalDateString } from "@/lib/utils";
import { generateVirtualTransactions } from "@/lib/virtualTransactions";

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
    receitas: UnifiedTransaction[];
    despesas: UnifiedTransaction[];
    settledReceitas: UnifiedTransaction[];
    settledDespesas: UnifiedTransaction[];
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

  const { data: allTransactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, clientes(nome)")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UnifiedTransaction[];
    },
    enabled: !!user,
  });

  // No more separate memos for arrays unless really needed for local UI

  const { data: empresa } = useQuery({
    queryKey: queryKeys.empresa(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const loading = loadingAccounts || loadingTransactions;

  // 1. Memoize raw results based on the view
  const processedData = useMemo(() => {
    const today = getLocalDateString();
    const currentMonth = today.slice(0, 7); // YYYY-MM
    const currentYear = today.slice(0, 4); // YYYY

    // We calculate for the global view. Components can still override local if needed,
    // but the global context handles the default app state.
    const allWithVirtuals = generateVirtualTransactions(allTransactions, 6);

    const recipes = allWithVirtuals.filter(t => t.type === "income");
    const costs = allWithVirtuals.filter(t => t.type === "expense");

    const rFiltered = FinanceService.filterByView(recipes, globalView);
    const dFiltered = FinanceService.filterByView(costs, globalView);

    const stats = FinanceService.calculateStats(
      allWithVirtuals,
      accounts,
      globalView,
      currentMonth,
      currentYear
    );

    const limiteMei = calcularLimiteProporcional(empresa?.data_abertura);

    const mapLegacy = (t: UnifiedTransaction) => ({
      ...t,
      data: t.date,
      valor: t.amount,
      descricao: t.description,
      categoria: t.category || "Sem Categoria",
    });

    return {
      ...stats,
      limiteMei,
      loading,
      raw: {
        receitas: (rFiltered || []).map(mapLegacy),
        despesas: (dFiltered || []).map(mapLegacy),
        settledReceitas: (rFiltered || []).filter((r) => r.status === "confirmed").map(mapLegacy),
        settledDespesas: (dFiltered || []).filter((d) => d.status === "confirmed").map(mapLegacy),
      },
      empresa: empresa || null,
      hasCnpj: !!empresa?.cnpj && !preferences.ocultar_mei,
    };
  }, [allTransactions, accounts, globalView, empresa, loading, preferences.ocultar_mei]);

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
