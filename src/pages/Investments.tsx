import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
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
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useInvestments, type InvestimentoAtivoInsert, type InvestimentoDividendoInsert } from "@/hooks/useInvestments";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIPO_ATIVO_LABELS: Record<string, string> = {
  acao: "Ação",
  fii: "FII",
  etf: "ETF",
  cripto: "Cripto",
  renda_fixa: "Renda Fixa",
  fundo: "Fundo",
};

const TIPO_ATIVO_COLORS: Record<string, string> = {
  acao: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  fii: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  etf: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  cripto: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  renda_fixa: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  fundo: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const TIPO_DIVIDENDO_LABELS: Record<string, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
};

// ─── Simulator helpers (from InvestmentCalculator) ───
const PRESET_RATES = [
  { label: "6%", value: 6 },
  { label: "10%", value: 10 },
  { label: "14%", value: 14 },
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

  // ─── Computed values ───
  const patrimonio = useMemo(() => {
    if (!ativos.data) return 0;
    return ativos.data.reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_atual), 0);
  }, [ativos.data]);

  const totalInvestido = useMemo(() => {
    if (!ativos.data) return 0;
    return ativos.data.reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_medio), 0);
  }, [ativos.data]);

  const lucroPrejuizo = patrimonio - totalInvestido;

  const now = new Date();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LineChart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="carteira">Carteira</TabsTrigger>
          <TabsTrigger value="dividendos">Dividendos</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            patrimonio={patrimonio}
            lucroPrejuizo={lucroPrejuizo}
            dividendosMes={dividendosMes}
            dividendosAno={dividendosAno}
            ativos={ativos.data ?? []}
          />
        </TabsContent>

        <TabsContent value="carteira">
          <CarteiraTab
            ativos={ativos.data ?? []}
            isLoading={ativos.isLoading}
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

        <TabsContent value="simulador">
          <SimuladorTab />
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
  lucroPrejuizo,
  dividendosMes,
  dividendosAno,
  ativos,
}: {
  patrimonio: number;
  lucroPrejuizo: number;
  dividendosMes: number;
  dividendosAno: number;
  ativos: any[];
}) {
  const cards = [
    { label: "Patrimônio Investido", value: fmt(patrimonio), icon: Wallet, color: "text-primary" },
    {
      label: "Lucro / Prejuízo",
      value: fmt(lucroPrejuizo),
      icon: lucroPrejuizo >= 0 ? TrendingUp : TrendingDown,
      color: lucroPrejuizo >= 0 ? "text-emerald-500" : "text-destructive",
    },
    { label: "Dividendos no mês", value: fmt(dividendosMes), icon: DollarSign, color: "text-chart-2" },
    { label: "Dividendos no ano", value: fmt(dividendosAno), icon: Calendar, color: "text-chart-4" },
  ];

  // Build simple chart from ativos sorted by date
  const chartData = useMemo(() => {
    if (!ativos.length) return [];
    const sorted = [...ativos].sort(
      (a, b) => new Date(a.data_compra).getTime() - new Date(b.data_compra).getTime(),
    );
    let cumulative = 0;
    return sorted.map((a) => {
      cumulative += Number(a.quantidade) * Number(a.preco_atual);
      return {
        data: format(new Date(a.data_compra), "MMM/yy", { locale: ptBR }),
        patrimonio: Math.round(cumulative * 100) / 100,
      };
    });
  }, [ativos]);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted shrink-0">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Patrimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="data" className="text-xs fill-muted-foreground" />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `R$${(v / 1_000_000).toFixed(1)}M`
                        : `R$${(v / 1000).toFixed(0)}k`
                    }
                    className="text-xs fill-muted-foreground"
                    width={65}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Patrimônio"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="patrimonio"
                    stroke="hsl(var(--primary))"
                    fill="url(#gradPatrimonio)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {ativos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Adicione ativos na aba Carteira para ver seu dashboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Carteira Tab
