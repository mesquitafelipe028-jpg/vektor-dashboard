import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, ShieldCheck, AlertTriangle, ShieldAlert, Target,
  FileText, ArrowUpRight, ArrowDownRight, Building2, X, Bell,
  Clock, Flame, User, Briefcase, Layers, Info, PiggyBank
} from "lucide-react";
import { AreaChart, Area, XAxis as AXAxis, YAxis as AYAxis, CartesianGrid as ACG, Tooltip as ATooltip, ResponsiveContainer as ARC } from "recharts";
import { useQuery, useIsFetching } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/utils";

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
import { calcularLimiteProporcional } from "@/lib/fiscal";

// New Dashboard Components
import { FinancialStats } from "@/components/dashboard/FinancialStats";
import { HealthAlerts, type AlertItem } from "@/components/dashboard/HealthAlerts";
import { DashboardGoals } from "@/components/dashboard/DashboardGoals";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { CashFlowProjection } from "@/components/dashboard/CashFlowProjection";


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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const { view: financialView, setView: setFinancialView } = useFinancialView();

  const {
    saldoTotal,
    faturamentoMes,
    despesasMesTotal,
    saldoMes,
    totalInvestido,
    aportesMes,
    limiteMei,
    faturamentoAnual,
    taxaPoupanca,
    orphanedBalance,
    orphanedCount,
    hasCnpj,
    loading,
    raw,
    empresa, // Added from the new structure
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

  // Financial view filter effect - fixed dep array
  useEffect(() => {
    if (!hasCnpj && financialView !== "pessoal") {
      setFinancialView("pessoal");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCnpj]);

  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());
  const dismissAlert = useCallback((id: string) => {
    setHiddenAlerts((prev) => new Set(prev).add(id));
  }, []);

  // STATS derived from raw data in hook - memoized to prevent re-computation on every render
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const receitasMes = useMemo(
    () => raw.settledReceitas.filter((r) => r.data.startsWith(currentMonth)),
    [raw.settledReceitas, currentMonth]
  );
  const despesasMes = useMemo(
    () => raw.settledDespesas.filter((d) => d.data.startsWith(currentMonth)),
    [raw.settledDespesas, currentMonth]
  );

  // Previous month for report summary
  const prevMonth = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long" });
    const rec = raw.settledReceitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = raw.settledDespesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const lucro = rec - desp;
    const varFat = rec > 0 && faturamentoMes > 0 ? ((faturamentoMes - rec) / rec) * 100 : 0;
    return { label, rec, desp, lucro, varFat };
  }, [raw.settledReceitas, raw.settledDespesas, faturamentoMes]);

  // Monthly chart data (last 6 months) - memoized
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const rec = raw.settledReceitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
      const desp = raw.settledDespesas.filter((d) => d.data.startsWith(key)).reduce((s, d) => s + d.valor, 0);
      return { month: label.charAt(0).toUpperCase() + label.slice(1), receitas: rec, despesas: desp };
    });
  }, [raw.settledReceitas, raw.settledDespesas]);


  // Saúde Financeira
  const despesaPercent = faturamentoMes > 0 ? (despesasMesTotal / faturamentoMes) * 100 : 0;
  const healthStatus = despesaPercent < 50 ? "healthy" : despesaPercent <= 75 ? "warning" : "critical";
  const healthConfig = {
    warning: { label: "Atenção", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    critical: { label: "Crítico", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
  }[healthStatus];

  

  const { categories: dbCategories } = useCategories("despesa");

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

  // Despesas por categoria (PieChart)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    despesasMes.forEach((d) => {
      const cat = d.categoria || "Outros";
      map[cat] = (map[cat] || 0) + d.valor;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ 
        name, 
        value, 
        fill: catColorMap[name] || getVibrantColor(name)
      }))
      .sort((a, b) => b.value - a.value);
  }, [despesasMes, catColorMap]);


  const insightColors: Record<string, string> = {
    success: "border-l-green-500 bg-green-500/5",
    warning: "border-l-yellow-500 bg-yellow-500/5",
    danger: "border-l-red-500 bg-red-500/5",
    info: "border-l-blue-500 bg-blue-500/5",
  };
  const insightIconColors: Record<string, string> = {
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    info: "text-blue-600",
  };

  // Smart Financial Alerts
  const alerts = useMemo(() => {
    const newAlerts: AlertItem[] = [];

    // Alerta 1 — Limite MEI (thresholds: 70%, 90%) — only with CNPJ
    const percentLimit = limiteMei > 0 ? Math.min((faturamentoAnual / limiteMei) * 100, 100) : 0;
    if (hasCnpj && percentLimit >= 90) {
      newAlerts.push({ id: "mei-90", icon: ShieldAlert, type: "danger", message: `Atenção: você está próximo de ultrapassar o limite do MEI (${percentLimit.toFixed(1)}% utilizado).` });
    } else if (hasCnpj && percentLimit >= 70) {
      newAlerts.push({ id: "mei-70", icon: AlertTriangle, type: "warning", message: `Você já utilizou ${percentLimit.toFixed(1)}% do limite anual do MEI.` });
    }

    // Alerta 2 — DAS pendente ou próximo do vencimento — only with CNPJ
    if (hasCnpj && impostoPendente) {
      const vencDate = new Date(impostoPendente.vencimento + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      vencDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        newAlerts.push({ id: "das-vencido", icon: ShieldAlert, type: "danger", message: `Seu DAS de ${impostoPendente.competencia} está vencido! Regularize o pagamento.` });
      } else if (diffDays === 0) {
        newAlerts.push({ id: "das-hoje", icon: CalendarIcon, type: "danger", message: "Seu imposto MEI (DAS) vence hoje!" });
      } else if (diffDays <= 7) {
        newAlerts.push({ id: "das-vencimento", icon: CalendarIcon, type: "warning", message: `Seu DAS de ${impostoPendente.competencia} vence em ${diffDays} dia${diffDays > 1 ? "s" : ""} (${vencDate.toLocaleDateString("pt-BR")}).` });
      } else {
        newAlerts.push({ id: "das-pendente", icon: FileText, type: "warning", message: `DAS de ${impostoPendente.competencia} pendente — vencimento em ${vencDate.toLocaleDateString("pt-BR")}.` });
      }
    }

    // Alertas de cobranças recorrentes/parceladas
    const todayStr = new Date().toISOString().slice(0, 10);
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const twoDaysStr = twoDaysLater.toISOString().slice(0, 10);

    // Receitas pendentes (cobranças)
    const receitasPendentes = raw.receitas.filter((r: any) => 
      r.status === "pendente" || r.status === "atrasado"
    );
    const receitasVencidas = receitasPendentes.filter((r: any) => r.data < todayStr);
    const receitasHoje = receitasPendentes.filter((r: any) => r.data === todayStr);
    const receitasProximas = receitasPendentes.filter((r: any) => r.data > todayStr && r.data <= twoDaysStr);

    if (receitasVencidas.length > 0) {
      if (receitasVencidas.length === 1 && receitasVencidas[0].clientes?.nome) {
         newAlerts.push({ id: `rec-vencida-${receitasVencidas[0].id}`, icon: ShieldAlert, type: "danger", message: `Cliente ${receitasVencidas[0].clientes.nome} possui pagamento em atrasado (${formatCurrency(receitasVencidas[0].valor)}).` });
      } else {
         newAlerts.push({ id: "rec-vencidas", icon: ShieldAlert, type: "danger", message: `${receitasVencidas.length} cobrança${receitasVencidas.length > 1 ? "s" : ""} vencida${receitasVencidas.length > 1 ? "s" : ""} (${formatCurrency(receitasVencidas.reduce((s: number, r: any) => s + r.valor, 0))}).` });
      }
    }
    if (receitasHoje.length > 0) {
      newAlerts.push({ id: "rec-hoje", icon: CalendarIcon, type: "warning", message: `${receitasHoje.length} cobrança${receitasHoje.length > 1 ? "s" : ""} vence${receitasHoje.length > 1 ? "m" : ""} hoje (${formatCurrency(receitasHoje.reduce((s: number, r: any) => s + r.valor, 0))}).` });
    }
    if (receitasProximas.length > 0) {
      newAlerts.push({ id: "rec-proximas", icon: Info, type: "warning", message: `${receitasProximas.length} cobrança${receitasProximas.length > 1 ? "s" : ""} nos próximos 2 dias.` });
    }

    // Despesas pendentes
    const despesasPendentes = raw.despesas.filter((d: any) =>
      (d.tipo_transacao === "recorrente" || d.tipo_transacao === "parcelada") && d.status === "pendente"
    );
    const despesasVencidas = despesasPendentes.filter((d: any) => d.data < todayStr);
    const despesasHoje = despesasPendentes.filter((d: any) => d.data === todayStr);

    if (despesasVencidas.length > 0) {
      newAlerts.push({ id: "desp-vencidas", icon: ShieldAlert, type: "danger", message: `${despesasVencidas.length} despesa${despesasVencidas.length > 1 ? "s" : ""} pendente${despesasVencidas.length > 1 ? "s" : ""} vencida${despesasVencidas.length > 1 ? "s" : ""} (${formatCurrency(despesasVencidas.reduce((s: number, d: any) => s + d.valor, 0))}).` });
    }
    if (despesasHoje.length > 0) {
      newAlerts.push({ id: "desp-hoje", icon: CalendarIcon, type: "warning", message: `${despesasHoje.length} despesa${despesasHoje.length > 1 ? "s" : ""} vence${despesasHoje.length > 1 ? "m" : ""} hoje.` });
    }

    // Alerta 3 & 4 — Variação de faturamento
    if (prevMonth.rec > 0 && faturamentoMes > 0) {
      const variation = ((faturamentoMes - prevMonth.rec) / prevMonth.rec) * 100;
      if (variation > 20) {
        newAlerts.push({ id: "fat-cresceu", icon: TrendingUp, type: "success", message: `Parabéns! Seu faturamento cresceu ${variation.toFixed(0)}% este mês. 🚀` });
      } else if (variation < 0) {
        newAlerts.push({ id: "fat-caiu", icon: TrendingDown, type: "warning", message: `Seu faturamento caiu ${Math.abs(variation).toFixed(0)}% comparado ao mês passado.` });
      }
    } else if (faturamentoMes > 0 && prevMonth.rec === 0) {
      newAlerts.push({ id: "fat-novo", icon: ShieldCheck, type: "success", message: `Ótimo início de mês! Faturamento atual: ${formatCurrency(faturamentoMes)}.` });
    }

    return newAlerts.filter((a) => !hiddenAlerts.has(a.id));
  }, [limiteMei, impostoPendente, prevMonth, faturamentoMes, hiddenAlerts, hasCnpj, raw.receitas, raw.despesas, faturamentoAnual]);

  const latestReceitas = raw.receitas.slice(0, 5);
  const latestDespesas = raw.despesas.slice(0, 5);


  const isLoading = loading;


  // === NEW: Mini gráfico de fluxo (daily data for current month) ===
  const flowChartData = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    // Initial balance is total settled balance BEFORE this month started
    const beforeThisMonthRec = raw.settledReceitas.filter(r => r.data < `${currentMonth}-01`).reduce((s, r) => s + r.valor, 0);
    const beforeThisMonthDesp = raw.settledDespesas.filter(d => d.data < `${currentMonth}-01`).reduce((s, d) => s + d.valor, 0);
    let accumulated = beforeThisMonthRec - beforeThisMonthDesp;
    
    return Array.from({ length: today }, (_, i) => {
      const day = i + 1;
      const dayStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const rec = raw.receitas.filter((r) => r.data === dayStr).reduce((s, r) => s + r.valor, 0); // Simplified raw access
      const desp = raw.despesas.filter((d) => d.data === dayStr).reduce((s, d) => s + d.valor, 0);
      accumulated += rec - desp;
      return { dia: day, receitas: rec, despesas: desp, saldo: accumulated };
    });
  }, [raw.settledReceitas, raw.settledDespesas, raw.receitas, raw.despesas, currentMonth]);

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
