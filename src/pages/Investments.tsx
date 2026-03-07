import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  PiggyBank,
  Lightbulb,
  BarChart3,
  Calendar,
  Trophy,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Settings2,
  Upload,
  Bookmark,
  Flag,
  Rocket,
  Eye,
  Gift,
  Zap,
  ChevronRight,
  Save,
  StickyNote,
  Filter,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useInvestments, type InvestimentoAtivoInsert, type InvestimentoDividendoInsert } from "@/hooks/useInvestments";
import { useStockQuotes, type QuoteResult } from "@/hooks/useStockQuotes";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const TIPO_ATIVO_LABELS: Record<string, string> = {
  acao: "Ações",
  fii: "FIIs",
  etf: "ETFs",
  cripto: "Cripto",
  renda_fixa: "Renda Fixa",
  fundo: "Fundos",
};

const TIPO_ATIVO_COLORS: Record<string, string> = {
  acao: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  fii: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  etf: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  cripto: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  renda_fixa: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  fundo: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const TIPO_DIVIDENDO_LABELS: Record<string, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
};

const PRESET_RATES = [
  { label: "6%", value: 6 },
  { label: "10%", value: 10 },
  { label: "14%", value: 14 },
];

const ALL_COLUMNS = [
  { key: "nome", label: "Ativo", required: true },
  { key: "tipo", label: "Tipo" },
  { key: "quantidade", label: "Qtd" },
  { key: "preco_medio", label: "PM" },
  { key: "preco_atual", label: "Cotação" },
  { key: "variacao", label: "Variação %" },
  { key: "dy12m", label: "DY 12m" },
  { key: "valor_investido", label: "Investido" },
  { key: "valor_atual", label: "Valor Atual" },
  { key: "resultado", label: "Resultado R$" },
  { key: "nota", label: "Nota" },
];

const DEFAULT_COLUMNS = ["nome", "tipo", "quantidade", "preco_medio", "preco_atual", "variacao", "valor_atual", "resultado"];

const DEMO_ATIVOS = [
  { nome: "PETR4", tipo: "acao", quantidade: 100, preco_medio: 28.5, preco_atual: 36.2, data_compra: "2025-06-15" },
  { nome: "HGLG11", tipo: "fii", quantidade: 50, preco_medio: 155.0, preco_atual: 168.3, data_compra: "2025-03-10" },
  { nome: "IVVB11", tipo: "etf", quantidade: 30, preco_medio: 290.0, preco_atual: 315.0, data_compra: "2025-01-20" },
  { nome: "Bitcoin", tipo: "cripto", quantidade: 0.05, preco_medio: 180000, preco_atual: 210000, data_compra: "2024-11-01" },
  { nome: "CDB 120% CDI", tipo: "renda_fixa", quantidade: 1, preco_medio: 5000, preco_atual: 5650, data_compra: "2024-08-15" },
];

function calcCompoundInterest(
  initial: number,
  monthly: number,
  annualRate: number,
  totalMonths: number,
  inflationRate: number,
) {
  const realAnnualRate =
    inflationRate > 0
      ? (1 + annualRate / 100) / (1 + inflationRate / 100) - 1
      : annualRate / 100;
  const monthlyRate = Math.pow(1 + realAnnualRate, 1 / 12) - 1;
  const chartData: { ano: number; acumulado: number; investido: number }[] = [];
  let balance = initial;
  let totalInvested = initial;
  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    totalInvested += monthly;
    if (m % 12 === 0 || m === totalMonths) {
      chartData.push({
        ano: Math.round((m / 12) * 10) / 10,
        acumulado: Math.round(balance * 100) / 100,
        investido: Math.round(totalInvested * 100) / 100,
      });
    }
  }
  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    finalValue: Math.round(balance * 100) / 100,
    profit: Math.round((balance - totalInvested) * 100) / 100,
    passiveIncome: Math.round(balance * 0.006 * 100) / 100,
    chartData,
  };
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyInput(formatted: string): number {
  if (!formatted) return 0;
  return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}

