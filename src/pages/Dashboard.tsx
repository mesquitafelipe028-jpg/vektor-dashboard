import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useQuery, useIsFetching } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, HeartPulse, ShieldCheck, AlertTriangle, ShieldAlert, Target,
  FileText, ArrowUpRight, ArrowDownRight, Building2, X, Bell,
  CheckCircle2, Clock, Flame, User, Briefcase, Layers,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { useFinancialInsights } from "@/hooks/useFinancialInsights";
import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";

import { PiggyBank } from "lucide-react";

// Lazy-load heavy recharts components
const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

const ChartsFallback = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Skeleton className="h-72 w-full rounded-lg" />
    <Skeleton className="h-72 w-full rounded-lg" />
  </div>
);

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function KpiCards({
  receitas,
  despesas,
  currentMonth,
  now,
  hasCnpj,
}: {
  receitas: any[];
  despesas: any[];
  currentMonth: string;
  now: Date;
  hasCnpj: boolean;
}) {
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = getMonthKey(prevDate);

  // MEI metrics
  const faturamentoMei = receitas.filter((r) => r.tipo_conta === "mei" && r.data.startsWith(currentMonth)).reduce((s: number, r: any) => s + r.valor, 0);
  const despesasMei = despesas.filter((d) => d.tipo_conta === "mei" && d.data.startsWith(currentMonth)).reduce((s: number, d: any) => s + d.valor, 0);
  const lucroMei = faturamentoMei - despesasMei;

  const faturamentoMeiPrev = receitas.filter((r) => r.tipo_conta === "mei" && r.data.startsWith(prevKey)).reduce((s: number, r: any) => s + r.valor, 0);
  const despesasMeiPrev = despesas.filter((d) => d.tipo_conta === "mei" && d.data.startsWith(prevKey)).reduce((s: number, d: any) => s + d.valor, 0);
  const lucroMeiPrev = faturamentoMeiPrev - despesasMeiPrev;

  // Personal savings
  const rendaPessoal = receitas.filter((r) => r.tipo_conta === "pessoal" && r.data.startsWith(currentMonth)).reduce((s: number, r: any) => s + r.valor, 0);
  const despPessoal = despesas.filter((d) => d.tipo_conta === "pessoal" && d.data.startsWith(currentMonth)).reduce((s: number, d: any) => s + d.valor, 0);
  const taxaPoupanca = rendaPessoal > 0 ? ((rendaPessoal - despPessoal) / rendaPessoal) * 100 : 0;

  const rendaPessoalPrev = receitas.filter((r) => r.tipo_conta === "pessoal" && r.data.startsWith(prevKey)).reduce((s: number, r: any) => s + r.valor, 0);
  const despPessoalPrev = despesas.filter((d) => d.tipo_conta === "pessoal" && d.data.startsWith(prevKey)).reduce((s: number, d: any) => s + d.valor, 0);
  const taxaPoupancaPrev = rendaPessoalPrev > 0 ? ((rendaPessoalPrev - despPessoalPrev) / rendaPessoalPrev) * 100 : 0;

  function variation(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  }

  const varFat = variation(faturamentoMei, faturamentoMeiPrev);
  const varLucro = variation(lucroMei, lucroMeiPrev);
  const varPoup = taxaPoupanca - taxaPoupancaPrev;

  const cards = [
    ...(hasCnpj ? [
      { title: "Faturamento MEI", value: formatCurrency(faturamentoMei), change: varFat, icon: Briefcase, prefix: "" },
      { title: "Lucro MEI", value: formatCurrency(lucroMei), change: varLucro, icon: TrendingUp, prefix: "" },
    ] : [
      { title: "Receita Pessoal", value: formatCurrency(rendaPessoal), change: variation(rendaPessoal, rendaPessoalPrev), icon: Wallet, prefix: "" },
      { title: "Despesa Pessoal", value: formatCurrency(despPessoal), change: variation(despPessoal, despPessoalPrev), icon: Receipt, prefix: "" },
    ]),
    { title: "Taxa de Poupança", value: `${taxaPoupanca.toFixed(1)}%`, change: varPoup, icon: PiggyBank, prefix: "pp", isSavings: true },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const positive = c.change >= 0;
        const Arrow = positive ? ArrowUpRight : ArrowDownRight;
        const changeColor = c.isSavings
          ? positive ? "text-emerald-600" : "text-destructive"
          : positive ? "text-emerald-600" : "text-destructive";

        return (
          <Card key={c.title}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <c.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{c.title}</span>
              </div>
              <p className="font-heading text-2xl font-bold">{c.value}</p>
              <div className="flex items-center gap-1 mt-1">
                <Arrow className={`h-3.5 w-3.5 ${changeColor}`} />
                <span className={`text-xs font-medium ${changeColor}`}>
                  {Math.abs(c.change).toFixed(1)}{c.prefix === "pp" ? "pp" : "%"}
                </span>
                <span className="text-xs text-muted-foreground">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: receitas = [], isLoading: loadingReceitas } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: despesas = [], isLoading: loadingDespesas } = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: impostoPendente } = useQuery({
    queryKey: ["impostos_mei_pendente"],
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

  // Metas financeiras
  const { data: metas = [] } = useQuery({
    queryKey: ["metas_financeiras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("metas_financeiras")
        .select("*")
        .order("prazo", { ascending: true });
      if (error) throw error;
      return data as { id: string; titulo: string; valor_alvo: number; valor_atual: number; prazo: string; categoria: string }[];
    },
    enabled: !!user,
  });

  const { data: empresa } = useQuery({
    queryKey: ["empresa", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("empresas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const metaAtual = metas.find((m) => m.valor_atual < m.valor_alvo) || metas[0];

  const hasCnpj = !!empresa?.cnpj;

  // Financial view filter
  type FinancialView = "tudo" | "pessoal" | "mei";
  const [financialView, setFinancialView] = useState<FinancialView>("tudo");

  // Force "pessoal" view when no CNPJ
  useEffect(() => {
    if (!hasCnpj && financialView !== "pessoal") {
      setFinancialView("pessoal");
    }
  }, [hasCnpj, financialView]);

  const filteredReceitas = useMemo(() => {
    if (financialView === "tudo") return receitas;
    return receitas.filter((r: any) => r.tipo_conta === financialView);
  }, [receitas, financialView]);

  const filteredDespesas = useMemo(() => {
    if (financialView === "tudo") return despesas;
    return despesas.filter((d: any) => d.tipo_conta === financialView);
  }, [despesas, financialView]);

  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());
  const dismissAlert = useCallback((id: string) => {
    setHiddenAlerts((prev) => new Set(prev).add(id));
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const receitasMes = filteredReceitas.filter((r) => r.data.startsWith(currentMonth));
  const despesasMes = filteredDespesas.filter((d) => d.data.startsWith(currentMonth));
  const faturamentoMes = receitasMes.reduce((s, r) => s + r.valor, 0);
  const despesasMesTotal = despesasMes.reduce((s, d) => s + d.valor, 0);
  const saldoMes = faturamentoMes - despesasMesTotal;

  const LIMITE_MEI = 81000;
  const faturamentoAnual = filteredReceitas
    .filter((r) => r.data.startsWith(currentYear))
    .reduce((s, r) => s + r.valor, 0);
  const percentLimit = Math.min((faturamentoAnual / LIMITE_MEI) * 100, 100);

  // Previous month for report summary
  const prevMonth = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long" });
    const rec = filteredReceitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = filteredDespesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const lucro = rec - desp;
    const varFat = rec > 0 && faturamentoMes > 0 ? ((faturamentoMes - rec) / rec) * 100 : 0;
    return { label, rec, desp, lucro, varFat };
  }, [filteredReceitas, filteredDespesas, faturamentoMes]);

  // Saúde Financeira
  const despesaPercent = faturamentoMes > 0 ? (despesasMesTotal / faturamentoMes) * 100 : 0;
  const healthStatus = despesaPercent < 50 ? "healthy" : despesaPercent <= 75 ? "warning" : "critical";
  const healthConfig = {
    healthy: { label: "Saudável", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/30" },
    warning: { label: "Atenção", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    critical: { label: "Crítico", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
  }[healthStatus];

  const insights = useFinancialInsights(filteredReceitas, filteredDespesas);

  // Despesas por categoria (PieChart)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    despesasMes.forEach((d) => {
      const cat = d.categoria || "Outros";
      map[cat] = (map[cat] || 0) + d.valor;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [despesasMes]);

  // Monthly chart data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const rec = filteredReceitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = filteredDespesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    return { month: label.charAt(0).toUpperCase() + label.slice(1), receitas: rec, despesas: desp };
  });

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

  const latestReceitas = filteredReceitas.slice(0, 5);
  const latestDespesas = filteredDespesas.slice(0, 5);

  // Smart Financial Alerts
  const financialAlerts = useMemo(() => {
    type AlertItem = { id: string; icon: typeof AlertTriangle; message: string; type: "success" | "warning" | "danger" };
    const alerts: AlertItem[] = [];

    // Alerta 1 — Limite MEI (thresholds: 70%, 90%) — only with CNPJ
    if (hasCnpj && percentLimit >= 90) {
      alerts.push({ id: "mei-90", icon: ShieldAlert, type: "danger", message: `Atenção: você está próximo de ultrapassar o limite do MEI (${percentLimit.toFixed(1)}% utilizado).` });
    } else if (hasCnpj && percentLimit >= 70) {
      alerts.push({ id: "mei-70", icon: AlertTriangle, type: "warning", message: `Você já utilizou ${percentLimit.toFixed(1)}% do limite anual do MEI.` });
    }

    // Alerta 2 — DAS pendente ou próximo do vencimento — only with CNPJ
    if (hasCnpj && impostoPendente) {
      const vencDate = new Date(impostoPendente.vencimento + "T12:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      vencDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        alerts.push({ id: "das-vencido", icon: ShieldAlert, type: "danger", message: `Seu DAS de ${impostoPendente.competencia} está vencido! Regularize o pagamento.` });
      } else if (diffDays === 0) {
        alerts.push({ id: "das-hoje", icon: Clock, type: "danger", message: "Seu imposto MEI (DAS) vence hoje!" });
      } else if (diffDays <= 7) {
        alerts.push({ id: "das-vencimento", icon: Clock, type: "warning", message: `Seu DAS de ${impostoPendente.competencia} vence em ${diffDays} dia${diffDays > 1 ? "s" : ""} (${vencDate.toLocaleDateString("pt-BR")}).` });
      } else {
        alerts.push({ id: "das-pendente", icon: Receipt, type: "warning", message: `DAS de ${impostoPendente.competencia} pendente — vencimento em ${vencDate.toLocaleDateString("pt-BR")}.` });
      }
    }

    // Alertas de cobranças recorrentes/parceladas
    const todayStr = new Date().toISOString().slice(0, 10);
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const twoDaysStr = twoDaysLater.toISOString().slice(0, 10);

    // Receitas pendentes (cobranças)
    const receitasPendentes = receitas.filter((r: any) => 
      r.tipo_transacao === "recorrente" && r.status === "pendente"
    );
    const receitasVencidas = receitasPendentes.filter((r: any) => r.data < todayStr);
    const receitasHoje = receitasPendentes.filter((r: any) => r.data === todayStr);
    const receitasProximas = receitasPendentes.filter((r: any) => r.data > todayStr && r.data <= twoDaysStr);

    if (receitasVencidas.length > 0) {
      alerts.push({ id: "rec-vencidas", icon: ShieldAlert, type: "danger", message: `${receitasVencidas.length} cobrança${receitasVencidas.length > 1 ? "s" : ""} vencida${receitasVencidas.length > 1 ? "s" : ""} (${formatCurrency(receitasVencidas.reduce((s: number, r: any) => s + r.valor, 0))}).` });
    }
    if (receitasHoje.length > 0) {
      alerts.push({ id: "rec-hoje", icon: Clock, type: "warning", message: `${receitasHoje.length} cobrança${receitasHoje.length > 1 ? "s" : ""} vence${receitasHoje.length > 1 ? "m" : ""} hoje (${formatCurrency(receitasHoje.reduce((s: number, r: any) => s + r.valor, 0))}).` });
    }
    if (receitasProximas.length > 0) {
      alerts.push({ id: "rec-proximas", icon: Bell, type: "warning", message: `${receitasProximas.length} cobrança${receitasProximas.length > 1 ? "s" : ""} nos próximos 2 dias.` });
    }

    // Despesas pendentes
    const despesasPendentes = despesas.filter((d: any) =>
      (d.tipo_transacao === "recorrente" || d.tipo_transacao === "parcelada") && d.status === "pendente"
    );
    const despesasVencidas = despesasPendentes.filter((d: any) => d.data < todayStr);
    const despesasHoje = despesasPendentes.filter((d: any) => d.data === todayStr);

    if (despesasVencidas.length > 0) {
      alerts.push({ id: "desp-vencidas", icon: ShieldAlert, type: "danger", message: `${despesasVencidas.length} despesa${despesasVencidas.length > 1 ? "s" : ""} pendente${despesasVencidas.length > 1 ? "s" : ""} vencida${despesasVencidas.length > 1 ? "s" : ""} (${formatCurrency(despesasVencidas.reduce((s: number, d: any) => s + d.valor, 0))}).` });
    }
    if (despesasHoje.length > 0) {
      alerts.push({ id: "desp-hoje", icon: Clock, type: "warning", message: `${despesasHoje.length} despesa${despesasHoje.length > 1 ? "s" : ""} vence${despesasHoje.length > 1 ? "m" : ""} hoje.` });
    }

    // Alerta 3 & 4 — Variação de faturamento
    if (prevMonth.rec > 0 && faturamentoMes > 0) {
      const variation = ((faturamentoMes - prevMonth.rec) / prevMonth.rec) * 100;
      if (variation > 20) {
        alerts.push({ id: "fat-cresceu", icon: Flame, type: "success", message: `Parabéns! Seu faturamento cresceu ${variation.toFixed(0)}% este mês. 🚀` });
      } else if (variation < 0) {
        alerts.push({ id: "fat-caiu", icon: TrendingDown, type: "warning", message: `Seu faturamento caiu ${Math.abs(variation).toFixed(0)}% comparado ao mês passado.` });
      }
    } else if (faturamentoMes > 0 && prevMonth.rec === 0) {
      alerts.push({ id: "fat-novo", icon: CheckCircle2, type: "success", message: `Ótimo início de mês! Faturamento atual: ${formatCurrency(faturamentoMes)}.` });
    }

    return alerts.filter((a) => !hiddenAlerts.has(a.id));
  }, [percentLimit, impostoPendente, prevMonth, faturamentoMes, hiddenAlerts, hasCnpj, receitas, despesas]);

  const alertStyles = {
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", iconColor: "text-emerald-600" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400", iconColor: "text-amber-600" },
    danger: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", iconColor: "text-destructive" },
  };

  const isLoading = loadingReceitas || loadingDespesas;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Header + CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Olá, bem-vindo ao Vektor</h1>
          <p className="text-sm text-muted-foreground">Seu centro de controle financeiro.</p>
        </div>
        <div className="hidden md:flex gap-2">
          <Button size="sm" onClick={() => navigate("/receitas")}>
            <Plus className="h-4 w-4" /> Registrar Receita
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/despesas")}>
            <Plus className="h-4 w-4" /> Registrar Despesa
          </Button>
        </div>
      </div>

      {/* Financial View Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">Visualizar:</span>
        <ToggleGroup
          type="single"
          value={financialView}
          onValueChange={(v) => { if (v) setFinancialView(v as FinancialView); }}
          className="bg-muted/50 rounded-lg p-1"
        >
          <ToggleGroupItem value="pessoal" aria-label="Pessoal" className="gap-1.5 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
            <User className="h-3.5 w-3.5" />
            Pessoal
          </ToggleGroupItem>
          {hasCnpj && (
            <>
              <ToggleGroupItem value="mei" aria-label="MEI" className="gap-1.5 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                <Briefcase className="h-3.5 w-3.5" />
                MEI
              </ToggleGroupItem>
              <ToggleGroupItem value="tudo" aria-label="Tudo" className="gap-1.5 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md">
                <Layers className="h-3.5 w-3.5" />
                Tudo
              </ToggleGroupItem>
            </>
          )}
        </ToggleGroup>
      </div>

      {/* Key Financial Indicators */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      ) : (
        <KpiCards receitas={receitas} despesas={despesas} currentMonth={currentMonth} now={now} hasCnpj={hasCnpj} />
      )}

      {/* Financial Alerts */}
      {!isLoading && financialAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alertas Financeiros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {financialAlerts.map((alert) => {
              const style = alertStyles[alert.type];
              return (
                <div key={alert.id} className="animate-fade-in">
                  <div className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} p-3`}>
                    <alert.icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.iconColor}`} />
                    <p className={`text-sm flex-1 ${style.text}`}>{alert.message}</p>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="shrink-0 rounded-md p-0.5 hover:bg-background/50 transition-colors"
                      aria-label="Ocultar alerta"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Company Card or CTA Banner */}
      {hasCnpj ? (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/configuracoes")}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm truncate">{empresa.razao_social || empresa.nome_fantasia || "Empresa"}</p>
              {empresa.nome_fantasia && empresa.razao_social && (
                <p className="text-xs text-muted-foreground truncate">{empresa.nome_fantasia}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {empresa.situacao_cadastral && (
                <Badge variant={empresa.situacao_cadastral.toLowerCase().includes("ativa") ? "default" : "destructive"} className="text-xs">
                  {empresa.situacao_cadastral}
                </Badge>
              )}
              {empresa.cnae_principal && (
                <span className="text-xs text-muted-foreground hidden sm:block max-w-48 truncate">{empresa.cnae_principal}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={() => navigate("/configuracoes")}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm">Você é MEI?</p>
              <p className="text-xs text-muted-foreground">Cadastre seu CNPJ nas Configurações para desbloquear o controle financeiro empresarial.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0">
              Cadastrar CNPJ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Saldo + Saúde Financeira */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="h-full">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5 text-chart-3" />
                <span className="text-sm text-muted-foreground">Saldo do Mês</span>
              </div>
              <p className={`font-heading text-2xl sm:text-4xl font-bold ${saldoMes >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(saldoMes)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Receitas: {formatCurrency(faturamentoMes)} — Despesas: {formatCurrency(despesasMesTotal)}
              </p>
            </CardContent>
          </Card>

          <Card className={`h-full border ${healthConfig.border}`}>
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-1">
                <HeartPulse className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Saúde Financeira</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <healthConfig.icon className={`h-6 w-6 ${healthConfig.color}`} />
                <span className={`font-heading text-xl font-bold ${healthConfig.color}`}>{healthConfig.label}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Despesas / Faturamento</span>
                  <span>{despesaPercent.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(despesaPercent, 100)} className="h-2" />
              </div>
              <p className="text-sm font-medium mt-2">
                Lucro: <span className={saldoMes >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(saldoMes)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Faturamento do Mês", value: faturamentoMes, icon: TrendingUp, color: "text-primary" },
            { label: "Despesas do Mês", value: despesasMesTotal, icon: TrendingDown, color: "text-destructive" },
            { label: "Imposto MEI Pendente", value: impostoPendente?.valor ?? 0, icon: Receipt, color: "text-accent" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="font-heading text-2xl font-bold">{formatCurrency(s.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Financial Insights */}
      {!isLoading && insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Insights Financeiros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight) => (
              <Card key={insight.title} className={`border-l-4 ${insightColors[insight.type]}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <insight.icon className={`h-5 w-5 mt-0.5 shrink-0 ${insightIconColors[insight.type]}`} />
                  <div>
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    <p className="text-xs text-muted-foreground italic mt-1">💡 {insight.suggestion}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Charts — lazy-loaded */}
      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts monthlyData={monthlyData} categoryData={categoryData} />
      </Suspense>

      {/* Meta Financeira Card */}
      {metaAtual && (
        <Card className="border-accent/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/metas")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <span className="font-heading font-semibold">Meta Atual: {metaAtual.titulo}</span>
              </div>
              <span className="text-xs text-muted-foreground">{metaAtual.categoria}</span>
            </div>
            <Progress value={metaAtual.valor_alvo > 0 ? Math.min((metaAtual.valor_atual / metaAtual.valor_alvo) * 100, 100) : 0} className="h-3 mb-2" />
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Acumulado: <span className="font-semibold text-primary">{formatCurrency(metaAtual.valor_atual)}</span></span>
              <span className="text-muted-foreground">Meta: <span className="font-semibold">{formatCurrency(metaAtual.valor_alvo)}</span></span>
              <span className="text-muted-foreground">Falta: <span className="font-semibold text-destructive">{formatCurrency(Math.max(metaAtual.valor_alvo - metaAtual.valor_atual, 0))}</span></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Report Summary */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/relatorio-mensal")}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-chart-3" />
              <span className="font-heading font-semibold">Resumo — {prevMonth.label}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {prevMonth.varFat >= 0
                ? <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              }
              {Math.abs(prevMonth.varFat).toFixed(1)}% vs mês anterior
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Faturamento</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(prevMonth.rec)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(prevMonth.desp)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={`text-lg font-bold ${prevMonth.lucro >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(prevMonth.lucro)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Últimas Receitas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              ) : latestReceitas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
              ) : (
                latestReceitas.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <CategoryIcon category={r.descricao} type="receita" size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.descricao}</p>
                      <p className="text-xs text-muted-foreground">{r.forma_pagamento ?? "—"} • {formatDate(r.data)}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${transactionColors.receita.text}`}>+{formatCurrency(r.valor)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Últimas Despesas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              ) : latestDespesas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
              ) : (
                latestDespesas.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <CategoryIcon category={d.categoria} type="despesa" size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground">{d.categoria ?? "—"} • {formatDate(d.data)}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${transactionColors.despesa.text}`}>-{formatCurrency(d.valor)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}