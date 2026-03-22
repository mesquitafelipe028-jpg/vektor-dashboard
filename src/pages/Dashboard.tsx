import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, ShieldCheck, AlertTriangle, ShieldAlert, Target,
  FileText, ArrowUpRight, ArrowDownRight, Building2, X, Bell,
  Clock, Flame, User, Briefcase, Layers, Info, PiggyBank, CalendarIcon
} from "lucide-react";
import { AreaChart, Area, XAxis as AXAxis, YAxis as AYAxis, CartesianGrid as ACG, Tooltip as ATooltip, ResponsiveContainer as ARC } from "recharts";
import { useQuery, useIsFetching } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate, getLocalDateString } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useCategories, type CategoriaDB } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFinancialView } from "@/contexts/FinancialViewContext";

import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { InsightsFinanceiros } from "@/components/dashboard/InsightsFinanceiros";
import { QuickEntry } from "@/components/dashboard/QuickEntry";
import { QuickSyncModal } from "@/components/dashboard/QuickSyncModal";
import { queryKeys } from "@/lib/queryKeys";
import { FinanceService } from "@/lib/financeService";

// New Dashboard Components
import { FinancialStats } from "@/components/dashboard/FinancialStats";
import { HealthAlerts, type AlertItem } from "@/components/dashboard/HealthAlerts";
import { DashboardGoals } from "@/components/dashboard/DashboardGoals";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { DashboardMetasChart } from "@/components/dashboard/DashboardMetasChart";
import { CashFlowProjection } from "@/components/dashboard/CashFlowProjection";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";


const colorNameToHsl: Record<string, string> = {
  orange:  "hsl(32, 100%, 55%)",
  violet:  "hsl(262, 85%, 65%)",
  blue:    "hsl(217, 100%, 65%)",
  rose:    "hsl(350, 95%, 65%)",
  sky:     "hsl(199, 95%, 60%)",
  pink:    "hsl(330, 95%, 70%)",
  slate:   "hsl(215, 30%, 65%)",
  indigo:  "hsl(239, 95%, 75%)",
  cyan:    "hsl(188, 100%, 55%)",
  fuchsia: "hsl(292, 95%, 75%)",
  amber:   "hsl(45, 100%, 55%)",
  red:     "hsl(0, 95%, 65%)",
  purple:  "hsl(271, 100%, 75%)",
  gray:    "hsl(220, 20%, 65%)",
  emerald: "hsl(160, 95%, 45%)",
  green:   "hsl(142, 90%, 50%)",
};

/**
 * Generates a vibrant color based on a string hash.
 * Used as a fallback to ensure we never have "gray" categories.
 */
function getVibrantColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 85%, 65%)`;
}


// Lazy-load heavy recharts components
// const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts")); // Now directly imported

const ChartsFallback = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Skeleton className="h-72 w-full rounded-lg" />
    <Skeleton className="h-72 w-full rounded-lg" />
  </div>
);



export default function Dashboard() {
  useDynamicFavicon('system');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const { view: financialView, setView: setFinancialView } = useFinancialView();
  const { categories: dbCategories } = useCategories("despesa");

  const {
    saldoTotal,
    faturamentoMes,
    despesasMesTotal,
    saldoMes,
    totalInvestido,
    taxaPoupanca,
    orphanedCount,
    hasCnpj,
    loading,
    raw,
    empresa,
    limiteMei,
    faturamentoAnual
  } = useFinancialData();

  const { data: impostoPendente } = useQuery({
    queryKey: queryKeys.impostosPendente(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impostos_mei")
        .select("*")
        .eq("status", "pendente")
        .order("vencimento", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: metas = [] } = useQuery({
    queryKey: queryKeys.metas(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select("*")
        .order("prazo", { ascending: true });
      if (error) throw error;
      return data as { id: string; titulo: string; valor_alvo: number; valor_atual: number; prazo: string; categoria: string }[];
    },
    enabled: !!user,
  });

  const { accounts } = useAccounts();
  const metaAtual = metas.find((m) => m.valor_atual < m.valor_alvo) || metas[0];

  useEffect(() => {
    localStorage.setItem('vektor_preferred_landing', '/dashboard');
    if (!hasCnpj && financialView !== "pessoal") {
      setFinancialView("pessoal");
    }
  }, [hasCnpj]);

  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());
  const dismissAlert = useCallback((id: string) => {
    setHiddenAlerts((prev) => new Set(prev).add(id));
  }, []);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Use Centralized Service for Chart Data
  const monthlyData = useMemo(() => 
    FinanceService.getMonthlySeries(raw.receitas, raw.despesas, financialView),
    [raw.receitas, raw.despesas, financialView]
  );

  const prevMonth = useMemo(() => {
    const months = FinanceService.getMonthlySeries(raw.receitas, raw.despesas, financialView, 2);
    const prev = months[0]; // month at index 0 is the previous one if count=2
    const current = faturamentoMes;
    const varFat = prev.receitas > 0 ? ((current - prev.receitas) / prev.receitas) * 100 : 0;
    return { label: prev.month, rec: prev.receitas, desp: prev.despesas, lucro: prev.saldo, varFat };
  }, [raw.receitas, raw.despesas, financialView, faturamentoMes]);

  // Flatten DB categories for color lookup
  const catColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    dbCategories.forEach((c: CategoriaDB) => {
      m[c.nome] = colorNameToHsl[c.cor] ?? "hsl(220, 9%, 46%)";
      c.subcategorias?.forEach((sub) => {
        m[sub.nome] = colorNameToHsl[sub.cor] ?? colorNameToHsl[c.cor] ?? "hsl(220, 9%, 46%)";
      });
    });
    return m;
  }, [dbCategories]);

  const categoryData = useMemo(() => {
    const data = FinanceService.getCategoryBreakdown(raw.despesas, financialView, currentMonth);
    return data.map(item => ({
      ...item,
      fill: catColorMap[item.name] || getVibrantColor(item.name)
    }));
  }, [raw.despesas, financialView, currentMonth, catColorMap]);

  // Alerts logic (kept local for now as it uses complex component-level dependencies/icons, 
  // but consuming centralized values)
  const alerts = useMemo(() => {
    const newAlerts: AlertItem[] = [];
    const percentLimit = limiteMei > 0 ? Math.min((faturamentoAnual / limiteMei) * 100, 100) : 0;
    
    if (hasCnpj && percentLimit >= 90) {
      newAlerts.push({ id: "mei-90", icon: ShieldAlert, type: "danger", message: `Atenção: você está próximo de ultrapassar o limite do MEI (${percentLimit.toFixed(1)}% utilizado).` });
    } else if (hasCnpj && percentLimit >= 70) {
      newAlerts.push({ id: "mei-70", icon: AlertTriangle, type: "warning", message: `Você já utilizou ${percentLimit.toFixed(1)}% do limite anual do MEI.` });
    }

    if (hasCnpj && impostoPendente) {
      const vencDate = new Date(impostoPendente.vencimento + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) newAlerts.push({ id: "das-vencido", icon: ShieldAlert, type: "danger", message: `Seu DAS de ${impostoPendente.competencia} está vencido!` });
      else if (diffDays === 0) newAlerts.push({ id: "das-hoje", icon: CalendarIcon, type: "danger", message: "Seu imposto MEI vence hoje!" });
      else if (diffDays <= 7) newAlerts.push({ id: "das-vencimento", icon: CalendarIcon, type: "warning", message: `Seu DAS vence em ${diffDays} dias.` });
    }

    // Pendencies
    const todayStr = getLocalDateString();
    const recsAtention = raw.receitas.filter(r => r.status !== "recebido" && r.data <= todayStr);
    if (recsAtention.length > 0) {
      newAlerts.push({ id: "recs-atention", icon: ShieldAlert, type: "danger", message: `${recsAtention.length} cobranças pendentes ou vencidas.` });
    }

    const despVencidas = raw.despesas.filter(d => d.status === "pendente" && d.data < todayStr);
    if (despVencidas.length > 0) {
      newAlerts.push({ id: "desp-vencidas", icon: ShieldAlert, type: "danger", message: `${despVencidas.length} despesas vencidas.` });
    }

    if (prevMonth.rec > 0 && faturamentoMes > 0) {
      if (prevMonth.varFat > 20) newAlerts.push({ id: "fat-grow", icon: TrendingUp, type: "success", message: `Seu faturamento cresceu ${prevMonth.varFat.toFixed(0)}%! 🚀` });
      else if (prevMonth.varFat < -10) newAlerts.push({ id: "fat-drop", icon: TrendingDown, type: "warning", message: `Faturamento caiu ${Math.abs(prevMonth.varFat).toFixed(0)}% vs mês passado.` });
    }

    return newAlerts.filter((a) => !hiddenAlerts.has(a.id));
  }, [limiteMei, faturamentoAnual, hasCnpj, impostoPendente, raw.receitas, raw.despesas, prevMonth, faturamentoMes, hiddenAlerts]);

  const flowChartData = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const days = Array.from({ length: today }, (_, i) => i + 1);
    
    // Starting balance: approx using simple subtract
    let currentFlowBalance = saldoTotal - saldoMes; 

    return days.map(day => {
      const dayStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const rec = raw.receitas.filter(r => r.data === dayStr).reduce((s, r) => s + r.valor, 0);
      const desp = raw.despesas.filter(d => d.data === dayStr).reduce((s, d) => s + d.valor, 0);
      currentFlowBalance += rec - desp;
      return { dia: day, receitas: rec, despesas: desp, saldo: currentFlowBalance };
    });
  }, [saldoTotal, saldoMes, raw.receitas, raw.despesas, currentMonth]);

  const despesaPercent = faturamentoMes > 0 ? (despesasMesTotal / faturamentoMes) * 100 : 0;
  const isLoading = loading;

  // Extracted insight logic out to InsightsFinanceiros component

    return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 md:px-6">
      <DashboardHeader 
        hasCnpj={hasCnpj} 
        onSyncOpen={() => setSyncModalOpen(true)} 
      />

      <FinancialStats 
        isLoading={isLoading}
        saldoTotal={saldoTotal}
        faturamentoMes={faturamentoMes}
        despesasMesTotal={despesasMesTotal}
        totalInvestido={totalInvestido}
        saldoMes={saldoMes}
      />

      <HealthAlerts alerts={alerts} onDismiss={dismissAlert} />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InsightsFinanceiros
              faturamentoMes={faturamentoMes}
              despesasMesTotal={despesasMesTotal}
              despesaPercent={despesaPercent}
              savingsRate={taxaPoupanca}
              varFaturamento={prevMonth.varFat}
              categoryData={categoryData}
            />
          </div>
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">Taxa de Poupança</span>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xl font-bold">{taxaPoupanca.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {orphanedCount > 0 && accounts.length > 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                    <Info className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700">Ação Necessária</p>
                    <p className="text-[10px] text-amber-600">Você tem {orphanedCount} transações sem conta bancária vinculada.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasCnpj && empresa && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/configuracoes")}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm truncate">{empresa.razao_social || empresa.nome_fantasia || "Empresa"}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Separator />

      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts monthlyData={monthlyData} categoryData={categoryData} flowChartData={flowChartData} />
      </Suspense>

      <DashboardMetasChart metas={metas} />

      <DashboardGoals 
        metaAtual={metaAtual} 
        prevMonth={prevMonth} 
        navigate={navigate} 
        formatCurrency={formatCurrency} 
      />

      <CashFlowProjection
        receitas={raw.receitas}
        despesas={raw.despesas}
        saldoAtual={saldoTotal}
      />

      <RecentActivity 
        isLoading={isLoading}
        receitas={raw.receitas}
        despesas={raw.despesas}
      />

      <QuickSyncModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />
    </div>
  );
}