// ─── Main Component ───
export default function Investments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "dashboard";
  const { toast } = useToast();
  const { ativos, addAtivo, deleteAtivo, dividendos, addDividendo, deleteDividendo } = useInvestments();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const now = new Date();
  const mesAnoLabel = format(now, "MMMM yyyy", { locale: ptBR });

  const patrimonio = useMemo(() => {
    if (!ativos.data) return 0;
    return ativos.data.reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_atual), 0);
  }, [ativos.data]);

  const totalInvestido = useMemo(() => {
    if (!ativos.data) return 0;
    return ativos.data.reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_medio), 0);
  }, [ativos.data]);

  const lucroPrejuizo = patrimonio - totalInvestido;
  const variacaoPct = totalInvestido > 0 ? (lucroPrejuizo / totalInvestido) * 100 : 0;

  // Rentabilidade no mês (aprox: aportes do mês vs patrimônio)
  const rentabilidadeMes = useMemo(() => {
    if (!ativos.data || !ativos.data.length) return 0;
    const start = startOfMonth(now);
    const aportesMes = ativos.data
      .filter(a => new Date(a.data_compra) >= start)
      .reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_medio), 0);
    const patrimonioInicioMes = totalInvestido - aportesMes;
    if (patrimonioInicioMes <= 0) return 0;
    return ((patrimonio - patrimonioInicioMes - aportesMes) / patrimonioInicioMes) * 100;
  }, [ativos.data, patrimonio, totalInvestido]);

  const dividendosMes = useMemo(() => {
    if (!dividendos.data) return 0;
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return dividendos.data
      .filter((d) => {
        const dt = new Date(d.data_recebimento);
        return dt >= start && dt <= end;
      })
      .reduce((s, d) => s + Number(d.valor), 0);
  }, [dividendos.data]);

  const dividendosAno = useMemo(() => {
    if (!dividendos.data) return 0;
    const start = startOfYear(now);
    const end = endOfYear(now);
    return dividendos.data
      .filter((d) => {
        const dt = new Date(d.data_recebimento);
        return dt >= start && dt <= end;
      })
      .reduce((s, d) => s + Number(d.valor), 0);
  }, [dividendos.data]);

  const hasAtivos = (ativos.data?.length ?? 0) > 0;

  // Dialogs state lifted for header buttons
  const [openAtivo, setOpenAtivo] = useState(false);
  const [openDividendo, setOpenDividendo] = useState(false);

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
            <LineChartIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carteira Geral</h1>
            <p className="text-sm text-muted-foreground capitalize">{mesAnoLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => { setOpenAtivo(true); handleTabChange("carteira"); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar ativo
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setOpenDividendo(true); handleTabChange("dividendos"); }}>
            <DollarSign className="h-4 w-4 mr-1" /> Novo lançamento
          </Button>
          <Button size="sm" variant="outline" disabled className="opacity-60">
            <Upload className="h-4 w-4 mr-1" /> Importar da B3
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">Em breve</Badge>
          </Button>
        </div>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="carteira">Carteira</TabsTrigger>
          <TabsTrigger value="dividendos">Dividendos</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            patrimonio={patrimonio}
            totalInvestido={totalInvestido}
            lucroPrejuizo={lucroPrejuizo}
            variacaoPct={variacaoPct}
            rentabilidadeMes={rentabilidadeMes}
            dividendosMes={dividendosMes}
            dividendosAno={dividendosAno}
            ativos={ativos.data ?? []}
            dividendos={dividendos.data ?? []}
            onNavigate={handleTabChange}
          />
        </TabsContent>

        <TabsContent value="carteira">
          <CarteiraTab
            ativos={ativos.data ?? []}
            dividendos={dividendos.data ?? []}
            isLoading={ativos.isLoading}
            openDialog={openAtivo}
            setOpenDialog={setOpenAtivo}
            onAdd={(a) =>
              addAtivo.mutate(a, {
                onSuccess: () => toast({ title: "Ativo adicionado com sucesso" }),
              })
            }
            onDelete={(id) =>
              deleteAtivo.mutate(id, {
                onSuccess: () => toast({ title: "Ativo removido" }),
              })
            }
          />
        </TabsContent>

        <TabsContent value="dividendos">
          <DividendosTab
            dividendos={dividendos.data ?? []}
            ativos={ativos.data ?? []}
            isLoading={dividendos.isLoading}
            dividendosMes={dividendosMes}
            dividendosAno={dividendosAno}
            patrimonio={patrimonio}
            openDialog={openDividendo}
            setOpenDialog={setOpenDividendo}
            onAdd={(d) =>
              addDividendo.mutate(d, {
                onSuccess: () => toast({ title: "Dividendo registrado" }),
              })
            }
            onDelete={(id) =>
              deleteDividendo.mutate(id, {
                onSuccess: () => toast({ title: "Dividendo removido" }),
              })
            }
          />
        </TabsContent>

        <TabsContent value="metas">
          <MetasTab patrimonio={patrimonio} dividendosMes={dividendosMes} />
        </TabsContent>

        <TabsContent value="simulador">
          <SimuladorTab patrimonio={patrimonio} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Dashboard Tab
