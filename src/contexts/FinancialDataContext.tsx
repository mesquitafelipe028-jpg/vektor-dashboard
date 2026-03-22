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
import { getLocalDateString } from "@/lib/utils";

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

  const { data: allTransactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, clientes(nome)")
        .order("date", { ascending: false });
      if (error) throw error;
      
      // Mapear para o formato legado esperado pelo restante do app
      return (data ?? []).map(t => ({
        ...t,
        valor: t.amount,
        descricao: t.description,
        data: t.date,
        status: t.type === "income" 
          ? (t.status === "confirmed" ? "recebido" : "pendente")
          : (t.status === "confirmed" ? "pago" : "pendente"),
        tipo: t.tipo_despesa // campo legado
      }));
    },
    enabled: !!user,
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