// ═══════════════════════════════════════════════
function CarteiraTab({
  ativos,
  isLoading,
  onAdd,
  onDelete,
}: {
  ativos: any[];
  isLoading: boolean;
  onAdd: (a: InvestimentoAtivoInsert) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "acao",
    quantidade: "",
    preco_medio: "",
    preco_atual: "",
    data_compra: new Date().toISOString().split("T")[0],
  });

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
    setForm({ nome: "", tipo: "acao", quantidade: "", preco_medio: "", preco_atual: "", data_compra: new Date().toISOString().split("T")[0] });
    setOpen(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Meus Ativos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
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
                <Label>Nome do ativo</Label>
                <Input
                  placeholder="Ex: PETR4, HGLG11, Bitcoin"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
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
              <Button className="w-full" onClick={handleSubmit}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : ativos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum ativo registrado. Comece adicionando seu primeiro investimento!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">PM</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ativos.map((a) => {
                  const total = Number(a.quantidade) * Number(a.preco_atual);
                  const invested = Number(a.quantidade) * Number(a.preco_medio);
                  const result = invested > 0 ? ((total - invested) / invested) * 100 : 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TIPO_ATIVO_COLORS[a.tipo]}>
                          {TIPO_ATIVO_LABELS[a.tipo] || a.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(a.quantidade).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.preco_medio))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.preco_atual))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(total)}</TableCell>
                      <TableCell className={`text-right font-medium ${result >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        {result >= 0 ? "+" : ""}{result.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
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
  onAdd,
  onDelete,
}: {
  dividendos: any[];
  ativos: any[];
  isLoading: boolean;
  dividendosMes: number;
  dividendosAno: number;
  onAdd: (d: InvestimentoDividendoInsert) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ativo_id: "",
    valor: "",
    data_recebimento: new Date().toISOString().split("T")[0],
    tipo: "dividendo",
  });

  const handleSubmit = () => {
    if (!form.valor) return;
    onAdd({
      ativo_id: form.ativo_id || null,
      valor: parseFloat(form.valor),
      data_recebimento: form.data_recebimento,
      tipo: form.tipo,
    });
    setForm({ ativo_id: "", valor: "", data_recebimento: new Date().toISOString().split("T")[0], tipo: "dividendo" });
    setOpen(false);
  };

  const ativoMap = useMemo(() => {
    const map: Record<string, string> = {};
    ativos.forEach((a) => (map[a.id] = a.nome));
    return map;
  }, [ativos]);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recebidos no mês</p>
            <p className="text-xl font-bold text-chart-2">{fmt(dividendosMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Acumulados no ano</p>
            <p className="text-xl font-bold text-primary">{fmt(dividendosAno)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
        <Dialog open={open} onOpenChange={setOpen}>
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : dividendos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dividendo registrado.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividendos.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{format(new Date(d.data_recebimento), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{d.ativo_id ? ativoMap[d.ativo_id] || "—" : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_DIVIDENDO_LABELS[d.tipo] || d.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-chart-2">{fmt(Number(d.valor))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Simulador Tab (migrated from InvestmentCalculator)
// ═══════════════════════════════════════════════
function SimuladorTab() {
  const [initialDisplay, setInitialDisplay] = useState("");
  const [monthlyDisplay, setMonthlyDisplay] = useState("");
  const [rate, setRate] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<"anos" | "meses">("anos");
  const [inflation, setInflation] = useState("");
  const [calculated, setCalculated] = useState(false);

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

  const insightText = useMemo(() => {
    if (!result) return "";
    const m = parseCurrencyInput(monthlyDisplay);
    const yrs = totalMonths / 12;
    const r = parseFloat(rate) || 0;
    return `Investindo ${fmt(m)} por mês durante ${yrs.toFixed(1).replace(".0", "")} ${yrs === 1 ? "ano" : "anos"} a ${r}% a.a., seu patrimônio pode chegar a ${fmt(result.finalValue)}, gerando uma renda passiva estimada de ${fmt(result.passiveIncome)}/mês.`;
  }, [result, monthlyDisplay, totalMonths, rate]);

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Simulação de investimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quanto você possui?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input className="pl-9" inputMode="numeric" placeholder="0,00" value={initialDisplay} onChange={handleCurrencyChange(setInitialDisplay)} />
              </div>
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
            <p className="text-xs text-muted-foreground">Use 4% ao ano como média de inflação no Brasil (opcional)</p>
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
              <div className="flex flex-col items-center text-center py-2">
                <p className="text-sm text-muted-foreground mb-1">Patrimônio acumulado</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-chart-2">{fmt(result.finalValue)}</p>
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
            </CardContent>
          </Card>

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
                    <Tooltip formatter={(v: number, name: string) => [fmt(v), name === "acumulado" ? "Acumulado" : "Investido"]} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="investido" name="investido" stroke="hsl(var(--primary))" fill="url(#gradInv)" strokeWidth={2} />
                    <Area type="monotone" dataKey="acumulado" name="acumulado" stroke="hsl(var(--chart-2))" fill="url(#gradAccum)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