// ═══════════════════════════════════════════════
function DashboardTab({
  patrimonio,
  totalInvestido,
  lucroPrejuizo,
  variacaoPct,
  rentabilidadeMes,
  dividendosMes,
  dividendosAno,
  ativos,
  dividendos,
  onNavigate,
}: {
  patrimonio: number;
  totalInvestido: number;
  lucroPrejuizo: number;
  variacaoPct: number;
  rentabilidadeMes: number;
  dividendosMes: number;
  dividendosAno: number;
  ativos: any[];
  dividendos: any[];
  onNavigate: (tab: string) => void;
}) {
  const composicao = useMemo(() => {
    if (!ativos.length) return [];
    const grouped: Record<string, number> = {};
    ativos.forEach((a) => {
      const val = Number(a.quantidade) * Number(a.preco_atual);
      grouped[a.tipo] = (grouped[a.tipo] || 0) + val;
    });
    return Object.entries(grouped)
      .map(([tipo, valor]) => ({
        name: TIPO_ATIVO_LABELS[tipo] || tipo,
        value: Math.round(valor * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [ativos]);

  const topRendimentos = useMemo(() => {
    if (!ativos.length) return [];
    return [...ativos]
      .map((a) => {
        const invested = Number(a.quantidade) * Number(a.preco_medio);
        const current = Number(a.quantidade) * Number(a.preco_atual);
        const pct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
        return { nome: a.nome, tipo: a.tipo, pct, valor: current };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [ativos]);

  const topPosicoes = useMemo(() => {
    if (!ativos.length) return [];
    return [...ativos]
      .map((a) => ({
        nome: a.nome,
        tipo: a.tipo,
        valor: Number(a.quantidade) * Number(a.preco_atual),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [ativos]);

  const topDividendos = useMemo(() => {
    if (!ativos.length || !dividendos.length) return [];
    const divByAtivo: Record<string, number> = {};
    dividendos.forEach((d) => {
      if (d.ativo_id) divByAtivo[d.ativo_id] = (divByAtivo[d.ativo_id] || 0) + Number(d.valor);
    });
    const ativoMap: Record<string, any> = {};
    ativos.forEach((a) => (ativoMap[a.id] = a));
    return Object.entries(divByAtivo)
      .map(([id, total]) => ({
        nome: ativoMap[id]?.nome || "—",
        tipo: ativoMap[id]?.tipo || "",
        valor: total,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [ativos, dividendos]);

  // Evolution chart with two lines
  const chartData = useMemo(() => {
    if (!ativos.length) return [];
    const sorted = [...ativos].sort(
      (a, b) => new Date(a.data_compra).getTime() - new Date(b.data_compra).getTime(),
    );
    let cumPatrimonio = 0;
    let cumAportes = 0;
    return sorted.map((a) => {
      cumPatrimonio += Number(a.quantidade) * Number(a.preco_atual);
      cumAportes += Number(a.quantidade) * Number(a.preco_medio);
      return {
        data: format(new Date(a.data_compra), "MMM/yy", { locale: ptBR }),
        patrimonio: Math.round(cumPatrimonio * 100) / 100,
        aportes: Math.round(cumAportes * 100) / 100,
      };
    });
  }, [ativos]);

  // Monthly dividends bar chart
  const monthlyDivData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const total = dividendos
        .filter((dv) => {
          const dt = new Date(dv.data_recebimento);
          return dt >= start && dt <= end;
        })
        .reduce((s, dv) => s + Number(dv.valor), 0);
      months.push({
        label: format(d, "MMM", { locale: ptBR }),
        value: Math.round(total * 100) / 100,
      });
    }
    return months;
  }, [dividendos]);

  // Metas from localStorage for progress display
  const metaPatrimonio = useMemo(() => {
    try { return parseFloat(localStorage.getItem("vektor_meta_patrimonio") || "0") || 0; } catch { return 0; }
  }, []);
  const metaRenda = useMemo(() => {
    try { return parseFloat(localStorage.getItem("vektor_meta_renda") || "0") || 0; } catch { return 0; }
  }, []);

  const indicadores = [
    {
      label: "Patrimônio Atual",
      value: fmt(patrimonio),
      sub: `Investido: ${fmt(totalInvestido)}`,
      icon: Wallet,
      gradient: "from-primary/20 to-primary/5 dark:from-primary/15 dark:to-primary/5",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      valueColor: "text-foreground",
    },
    {
      label: "Lucro / Prejuízo",
      value: fmt(lucroPrejuizo),
      sub: fmtPct(variacaoPct),
      icon: lucroPrejuizo >= 0 ? TrendingUp : TrendingDown,
      gradient: lucroPrejuizo >= 0
        ? "from-emerald-500/20 to-emerald-500/5 dark:from-emerald-500/15 dark:to-emerald-500/5"
        : "from-destructive/20 to-destructive/5 dark:from-destructive/15 dark:to-destructive/5",
      iconBg: lucroPrejuizo >= 0 ? "bg-emerald-500/15" : "bg-destructive/15",
      iconColor: lucroPrejuizo >= 0 ? "text-emerald-500" : "text-destructive",
      valueColor: lucroPrejuizo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
    },
    {
      label: "Rent. no Mês",
      value: fmtPct(rentabilidadeMes),
      sub: format(new Date(), "MMMM", { locale: ptBR }),
      icon: Percent,
      gradient: rentabilidadeMes >= 0
        ? "from-chart-3/20 to-chart-3/5"
        : "from-destructive/20 to-destructive/5",
      iconBg: rentabilidadeMes >= 0 ? "bg-chart-3/15" : "bg-destructive/15",
      iconColor: rentabilidadeMes >= 0 ? "text-chart-3" : "text-destructive",
      valueColor: rentabilidadeMes >= 0 ? "text-chart-3" : "text-destructive",
    },
    {
      label: "Dividendos no Mês",
      value: fmt(dividendosMes),
      sub: format(new Date(), "MMMM yyyy", { locale: ptBR }),
      icon: DollarSign,
      gradient: "from-chart-2/20 to-chart-2/5",
      iconBg: "bg-chart-2/15",
      iconColor: "text-chart-2",
      valueColor: "text-foreground",
    },
    {
      label: "Dividendos no Ano",
      value: fmt(dividendosAno),
      sub: `Média: ${fmt(dividendosAno / (new Date().getMonth() + 1))}/mês`,
      icon: Calendar,
      gradient: "from-chart-4/20 to-chart-4/5",
      iconBg: "bg-chart-4/15",
      iconColor: "text-chart-4",
      valueColor: "text-foreground",
    },
  ];

  // Empty state / onboarding
  if (ativos.length === 0) {
    return <OnboardingState onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* ═══ Hero KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {indicadores.map((ind, i) => (
          <motion.div
            key={ind.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Card className={`bg-gradient-to-br ${ind.gradient} border-0 shadow-sm overflow-hidden`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{ind.label}</p>
                  <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${ind.iconBg} shrink-0`}>
                    <ind.icon className={`h-3.5 w-3.5 ${ind.iconColor}`} />
                  </div>
                </div>
                <p className={`text-lg lg:text-xl font-bold ${ind.valueColor} truncate`}>{ind.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{ind.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ═══ Metas Progress (if set) ═══ */}
      {(metaPatrimonio > 0 || metaRenda > 0) && (
        <Card className="border-dashed cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onNavigate("metas")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flag className="h-4 w-4 text-chart-4" /> Progresso das Metas
              </p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metaPatrimonio > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Patrimônio</span>
                    <span className="font-medium text-foreground">{Math.min(100, (patrimonio / metaPatrimonio) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(100, (patrimonio / metaPatrimonio) * 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">{fmt(patrimonio)} / {fmt(metaPatrimonio)}</p>
                </div>
              )}
              {metaRenda > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Renda mensal</span>
                    <span className="font-medium text-foreground">{Math.min(100, (dividendosMes / metaRenda) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(100, (dividendosMes / metaRenda) * 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">{fmt(dividendosMes)} / {fmt(metaRenda)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Charts ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolution Chart with 2 lines */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Evolução Patrimonial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAportes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="data" className="text-xs fill-muted-foreground" />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`
                    }
                    className="text-xs fill-muted-foreground"
                    width={50}
                  />
                  <RechartsTooltip
                    formatter={(v: number, name: string) => [fmt(v), name === "patrimonio" ? "Patrimônio" : "Aportes"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Area type="monotone" dataKey="aportes" name="aportes" stroke="hsl(var(--primary))" fill="url(#gradAportes)" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="patrimonio" name="patrimonio" stroke="hsl(var(--chart-2))" fill="url(#gradPatrimonio)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Composição da Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={composicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {composicao.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v: number) => [fmt(v)]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {composicao.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Dividendos bar chart ═══ */}
      {dividendos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dividendos por Mês (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDivData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    className="text-xs fill-muted-foreground"
                    width={40}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => [fmt(v), "Dividendos"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Rankings ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankingCard
          title="Melhores Rendimentos"
          icon={Trophy}
          iconColor="text-amber-500"
          items={topRendimentos.map((r) => ({
            nome: r.nome,
            tipo: r.tipo,
            display: fmtPct(r.pct),
            positive: r.pct >= 0,
          }))}
        />
        <RankingCard
          title="Maiores Posições"
          icon={Target}
          iconColor="text-primary"
          items={topPosicoes.map((r) => ({
            nome: r.nome,
            tipo: r.tipo,
            display: fmt(r.valor),
            positive: true,
          }))}
        />
        <RankingCard
          title="Maiores Pagadores"
          icon={DollarSign}
          iconColor="text-chart-2"
          items={topDividendos.map((r) => ({
            nome: r.nome,
            tipo: r.tipo,
            display: fmt(r.valor),
            positive: true,
          }))}
        />
      </div>
    </div>
  );
}

// ═══ Onboarding Empty State ═══
function OnboardingState({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const steps = [
    { icon: Plus, title: "Cadastre seus ativos", desc: "Adicione ações, FIIs, ETFs e mais", color: "text-primary", bg: "bg-primary/10" },
    { icon: Eye, title: "Veja alocação e evolução", desc: "Gráficos de composição e patrimônio", color: "text-chart-2", bg: "bg-chart-2/10" },
    { icon: Gift, title: "Acompanhe dividendos", desc: "Registre proventos e veja seu yield", color: "text-chart-4", bg: "bg-chart-4/10" },
    { icon: Rocket, title: "Defina metas e simule", desc: "Metas de patrimônio e renda passiva", color: "text-chart-3", bg: "bg-chart-3/10" },
  ];

  return (
    <div className="mt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4">
          <LineChartIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Bem-vindo à sua carteira de investimentos!</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Acompanhe seu patrimônio, dividendos e evolução de forma simples e visual.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-5 text-center">
                <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${step.bg} mx-auto mb-3`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button size="lg" onClick={() => onNavigate("carteira")}>
          <Plus className="h-4 w-4 mr-2" /> Cadastre seu primeiro ativo
        </Button>
        <Button size="lg" variant="outline" onClick={() => onNavigate("simulador")}>
          <Calculator className="h-4 w-4 mr-2" /> Simule uma carteira
        </Button>
      </div>
    </div>
  );
}

// ═══ Ranking Card ═══
function RankingCard({
  title,
  icon: Icon,
  iconColor,
  items,
}: {
  title: string;
  icon: any;
  iconColor: string;
  items: { nome: string; tipo: string; display: string; positive: boolean }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{TIPO_ATIVO_LABELS[item.tipo] || item.tipo}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap ${item.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {item.display}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════
// Carteira Tab – Rich Table
// ═══════════════════════════════════════════════
function CarteiraTab({
  ativos,
  dividendos,
  isLoading,
  openDialog,
  setOpenDialog,
  onAdd,
  onDelete,
}: {
  ativos: any[];
  dividendos: any[];
  isLoading: boolean;
  openDialog: boolean;
  setOpenDialog: (v: boolean) => void;
  onAdd: (a: InvestimentoAtivoInsert) => void;
  onDelete: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<string>("todos");
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vektor_carteira_cols");
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch { return DEFAULT_COLUMNS; }
  });
  const [notas, setNotas] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("vektor_ativos_notas");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [form, setForm] = useState({
    nome: "",
    tipo: "acao",
    quantidade: "",
    preco_medio: "",
    preco_atual: "",
    data_compra: new Date().toISOString().split("T")[0],
    nota: "",
  });

  useEffect(() => {
    localStorage.setItem("vektor_carteira_cols", JSON.stringify(visibleCols));
  }, [visibleCols]);

  useEffect(() => {
    localStorage.setItem("vektor_ativos_notas", JSON.stringify(notas));
  }, [notas]);

  const toggleColumn = (key: string) => {
    setVisibleCols(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = () => {
    if (!form.nome || !form.quantidade || !form.preco_medio) return;
    onAdd({
      nome: form.nome,
      tipo: form.tipo,
      quantidade: parseFloat(form.quantidade),
      preco_medio: parseFloat(form.preco_medio),
      preco_atual: parseFloat(form.preco_atual) || parseFloat(form.preco_medio),
      data_compra: form.data_compra,
    });
    if (form.nota) {
      // Save nota after add - we'll match by nome since we don't have the id yet
      setNotas(prev => ({ ...prev, [`__pending_${form.nome}`]: form.nota }));
    }
    setForm({ nome: "", tipo: "acao", quantidade: "", preco_medio: "", preco_atual: "", data_compra: new Date().toISOString().split("T")[0], nota: "" });
    setOpenDialog(false);
  };

  // Assign pending notas to actual ativos
  useEffect(() => {
    if (!ativos.length) return;
    setNotas(prev => {
      const updated = { ...prev };
      let changed = false;
      ativos.forEach(a => {
        const pendingKey = `__pending_${a.nome}`;
        if (updated[pendingKey] && !updated[a.id]) {
          updated[a.id] = updated[pendingKey];
          delete updated[pendingKey];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [ativos]);

  const filteredAtivos = useMemo(() => {
    if (filtro === "todos") return ativos;
    return ativos.filter((a) => a.tipo === filtro);
  }, [ativos, filtro]);

  // DY 12m per ativo
  const dy12m = useMemo(() => {
    const now = new Date();
    const oneYearAgo = subMonths(now, 12);
    const result: Record<string, number> = {};
    ativos.forEach(a => {
      const invested = Number(a.quantidade) * Number(a.preco_medio);
      const divs = dividendos
        .filter(d => d.ativo_id === a.id && new Date(d.data_recebimento) >= oneYearAgo)
        .reduce((s, d) => s + Number(d.valor), 0);
      result[a.id] = invested > 0 ? (divs / invested) * 100 : 0;
    });
    return result;
  }, [ativos, dividendos]);

  const filterOptions = [
    { key: "todos", label: "Todos" },
    ...Object.entries(TIPO_ATIVO_LABELS).map(([k, v]) => ({ key: k, label: v })),
  ];

  const isCol = (key: string) => visibleCols.includes(key);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Meus Ativos</h2>
        <div className="flex items-center gap-2">
          {/* Column settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" /> Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <p className="text-sm font-medium mb-3">Editar colunas</p>
              <div className="space-y-2">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={visibleCols.includes(col.key)}
                      disabled={col.required}
                      onCheckedChange={() => !col.required && toggleColumn(col.key)}
                    />
                    <span className={col.required ? "text-muted-foreground" : "text-foreground"}>{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Ativo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Ativo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome / Ticker</Label>
                  <Input placeholder="Ex: PETR4, HGLG11, Bitcoin" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_ATIVO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço médio (R$)</Label>
                    <Input type="number" step="0.01" value={form.preco_medio} onChange={(e) => setForm({ ...form, preco_medio: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preço atual (R$)</Label>
                    <Input type="number" step="0.01" value={form.preco_atual} onChange={(e) => setForm({ ...form, preco_atual: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data da compra</Label>
                    <Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nota / Tag <span className="text-muted-foreground font-normal">— opcional</span></Label>
                  <Input placeholder="Ex: longo prazo, dividendos" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleSubmit}>Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterOptions.map((opt) => (
          <Button
            key={opt.key}
            variant={filtro === opt.key ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full text-xs h-8"
            onClick={() => setFiltro(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredAtivos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {ativos.length === 0
                ? "Nenhum ativo registrado. Comece adicionando seu primeiro investimento!"
                : "Nenhum ativo nesta categoria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isCol("nome") && <TableHead>Ativo</TableHead>}
                  {isCol("tipo") && <TableHead>Tipo</TableHead>}
                  {isCol("quantidade") && <TableHead className="text-right">Qtd</TableHead>}
                  {isCol("preco_medio") && <TableHead className="text-right">PM</TableHead>}
                  {isCol("preco_atual") && <TableHead className="text-right">Cotação</TableHead>}
                  {isCol("variacao") && <TableHead className="text-right">Var. %</TableHead>}
                  {isCol("dy12m") && <TableHead className="text-right">DY 12m</TableHead>}
                  {isCol("valor_investido") && <TableHead className="text-right">Investido</TableHead>}
                  {isCol("valor_atual") && <TableHead className="text-right">Valor Atual</TableHead>}
                  {isCol("resultado") && <TableHead className="text-right">Resultado</TableHead>}
                  {isCol("nota") && <TableHead>Nota</TableHead>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAtivos.map((a) => {
                  const total = Number(a.quantidade) * Number(a.preco_atual);
                  const invested = Number(a.quantidade) * Number(a.preco_medio);
                  const result = invested > 0 ? ((total - invested) / invested) * 100 : 0;
                  const isPositive = result >= 0;
                  const resultR$ = total - invested;

                  return (
                    <TableRow key={a.id}>
                      {isCol("nome") && (
                        <TableCell className="font-bold text-foreground">{a.nome}</TableCell>
                      )}
                      {isCol("tipo") && (
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${TIPO_ATIVO_COLORS[a.tipo]}`}>
                            {TIPO_ATIVO_LABELS[a.tipo] || a.tipo}
                          </Badge>
                        </TableCell>
                      )}
                      {isCol("quantidade") && (
                        <TableCell className="text-right font-medium">{Number(a.quantidade).toLocaleString("pt-BR")}</TableCell>
                      )}
                      {isCol("preco_medio") && (
                        <TableCell className="text-right">{fmt(Number(a.preco_medio))}</TableCell>
                      )}
                      {isCol("preco_atual") && (
                        <TableCell className="text-right font-semibold">{fmt(Number(a.preco_atual))}</TableCell>
                      )}
                      {isCol("variacao") && (
                        <TableCell className={`text-right font-semibold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          <span className="flex items-center justify-end gap-0.5">
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {fmtPct(result)}
                          </span>
                        </TableCell>
                      )}
                      {isCol("dy12m") && (
                        <TableCell className="text-right text-chart-2 font-medium">
                          {(dy12m[a.id] || 0).toFixed(2)}%
                        </TableCell>
                      )}
                      {isCol("valor_investido") && (
                        <TableCell className="text-right">{fmt(invested)}</TableCell>
                      )}
                      {isCol("valor_atual") && (
                        <TableCell className="text-right font-semibold">{fmt(total)}</TableCell>
                      )}
                      {isCol("resultado") && (
                        <TableCell className={`text-right font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {fmt(resultR$)}
                        </TableCell>
                      )}
                      {isCol("nota") && (
                        <TableCell>
                          <Input
                            className="h-7 text-xs w-28 bg-transparent border-dashed"
                            placeholder="—"
                            value={notas[a.id] || ""}
                            onChange={(e) => setNotas(prev => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Dividendos Tab
// ═══════════════════════════════════════════════
function DividendosTab({
  dividendos,
  ativos,
  isLoading,
  dividendosMes,
  dividendosAno,
  patrimonio,
  openDialog,
  setOpenDialog,
  onAdd,
  onDelete,
}: {
  dividendos: any[];
  ativos: any[];
  isLoading: boolean;
  dividendosMes: number;
  dividendosAno: number;
  patrimonio: number;
  openDialog: boolean;
  setOpenDialog: (v: boolean) => void;
  onAdd: (d: InvestimentoDividendoInsert) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({
    ativo_id: "",
    valor: "",
    data_recebimento: new Date().toISOString().split("T")[0],
    tipo: "dividendo",
  });
  const [mesFiltro, setMesFiltro] = useState<string>("todos");

  const handleSubmit = () => {
    if (!form.valor) return;
    onAdd({
      ativo_id: form.ativo_id || null,
      valor: parseFloat(form.valor),
      data_recebimento: form.data_recebimento,
      tipo: form.tipo,
    });
    setForm({ ativo_id: "", valor: "", data_recebimento: new Date().toISOString().split("T")[0], tipo: "dividendo" });
    setOpenDialog(false);
  };

  const ativoMap = useMemo(() => {
    const map: Record<string, any> = {};
    ativos.forEach((a) => (map[a.id] = a));
    return map;
  }, [ativos]);

  const yieldMedio = patrimonio > 0 ? (dividendosAno / patrimonio) * 100 : 0;

  // Monthly bar chart
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const total = dividendos
        .filter((dv) => {
          const dt = new Date(dv.data_recebimento);
          return dt >= start && dt <= end;
        })
        .reduce((s, dv) => s + Number(dv.valor), 0);
      months.push({
        label: format(d, "MMM", { locale: ptBR }),
        value: Math.round(total * 100) / 100,
      });
    }
    return months;
  }, [dividendos]);

  // Current month dividendos as table with yield sobre custo
  const dividendosDoMes = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return dividendos
      .filter((d) => {
        const dt = new Date(d.data_recebimento);
        return dt >= start && dt <= end;
      })
      .map(d => {
        const ativo = d.ativo_id ? ativoMap[d.ativo_id] : null;
        const invested = ativo ? Number(ativo.quantidade) * Number(ativo.preco_medio) : 0;
        const yieldCusto = invested > 0 ? (Number(d.valor) / invested) * 100 : 0;
        return { ...d, ativoNome: ativo?.nome || "Geral", yieldCusto };
      });
  }, [dividendos, ativoMap]);

  // Agenda: próximos proventos (based on historical patterns)
  const agenda = useMemo(() => {
    if (!dividendos.length || !ativos.length) return [];
    // Group dividends by ativo and month to detect patterns
    const patterns: { ativo_id: string; nome: string; meses: number[]; mediaValor: number }[] = [];
    const divByAtivo: Record<string, any[]> = {};
    dividendos.forEach(d => {
      if (d.ativo_id) {
        if (!divByAtivo[d.ativo_id]) divByAtivo[d.ativo_id] = [];
        divByAtivo[d.ativo_id].push(d);
      }
    });
    Object.entries(divByAtivo).forEach(([ativoId, divs]) => {
      const meses = [...new Set(divs.map(d => new Date(d.data_recebimento).getMonth()))];
      const media = divs.reduce((s, d) => s + Number(d.valor), 0) / divs.length;
      patterns.push({
        ativo_id: ativoId,
        nome: ativoMap[ativoId]?.nome || "—",
        meses,
        mediaValor: Math.round(media * 100) / 100,
      });
    });
    // Find patterns for next 3 months
    const now = new Date();
    const upcoming: { nome: string; mes: string; valorEstimado: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const futureMonth = (now.getMonth() + i) % 12;
      const futureDate = subMonths(now, -i);
      patterns.forEach(p => {
        if (p.meses.includes(futureMonth)) {
          upcoming.push({
            nome: p.nome,
            mes: format(futureDate, "MMM/yy", { locale: ptBR }),
            valorEstimado: p.mediaValor,
          });
        }
      });
    }
    return upcoming.slice(0, 8);
  }, [dividendos, ativos, ativoMap]);

  // Filter dividendos by month
  const filteredDividendos = useMemo(() => {
    if (mesFiltro === "todos") return dividendos;
    const mesNum = parseInt(mesFiltro);
    return dividendos.filter(d => new Date(d.data_recebimento).getMonth() === mesNum);
  }, [dividendos, mesFiltro]);

  const mesesOptions = useMemo(() => {
    const meses = [{ key: "todos", label: "Todos" }];
    for (let i = 0; i < 12; i++) {
      const d = new Date(2026, i, 1);
      meses.push({ key: String(i), label: format(d, "MMMM", { locale: ptBR }) });
    }
    return meses;
  }, []);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-chart-2/15 to-chart-2/5 border-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Recebidos no mês</p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1">{fmt(dividendosMes)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Acumulado no ano</p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1">{fmt(dividendosAno)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-chart-4/15 to-chart-4/5 border-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              Yield médio <Percent className="h-3 w-3" />
            </p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1">{yieldMedio.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Agenda de Dividendos */}
      {agenda.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-chart-4" /> Agenda de Dividendos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {agenda.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.nome}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.mes}</p>
                  </div>
                  <span className="text-chart-2 font-semibold text-xs">~{fmt(item.valorEstimado)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart */}
      {dividendos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dividendos por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    className="text-xs fill-muted-foreground"
                    width={40}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => [fmt(v), "Dividendos"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dividendos do Mês (table) */}
      {dividendosDoMes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dividendos do Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Yield/Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividendosDoMes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ativoNome}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(d.data_recebimento), "dd/MM")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {TIPO_DIVIDENDO_LABELS[d.tipo] || d.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-chart-2">{fmt(Number(d.valor))}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{d.yieldCusto.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* List header + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Histórico Completo</h2>
        <div className="flex items-center gap-2">
          <Select value={mesFiltro} onValueChange={setMesFiltro}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filtrar mês" />
            </SelectTrigger>
            <SelectContent>
              {mesesOptions.map(m => (
                <SelectItem key={m.key} value={m.key} className="capitalize">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Dividendo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Dividendo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ativo (opcional)</Label>
                  <Select value={form.ativo_id} onValueChange={(v) => setForm({ ...form, ativo_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um ativo" /></SelectTrigger>
                    <SelectContent>
                      {ativos.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={form.data_recebimento} onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_DIVIDENDO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSubmit}>Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredDividendos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dividendo registrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDividendos.map((d) => (
            <Card key={d.id} className="group">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-chart-2/10 shrink-0">
                    <DollarSign className="h-4 w-4 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {d.ativo_id ? ativoMap[d.ativo_id]?.nome || "—" : "Geral"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(d.data_recebimento), "dd/MM/yyyy")}</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {TIPO_DIVIDENDO_LABELS[d.tipo] || d.tipo}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-chart-2">{fmt(Number(d.valor))}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(d.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Metas Tab
// ═══════════════════════════════════════════════
function MetasTab({ patrimonio, dividendosMes }: { patrimonio: number; dividendosMes: number }) {
  const [metaPatrimonio, setMetaPatrimonio] = useState(() => {
    try { return localStorage.getItem("vektor_meta_patrimonio") || ""; } catch { return ""; }
  });
  const [metaRenda, setMetaRenda] = useState(() => {
    try { return localStorage.getItem("vektor_meta_renda") || ""; } catch { return ""; }
  });
  const { toast } = useToast();

  const salvarMetas = () => {
    localStorage.setItem("vektor_meta_patrimonio", metaPatrimonio);
    localStorage.setItem("vektor_meta_renda", metaRenda);
    toast({ title: "Metas salvas com sucesso!" });
  };

  const metaPatVal = parseFloat(metaPatrimonio) || 0;
  const metaRendaVal = parseFloat(metaRenda) || 0;
  const progressPat = metaPatVal > 0 ? Math.min(100, (patrimonio / metaPatVal) * 100) : 0;
  const progressRenda = metaRendaVal > 0 ? Math.min(100, (dividendosMes / metaRendaVal) * 100) : 0;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-chart-4/10">
          <Flag className="h-5 w-5 text-chart-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Metas de Investimento</h2>
          <p className="text-sm text-muted-foreground">Defina seus objetivos e acompanhe o progresso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Patrimônio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Meta de Patrimônio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Valor da meta (R$)</Label>
              <Input
                type="number"
                step="1000"
                placeholder="100000"
                value={metaPatrimonio}
                onChange={(e) => setMetaPatrimonio(e.target.value)}
              />
            </div>
            {metaPatVal > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-bold text-foreground">{progressPat.toFixed(1)}%</span>
                </div>
                <Progress value={progressPat} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Atual: {fmt(patrimonio)}</span>
                  <span>Meta: {fmt(metaPatVal)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metaPatVal > patrimonio
                    ? `Faltam ${fmt(metaPatVal - patrimonio)} para atingir sua meta.`
                    : "🎉 Parabéns! Você atingiu sua meta de patrimônio!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meta Renda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-chart-2" /> Meta de Renda Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Renda mensal desejada (R$)</Label>
              <Input
                type="number"
                step="100"
                placeholder="1000"
                value={metaRenda}
                onChange={(e) => setMetaRenda(e.target.value)}
              />
            </div>
            {metaRendaVal > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-bold text-foreground">{progressRenda.toFixed(1)}%</span>
                </div>
                <Progress value={progressRenda} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Atual: {fmt(dividendosMes)}/mês</span>
                  <span>Meta: {fmt(metaRendaVal)}/mês</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metaRendaVal > dividendosMes
                    ? `Faltam ${fmt(metaRendaVal - dividendosMes)}/mês para atingir sua meta.`
                    : "🎉 Parabéns! Você atingiu sua meta de renda mensal!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={salvarMetas} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" /> Salvar metas
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Simulador Tab – Enhanced
// ═══════════════════════════════════════════════
function SimuladorTab({ patrimonio }: { patrimonio: number }) {
  const [initialDisplay, setInitialDisplay] = useState("");
  const [monthlyDisplay, setMonthlyDisplay] = useState("");
  const [rate, setRate] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<"anos" | "meses">("anos");
  const [inflation, setInflation] = useState("");
  const [calculated, setCalculated] = useState(false);
  const [comparar, setComparar] = useState(false);
  const { toast } = useToast();

  // Pre-fill with patrimonio
  useEffect(() => {
    if (patrimonio > 0 && !initialDisplay) {
      setInitialDisplay(formatCurrencyInput(String(Math.round(patrimonio * 100))));
    }
  }, [patrimonio]);

  const handleCurrencyChange = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(formatCurrencyInput(e.target.value));
      setCalculated(false);
    },
    [],
  );

  const totalMonths = useMemo(() => {
    const v = parseFloat(timeValue) || 0;
    return timeUnit === "anos" ? v * 12 : v;
  }, [timeValue, timeUnit]);

  const result = useMemo(() => {
    if (!calculated) return null;
    const i = parseCurrencyInput(initialDisplay);
    const m = parseCurrencyInput(monthlyDisplay);
    const r = parseFloat(rate) || 0;
    const inf = parseFloat(inflation) || 0;
    if (totalMonths <= 0) return null;
    return calcCompoundInterest(i, m, r, totalMonths, inf);
  }, [calculated, initialDisplay, monthlyDisplay, rate, totalMonths, inflation]);

  // Nominal result (without inflation discount)
  const resultNominal = useMemo(() => {
    if (!calculated) return null;
    const i = parseCurrencyInput(initialDisplay);
    const m = parseCurrencyInput(monthlyDisplay);
    const r = parseFloat(rate) || 0;
    const inf = parseFloat(inflation) || 0;
    if (totalMonths <= 0 || inf <= 0) return null;
    return calcCompoundInterest(i, m, r, totalMonths, 0);
  }, [calculated, initialDisplay, monthlyDisplay, rate, totalMonths, inflation]);

  // Comparison of 3 scenarios
  const comparacaoData = useMemo(() => {
    if (!calculated || !comparar) return null;
    const i = parseCurrencyInput(initialDisplay);
    const m = parseCurrencyInput(monthlyDisplay);
    const inf = parseFloat(inflation) || 0;
    if (totalMonths <= 0) return null;
    const scenarios = PRESET_RATES.map(p => {
      const res = calcCompoundInterest(i, m, p.value, totalMonths, inf);
      return { rate: p.value, label: `${p.value}% a.a.`, ...res };
    });
    // Merge chart data
    const merged: any[] = [];
    const maxLen = Math.max(...scenarios.map(s => s.chartData.length));
    for (let j = 0; j < maxLen; j++) {
      const entry: any = { ano: scenarios[0].chartData[j]?.ano || j };
      scenarios.forEach(s => {
        entry[`r${s.rate}`] = s.chartData[j]?.acumulado || 0;
      });
      entry.investido = scenarios[0].chartData[j]?.investido || 0;
      merged.push(entry);
    }
    return { scenarios, chartData: merged };
  }, [calculated, comparar, initialDisplay, monthlyDisplay, totalMonths, inflation]);

  const insightText = useMemo(() => {
    if (!result) return "";
    const m = parseCurrencyInput(monthlyDisplay);
    const yrs = totalMonths / 12;
    const r = parseFloat(rate) || 0;
    return `Investindo ${fmt(m)} por mês durante ${yrs.toFixed(1).replace(".0", "")} ${yrs === 1 ? "ano" : "anos"} a ${r}% a.a., seu patrimônio pode chegar a ${fmt(result.finalValue)}, gerando uma renda passiva estimada de ${fmt(result.passiveIncome)}/mês.`;
  }, [result, monthlyDisplay, totalMonths, rate]);

  const salvarComoMeta = () => {
    if (result) {
      localStorage.setItem("vektor_meta_patrimonio", String(Math.round(result.finalValue)));
      toast({ title: "Meta de patrimônio atualizada!", description: `Meta definida para ${fmt(result.finalValue)}` });
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Simulação de investimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quanto você possui?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input className="pl-9" inputMode="numeric" placeholder="0,00" value={initialDisplay} onChange={handleCurrencyChange(setInitialDisplay)} />
              </div>
              {patrimonio > 0 && (
                <p className="text-[10px] text-muted-foreground">Pré-preenchido com seu patrimônio atual</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quanto pode poupar por mês?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input className="pl-9" inputMode="numeric" placeholder="0,00" value={monthlyDisplay} onChange={handleCurrencyChange(setMonthlyDisplay)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Taxa de rendimento anual (%)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="number" min="0" step="0.01" placeholder="10" className="w-24" value={rate} onChange={(e) => { setRate(e.target.value); setCalculated(false); }} />
              {PRESET_RATES.map((p) => (
                <Button key={p.value} variant={rate === String(p.value) ? "default" : "outline"} size="sm" onClick={() => { setRate(String(p.value)); setCalculated(false); }}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tempo de investimento</Label>
            <div className="flex gap-2">
              <Input type="number" min="1" step="1" placeholder="10" className="w-24" value={timeValue} onChange={(e) => { setTimeValue(e.target.value); setCalculated(false); }} />
              <Select value={timeUnit} onValueChange={(v) => { setTimeUnit(v as "anos" | "meses"); setCalculated(false); }}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anos">Anos</SelectItem>
                  <SelectItem value="meses">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Inflação anual (%) <span className="text-muted-foreground font-normal">— opcional</span></Label>
            <Input type="number" min="0" step="0.1" placeholder="4" className="w-24" value={inflation} onChange={(e) => { setInflation(e.target.value); setCalculated(false); }} />
            <p className="text-xs text-muted-foreground">Use 4% ao ano como média de inflação no Brasil</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={comparar} onCheckedChange={(v) => { setComparar(!!v); setCalculated(false); }} />
              Comparar cenários (6%, 10%, 14%)
            </label>
          </div>

          <Button className="w-full" size="lg" onClick={() => setCalculated(true)}>
            <Calculator className="h-4 w-4 mr-2" /> Simular investimento
          </Button>
        </CardContent>
      </Card>

      {result && (
        <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultado da simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nominal vs Real side by side */}
              <div className={`grid ${resultNominal ? "grid-cols-1 sm:grid-cols-2 gap-4" : ""}`}>
                <div className="flex flex-col items-center text-center py-2">
                  <p className="text-sm text-muted-foreground mb-1">
                    {resultNominal ? "Patrimônio Real (descontada inflação)" : "Patrimônio acumulado"}
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-chart-2">{fmt(result.finalValue)}</p>
                </div>
                {resultNominal && (
                  <div className="flex flex-col items-center text-center py-2">
                    <p className="text-sm text-muted-foreground mb-1">Patrimônio Nominal</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-primary">{fmt(resultNominal.finalValue)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total investido</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.totalInvested)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-chart-2/15 shrink-0">
                    <TrendingUp className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Juros acumulados</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.profit)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/15 shrink-0">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Renda passiva estimada</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.passiveIncome)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={salvarComoMeta}>
                <Save className="h-4 w-4 mr-1" /> Salvar como meta de patrimônio
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Chart */}
          {comparar && comparacaoData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comparação de Cenários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparacaoData.chartData}>
                      <defs>
                        <linearGradient id="gradR6" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradR10" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradR14" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="ano" tickFormatter={(v) => `${v}a`} className="text-xs fill-muted-foreground" />
                      <YAxis tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" width={55} />
                      <RechartsTooltip
                        formatter={(v: number, name: string) => {
                          const labels: Record<string, string> = { r6: "6% a.a.", r10: "10% a.a.", r14: "14% a.a.", investido: "Investido" };
                          return [fmt(v), labels[name] || name];
                        }}
                        labelFormatter={(l) => `Ano ${l}`}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Area type="monotone" dataKey="investido" name="investido" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="none" strokeWidth={1} />
                      <Area type="monotone" dataKey="r6" name="r6" stroke="hsl(var(--chart-3))" fill="url(#gradR6)" strokeWidth={2} />
                      <Area type="monotone" dataKey="r10" name="r10" stroke="hsl(var(--chart-2))" fill="url(#gradR10)" strokeWidth={2} />
                      <Area type="monotone" dataKey="r14" name="r14" stroke="hsl(var(--chart-4))" fill="url(#gradR14)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {comparacaoData.scenarios.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-bold text-foreground">{fmt(s.finalValue)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Normal evolution chart */}
          {!comparar && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução do seu investimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.chartData}>
                      <defs>
                        <linearGradient id="gradAccum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="ano" tickFormatter={(v) => `${v}a`} className="text-xs fill-muted-foreground" />
                      <YAxis tickFormatter={(v) => v >= 1_000_000 ? `R$${(v / 1_000_000).toFixed(1)}M` : `R$${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" width={65} />
                      <RechartsTooltip formatter={(v: number, name: string) => [fmt(v), name === "acumulado" ? "Acumulado" : "Investido"]} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="investido" name="investido" stroke="hsl(var(--primary))" fill="url(#gradInv)" strokeWidth={2} />
                      <Area type="monotone" dataKey="acumulado" name="acumulado" stroke="hsl(var(--chart-2))" fill="url(#gradAccum)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-5 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{insightText}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
