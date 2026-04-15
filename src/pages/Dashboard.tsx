import { useMemo, useState, useCallback, useEffect, lazy, Suspense } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, ShieldCheck, AlertTriangle, ShieldAlert, Target,
  FileText, ArrowUpRight, ArrowDownRight, Building2, X, Bell,
  Clock, Flame, User, Briefcase, Layers, Info, PiggyBank, CalendarIcon, CreditCard,
  ChevronRight
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useCategories, type CategoriaDB } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFinancialView } from "@/contexts/FinancialViewContext";

import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { useInvoices } from "@/hooks/useInvoices";
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
import { CashFlowProjection } from "@/components/dashboard/CashFlowProjection";
import { FinancialCalendar } from "@/components/dashboard/FinancialCalendar";
import { DayTransactionsDrawer } from "@/components/dashboard/DayTransactionsDrawer";
import { QuickAddModal } from "@/components/mobile/QuickAddModal";
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
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>("");

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

  const { data: assinaturas = [] } = useQuery({
    queryKey: ["radar_assinaturas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_assinaturas").select("*")
        .eq("user_id", user!.id).eq("ativa", true);
      if (error) throw error;
      const currentMonth = getLocalDateString().slice(0, 7);
      return (data ?? []).map((a: any) => ({
        ...a,
        status: a.last_paid_month === currentMonth ? a.status : "pending"
      }));
    },
    enabled: !!user,
  });

  const { accounts } = useAccounts();
  const metaAtual = metas.find((m) => m.valor_atual < m.valor_alvo) || metas[0];

  // Busca compras e cartões para calcular fatura real (igual à página de Cartões)
  const { data: todasComprasCartao = [] } = useQuery({
    queryKey: ["compras_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("compras_cartao").select("cartao_id, valor, data");
      if (error) throw error;
      return (data ?? []) as { cartao_id: string; valor: number; data: string }[];
    },
    enabled: !!user,
  });

  const { data: todosCartoesCredito = [] } = useQuery({
    queryKey: ["cartoes_credito", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartoes_credito").select("id, dia_fechamento");
      if (error) throw error;
      return (data ?? []) as { id: string; dia_fechamento: number }[];
    },
    enabled: !!user,
  });

  const { data: todasFaturasCartao = [] } = useQuery({
    queryKey: ["faturas_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturas_cartao").select("cartao_id, mes_referencia, status");
      if (error) throw error;
      return (data ?? []) as { cartao_id: string; mes_referencia: string; status: string }[];
    },
    enabled: !!user,
  });

  const assinaturasResumo = useMemo(() => {
    let totalPago = 0;
    let totalPendente = 0;
    assinaturas.forEach((a: any) => {
      if (a.status === "paid") totalPago += (a.valor || 0);
      else totalPendente += (a.valor || 0);
    });
    return { pago: totalPago, pendente: totalPendente, total: totalPago + totalPendente };
  }, [assinaturas]);

  // Calcula a fatura atual somando compras_cartao do mês vigente (igual à lógica da página de Cartões)
  const faturasResumo = useMemo(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const currDay = now.getDate();

    // Função local para determinar em qual período de fatura uma compra cai
    function getInvoicePeriod(purchaseDate: string, diaFechamento: number): string {
      const d = new Date(purchaseDate + "T12:00:00");
      const day = d.getDate();
      const y = d.getFullYear();
      const m = d.getMonth();
      if (day >= diaFechamento) {
        const next = new Date(y, m + 1, 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
      }
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    }

    // Mês atual e próximo no formato YYYY-MM
    const currMesRef = `${currYear}-${String(currMonth + 1).padStart(2, "0")}`;
    const nextDate = new Date(currYear, currMonth + 1, 1);
    const nextMesRef = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

    // Faturas já pagas (não conta no cálculo)
    const faturasPagas = new Set(
      todasFaturasCartao.filter(f => f.status === "paga").map(f => `${f.cartao_id}|${f.mes_referencia}`)
    );

    // Cria um mapa de dia_fechamento por cartao_id
    const diaFechamentoMap: Record<string, number> = {};
    todosCartoesCredito.forEach(c => {
      diaFechamentoMap[c.id] = c.dia_fechamento || 1;
    });

    let atualVal = 0;
    let proxVal = 0;

    todasComprasCartao.forEach(compra => {
      const diaFech = diaFechamentoMap[compra.cartao_id] ?? 1;
      const periodo = getInvoicePeriod(compra.data, diaFech);
      const key = `${compra.cartao_id}|${periodo}`;
      if (faturasPagas.has(key)) return; // fatura já foi paga, ignora
      if (periodo === currMesRef) {
        atualVal += compra.valor;
      } else if (periodo === nextMesRef) {
        proxVal += compra.valor;
      }
    });

    return { atualVal, proxVal };
  }, [todasComprasCartao, todosCartoesCredito, todasFaturasCartao]);

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

  const [mostrarPrevisoes, setMostrarPrevisoes] = useState(false);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Use Centralized Service for Chart Data
  const monthlyData = useMemo(() => {
    if (!raw) return [];
    const all = [...(raw.receitas || []), ...(raw.despesas || [])];
    return FinanceService.getMonthlySeries(all, financialView, 6, mostrarPrevisoes);
  }, [raw, financialView, mostrarPrevisoes]);

  const prevMonth = useMemo(() => {
    if (!raw) return { label: "", rec: 0, desp: 0, lucro: 0, varFat: 0 };
    const all = [...(raw.receitas || []), ...(raw.despesas || [])];
    const months = FinanceService.getMonthlySeries(all, financialView, 2);
    const prev = months[0] || { month: "", receitas: 0, despesas: 0, saldo: 0 };
    const current = faturamentoMes;
    const varFat = prev.receitas > 0 ? ((current - prev.receitas) / prev.receitas) * 100 : 0;
    return { label: prev.month, rec: prev.receitas, desp: prev.despesas, lucro: prev.saldo, varFat };
  }, [raw, financialView, faturamentoMes]);

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
    if (!raw) return [];
    const data = FinanceService.getCategoryBreakdown(raw.despesas || [], financialView, currentMonth);
    return data.map(item => ({
      ...item,
      fill: catColorMap[item.name] || getVibrantColor(item.name)
    }));
  }, [raw, financialView, currentMonth, catColorMap]);

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

    const hojeData = new Date();
    const diaHoje = hojeData.getDate();
    hojeData.setDate(hojeData.getDate() + 1);
    const diaAmanha = hojeData.getDate();

    const assPendentesVizinhas = assinaturas.filter((a: any) => {
      if (a.status !== "pending") return false;
      return a.dia_cobranca === diaHoje || a.dia_cobranca === diaAmanha;
    });

    if (assPendentesVizinhas.length > 0) {
       newAlerts.push({
          id: "ass-pendentes",
          icon: Clock,
          type: "warning",
          message: `${assPendentesVizinhas.length} assinatura(s) prevista(s) para hoje ou amanhã.`,
          actionRoute: "/dashboard" // fallback ou abre a tab de assinaturas futuramente
       });
    }

    const todayStr = getLocalDateString();
    const currentMonth = todayStr.slice(0, 7);
    const recsAtention = (raw?.receitas || []).filter(r => r.status === "pending" && r.date.startsWith(currentMonth) && r.date <= todayStr);
    if (recsAtention.length > 0) {
      newAlerts.push({ 
        id: "recs-atention", 
        icon: ShieldAlert, 
        type: "danger", 
        message: `${recsAtention.length} cobranças pendentes ou vencidas.`,
        actionRoute: "/alertas/resolucao?type=receitas"
      });
    }

    const despVencidas = (raw?.despesas || []).filter(d => d.status === "pending" && d.date.startsWith(currentMonth) && d.date < todayStr);
    if (despVencidas.length > 0) {
      newAlerts.push({ 
        id: "desp-vencidas", 
        icon: ShieldAlert, 
        type: "danger", 
        message: `${despVencidas.length} despesas vencidas.`,
        actionRoute: "/alertas/resolucao?type=despesas"
      });
    }

    if (prevMonth.rec > 0 && faturamentoMes > 0) {
      if (prevMonth.varFat > 20) newAlerts.push({ id: "fat-grow", icon: TrendingUp, type: "success", message: `Seu faturamento cresceu ${prevMonth.varFat.toFixed(0)}%! 🚀` });
      else if (prevMonth.varFat < -10) newAlerts.push({ id: "fat-drop", icon: TrendingDown, type: "warning", message: `Faturamento caiu ${Math.abs(prevMonth.varFat).toFixed(0)}% vs mês passado.` });
    }

    return newAlerts.filter((a) => !hiddenAlerts.has(a.id));
  }, [limiteMei, faturamentoAnual, hasCnpj, impostoPendente, raw, prevMonth, faturamentoMes, hiddenAlerts, assinaturas]);

  const flowChartData = useMemo(() => {
    if (!raw) return [];
    const now = new Date();
    const today = now.getDate();
    const days = Array.from({ length: today }, (_, i) => i + 1);
    
    // Starting balance: approx using simple subtract
    let currentFlowBalance = saldoTotal - saldoMes; 

    return days.map(day => {
      const dayStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const rec = (raw.receitas || []).filter(r => (r.date || r.data) === dayStr).reduce((s, r) => s + (r.amount || r.valor || 0), 0);
      const desp = (raw.despesas || []).filter(d => (d.date || d.data) === dayStr).reduce((s, d) => s + (d.amount || d.valor || 0), 0);
      currentFlowBalance += rec - desp;
      return { dia: day, receitas: rec, despesas: desp, saldo: currentFlowBalance, dateStr: dayStr };
    });
  }, [saldoTotal, saldoMes, raw, currentMonth]);

  const compromissosFuturos = useMemo(() => {
    if (!raw) return 0;
    return (raw.despesas || [])
      .filter(d => (d.status === "pending" || d.status === "pendente") && (d.date || d.data).startsWith(currentMonth))
      .reduce((sum, d) => sum + (d.amount || d.valor || 0), 0);
  }, [raw, currentMonth]);

  const despesaPercent = faturamentoMes > 0 ? (despesasMesTotal / faturamentoMes) * 100 : 0;
  const isLoading = loading;

  const handleBarClick = useCallback((monthRawKey: string) => {
    setSelectedDate(null);
    setSelectedMonthStr(monthRawKey);
    setSelectedCategory(null);
    setDrawerOpen(true);
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedDate(null);
    setSelectedMonthStr(currentMonth);
    setSelectedCategory(category);
    setDrawerOpen(true);
  }, [currentMonth]);

  const handleDayClick = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    setSelectedMonthStr(null);
    setSelectedCategory(null);
    setDrawerOpen(true);
  }, []);

  const handleAddTransactionFromDrawer = useCallback((dateStr: string) => {
    setDrawerOpen(false);
    setQuickAddDate(dateStr);
    setQuickAddOpen(true);
  }, []);

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

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* Coluna Principal: Insights e Gráficos */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <InsightsFinanceiros
            faturamentoMes={faturamentoMes}
            despesasMesTotal={despesasMesTotal}
            despesaPercent={despesaPercent}
            savingsRate={taxaPoupanca}
            varFaturamento={prevMonth.varFat}
            categoryData={categoryData}
          />

          <HealthAlerts alerts={alerts} onDismiss={dismissAlert} />
        </div>

        {/* Coluna Lateral: Cards de Status Próximo */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Fatura Atual → /cartoes */}
          <Card
            className="relative overflow-hidden border-none bg-emerald-500/5 cursor-pointer hover:shadow-xl hover:bg-emerald-500/10 transition-all duration-300 group rounded-2xl p-0.5"
            onClick={() => navigate("/cartoes")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
            <CardContent className="p-5 relative z-10 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 transition-transform group-hover:scale-110">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-emerald-600/70 uppercase tracking-widest font-bold">Fatura Atual</span>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xl font-bold text-foreground">{formatCurrency(faturasResumo.atualVal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 font-medium">Próxima: {formatCurrency(faturasResumo.proxVal)}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-4 w-4 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="relative overflow-hidden border-none bg-indigo-500/5 cursor-pointer hover:shadow-xl hover:bg-indigo-500/10 transition-all duration-300 group rounded-2xl p-0.5"
            onClick={() => navigate("/assinaturas")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
            <CardContent className="p-5 relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/20 text-indigo-600">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-indigo-600/70 uppercase tracking-widest font-bold flex-1">Assinaturas do Mês</span>
                <ChevronRight className="h-3 w-3 text-indigo-600 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Previsão</span>
                    <span className="font-heading text-lg font-bold text-foreground">{formatCurrency(assinaturasResumo.total)}</span>
                 </div>
                 <div className="flex flex-col text-right">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Pago</span>
                    <span className="font-heading text-lg font-bold text-primary">{formatCurrency(assinaturasResumo.pago)}</span>
                 </div>
              </div>
              <div className="w-full bg-black/10 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                 <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${assinaturasResumo.total > 0 ? (assinaturasResumo.pago / assinaturasResumo.total) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card
              className="relative overflow-hidden border-none bg-amber-500/5 cursor-pointer hover:shadow-xl hover:bg-amber-500/10 transition-all duration-300 group rounded-2xl p-0.5"
              onClick={() => navigate("/despesas")}
            >
              <CardContent className="p-4 relative z-10 flex flex-col gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-amber-600/70 uppercase tracking-widest font-bold">Pendentes</span>
                  <p className="font-heading text-base font-bold text-foreground truncate">{formatCurrency(compromissosFuturos)}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="relative overflow-hidden border-none bg-primary/5 cursor-pointer hover:shadow-xl hover:bg-primary/10 transition-all duration-300 group rounded-2xl p-0.5"
              onClick={() => navigate("/relatorios")}
            >
              <CardContent className="p-4 relative z-10 flex flex-col gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-primary/70 uppercase tracking-widest font-bold">Poupança</span>
                  <p className="font-heading text-base font-bold text-foreground">{taxaPoupanca.toFixed(0)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {orphanedCount > 0 && accounts.length > 0 && (
            <Card
              className="border-none bg-destructive/10 cursor-pointer hover:bg-destructive/15 transition-all rounded-2xl"
              onClick={() => navigate("/contas")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
                  <Info className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 text-destructive/90">
                  <p className="text-[10px] font-bold uppercase tracking-tight line-clamp-1">{orphanedCount} Transações sem conta</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 mb-2">
         <h2 className="text-xl font-heading font-bold text-foreground">Análise de Tendências</h2>
         <div className="flex items-center space-x-2">
            <Switch 
               id="previsoes-toggle" 
               checked={mostrarPrevisoes} 
               onCheckedChange={setMostrarPrevisoes} 
            />
            <Label htmlFor="previsoes-toggle" className="text-sm font-medium cursor-pointer">
              {mostrarPrevisoes ? "Previsão + Realizado" : "Apenas Realizado"}
            </Label>
         </div>
      </div>

      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts 
          monthlyData={monthlyData} 
          categoryData={categoryData} 
          flowChartData={flowChartData as any} 
          onMonthClick={(monthLabel) => {
             const found = monthlyData.find(m => m.month === monthLabel);
             if (found?.rawKey) handleBarClick(found.rawKey);
          }}
          onCategoryClick={handleCategoryClick}
          onDayClick={handleDayClick}
        />
      </Suspense>

      <FinancialCalendar 
        receitas={raw.receitas}
        despesas={raw.despesas}
        saldoTotal={saldoTotal}
        assinaturas={assinaturas}
      />

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

      <DayTransactionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        date={selectedDate}
        monthStr={selectedMonthStr}
        categoryStr={selectedCategory}
        receitas={raw.receitas}
        despesas={raw.despesas}
        onAddTransaction={handleAddTransactionFromDrawer}
      />

      <QuickAddModal 
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultDate={quickAddDate}
      />
    </div>
  );
}
