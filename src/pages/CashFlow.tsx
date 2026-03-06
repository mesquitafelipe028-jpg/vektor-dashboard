import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArrowLeftRight, TrendingUp, TrendingDown, CalendarClock, ChevronDown, Repeat, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface RecurringPattern {
  descricao: string;
  tipo: "receita" | "despesa";
  valorMedio: number;
  ocorrencias: number;
  ultimaData: string;
}

/** Detect recurring transactions by grouping by description and checking if they appear 2+ months */
function detectRecurring(
  receitas: { descricao: string; valor: number; data: string }[],
  despesas: { descricao: string; valor: number; data: string; categoria?: string | null }[]
): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  const grouped = new Map<string, { tipo: "receita" | "despesa"; valores: number[]; datas: string[] }>();

  receitas.forEach((r) => {
    const key = `receita::${r.descricao.toLowerCase().trim()}`;
    const entry = grouped.get(key) || { tipo: "receita" as const, valores: [], datas: [] };
    entry.valores.push(r.valor);
    entry.datas.push(r.data);
    grouped.set(key, entry);
  });

  despesas.forEach((d) => {
    const key = `despesa::${d.descricao.toLowerCase().trim()}`;
    const entry = grouped.get(key) || { tipo: "despesa" as const, valores: [], datas: [] };
    entry.valores.push(d.valor);
    entry.datas.push(d.data);
    grouped.set(key, entry);
  });

  grouped.forEach((entry, key) => {
    // Need at least 2 occurrences in different months
    const months = new Set(entry.datas.map((d) => d.slice(0, 7)));
    if (months.size >= 2) {
      const avg = entry.valores.reduce((s, v) => s + v, 0) / entry.valores.length;
      // Check values are similar (within 30% of average)
      const consistent = entry.valores.every((v) => Math.abs(v - avg) / avg < 0.3);
      if (consistent) {
        const sortedDates = [...entry.datas].sort();
        patterns.push({
          descricao: key.split("::")[1],
          tipo: entry.tipo,
          valorMedio: Math.round(avg * 100) / 100,
          ocorrencias: months.size,
          ultimaData: sortedDates[sortedDates.length - 1],
        });
      }
    }
  });

  return patterns;
}

/** Generate projected recurring entries for next 30 days */
function projectRecurring(patterns: RecurringPattern[], today: string, endDate: string) {
  const projected: { date: string; descricao: string; tipo: "receita" | "despesa"; valor: number; isProjected: true }[] = [];
  const todayDate = new Date(today);
  const end = new Date(endDate);

  patterns.forEach((p) => {
    const lastDate = new Date(p.ultimaData);
    const dayOfMonth = lastDate.getDate();

    // Project into future months
    let nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, dayOfMonth);
    // If already past for this month, try current month
    const currentMonthProjection = new Date(todayDate.getFullYear(), todayDate.getMonth(), dayOfMonth);
    if (currentMonthProjection > todayDate && currentMonthProjection <= end) {
      // Check if this month already has a real entry (same month as last entry)
      const lastMonth = p.ultimaData.slice(0, 7);
      const currentMonth = currentMonthProjection.toISOString().slice(0, 7);
      if (lastMonth !== currentMonth) {
        projected.push({
          date: currentMonthProjection.toISOString().slice(0, 10),
          descricao: p.descricao,
          tipo: p.tipo,
          valor: p.valorMedio,
          isProjected: true,
        });
      }
    }

    while (nextMonth <= end) {
      if (nextMonth > todayDate) {
        projected.push({
          date: nextMonth.toISOString().slice(0, 10),
          descricao: p.descricao,
          tipo: p.tipo,
          valor: p.valorMedio,
          isProjected: true,
        });
      }
      nextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, dayOfMonth);
    }
  });

  return projected;
}

export default function CashFlow() {
  const { user } = useAuth();
  const [tabFilter, setTabFilter] = useState<"all" | "receita" | "despesa">("all");
  const [showAll, setShowAll] = useState(false);

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().slice(0, 10);
  const endDate30 = new Date();
  endDate30.setDate(endDate30.getDate() + 30);
  const endStr = endDate30.toISOString().slice(0, 10);

  const receitasPassadas = receitas.filter((r) => r.data <= today);
  const receitasFuturas = receitas.filter((r) => r.data > today);
  const despesasPassadas = despesas.filter((d) => d.data <= today);
  const despesasFuturas = despesas.filter((d) => d.data > today);

  const saldoAtual = receitasPassadas.reduce((s, r) => s + r.valor, 0) - despesasPassadas.reduce((s, d) => s + d.valor, 0);
  const entradasFuturas = receitasFuturas.reduce((s, r) => s + r.valor, 0);
  const saidasFuturas = despesasFuturas.reduce((s, d) => s + d.valor, 0);

  // Recurring patterns detection
  const recurringPatterns = useMemo(() => detectRecurring(receitas, despesas), [receitas, despesas]);
  const projectedRecurring = useMemo(
    () => projectRecurring(recurringPatterns, today, endStr),
    [recurringPatterns, today, endStr]
  );

  const entradasRecorrentes = projectedRecurring.filter((p) => p.tipo === "receita").reduce((s, p) => s + p.valor, 0);
  const saidasRecorrentes = projectedRecurring.filter((p) => p.tipo === "despesa").reduce((s, p) => s + p.valor, 0);

  const previsaoSaldo = saldoAtual + entradasFuturas + entradasRecorrentes - saidasFuturas - saidasRecorrentes;
  const haDeficit = previsaoSaldo < 0;

  // Projection chart including recurring
  const projectionData = useMemo(() => {
    const now = new Date();
    const futureMovements: { date: string; valor: number; projected?: boolean }[] = [];
    receitasFuturas.filter((r) => r.data <= endStr).forEach((r) => futureMovements.push({ date: r.data, valor: r.valor }));
    despesasFuturas.filter((d) => d.data <= endStr).forEach((d) => futureMovements.push({ date: d.data, valor: -d.valor }));
    projectedRecurring.forEach((p) => futureMovements.push({ date: p.date, valor: p.tipo === "receita" ? p.valor : -p.valor, projected: true }));
    futureMovements.sort((a, b) => a.date.localeCompare(b.date));

    const points: { date: string; label: string; saldo: number; saldoSemRecorrencia: number }[] = [];
    let running = saldoAtual;
    let runningNoRecurring = saldoAtual;

    for (let i = 0; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      futureMovements.filter((m) => m.date === dateStr).forEach((m) => {
        running += m.valor;
        if (!m.projected) runningNoRecurring += m.valor;
      });
      points.push({
        date: dateStr,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        saldo: running,
        saldoSemRecorrencia: runningNoRecurring,
      });
    }
    return points;
  }, [saldoAtual, receitasFuturas, despesasFuturas, projectedRecurring, endStr]);

  // Next movements including projected recurring
  const nextMovements = useMemo(() => {
    const all: { data: string; descricao: string; tipo: "receita" | "despesa"; valor: number; isProjected?: boolean }[] = [];
    receitasFuturas.forEach((r) => all.push({ data: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor }));
    despesasFuturas.forEach((d) => all.push({ data: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor }));
    projectedRecurring.forEach((p) => all.push({ data: p.date, descricao: p.descricao, tipo: p.tipo, valor: p.valor, isProjected: true }));
    all.sort((a, b) => a.data.localeCompare(b.data));
    return all.slice(0, 8);
  }, [receitasFuturas, despesasFuturas, projectedRecurring]);

  // Timeline
  const timeline = useMemo(() => {
    const all: { id: string; data: string; descricao: string; tipo: "receita" | "despesa"; valor: number; isProjected?: boolean }[] = [];
    receitas.forEach((r) => all.push({ id: r.id, data: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor }));
    despesas.forEach((d) => all.push({ id: d.id, data: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor }));
    projectedRecurring.forEach((p, i) => all.push({ id: `proj-${i}`, data: p.date, descricao: p.descricao, tipo: p.tipo, valor: p.valor, isProjected: true }));
    all.sort((a, b) => a.data.localeCompare(b.data));

    let acumulado = 0;
    return all.map((item) => {
      acumulado += item.tipo === "receita" ? item.valor : -item.valor;
      return { ...item, saldoAcumulado: acumulado };
    });
  }, [receitas, despesas, projectedRecurring]);

  const filteredTimeline = useMemo(() => {
    if (tabFilter === "all") return timeline;
    return timeline.filter((t) => t.tipo === tabFilter);
  }, [timeline, tabFilter]);

  const displayedTimeline = showAll ? filteredTimeline : filteredTimeline.slice(0, 20);
  const hasMore = filteredTimeline.length > 20;

  const todaySeparatorIndex = useMemo(() => {
    for (let i = 0; i < displayedTimeline.length; i++) {
      if (displayedTimeline[i].data > today) return i;
    }
    return -1;
  }, [displayedTimeline, today]);

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);
  const periodLabel = `${periodStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${periodEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground text-sm">Movimentação financeira, projeções e recorrências · {periodLabel}</p>
      </div>

      {/* Deficit/Surplus Alert */}
      {(haDeficit || previsaoSaldo < saldoAtual * 0.2) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border-l-4 ${haDeficit ? "border-l-destructive bg-destructive/5" : "border-l-yellow-500 bg-yellow-500/5"}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${haDeficit ? "text-destructive" : "text-yellow-600"}`} />
              <div>
                <p className="text-sm font-semibold">
                  {haDeficit ? "Alerta: Déficit projetado nos próximos 30 dias" : "Atenção: Saldo projetado baixo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {haDeficit
                    ? `Seu saldo pode ficar negativo em ${formatCurrency(Math.abs(previsaoSaldo))}. Considere reduzir despesas ou antecipar receitas.`
                    : `Seu saldo projetado de ${formatCurrency(previsaoSaldo)} está significativamente abaixo do saldo atual. Fique atento às saídas.`}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="h-full border-2 border-accent/30">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ArrowLeftRight className="h-5 w-5 text-accent" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
              </div>
              <p className={`text-2xl sm:text-4xl font-bold font-heading ${saldoAtual >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(saldoAtual)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {saldoAtual >= 0 ? "↑ Saldo positivo" : "↓ Saldo negativo"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {[
          { label: "Previsão de Saldo", value: previsaoSaldo, icon: CalendarClock, color: "text-chart-3", bgColor: "bg-chart-3/10" },
          { label: "Entradas Previstas", value: entradasFuturas + entradasRecorrentes, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Saídas Previstas", value: saidasFuturas + saidasRecorrentes, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.08 }}>
            <Card className="h-full">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${s.bgColor} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold font-heading truncate">{formatCurrency(s.value)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recurring Patterns Summary */}
      {recurringPatterns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Repeat className="h-4 w-4 text-chart-3" />
                Transações Recorrentes Detectadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Baseado no histórico, identificamos {recurringPatterns.length} transações que se repetem mensalmente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recurringPatterns.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      p.tipo === "receita" ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize truncate">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">{p.ocorrencias} meses · {p.tipo}</p>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ml-2 ${p.tipo === "receita" ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(p.valorMedio)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Chart + Next Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">Projeção de Saldo — Próximos 30 dias</CardTitle>
              <p className="text-xs text-muted-foreground">Linha sólida: com recorrências · Linha tracejada: sem recorrências</p>
            </CardHeader>
            <CardContent>
              <div className="h-52 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs" interval={4} />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-md">
                            <p className="text-xs text-muted-foreground mb-1">{formatDate(p.date)}</p>
                            <p className="text-sm font-bold">Com recorrência: {formatCurrency(p.saldo)}</p>
                            <p className="text-xs text-muted-foreground">Sem recorrência: {formatCurrency(p.saldoSemRecorrencia)}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="saldoSemRecorrencia" name="Sem recorrência" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    <Area type="monotone" dataKey="saldo" name="Com recorrência" stroke="hsl(var(--primary))" fill="url(#saldoGrad)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">Próximas Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {nextMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma movimentação futura.</p>
              ) : (
                <div className="space-y-3">
                  {nextMovements.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate capitalize">{m.descricao}</p>
                          {m.isProjected && (
                            <span title="Projeção recorrente"><Repeat className="h-3 w-3 text-chart-3 shrink-0" /></span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(m.data)}</p>
                      </div>
                      <span className={`text-sm font-semibold whitespace-nowrap ${m.tipo === "receita" ? "text-primary" : "text-destructive"}`}>
                        {m.tipo === "receita" ? "+" : "−"}{formatCurrency(m.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Timeline Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="font-heading text-base">Movimentações</CardTitle>
              <Tabs value={tabFilter} onValueChange={(v) => { setTabFilter(v as typeof tabFilter); setShowAll(false); }}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-3 h-6">Todas</TabsTrigger>
                  <TabsTrigger value="receita" className="text-xs px-3 h-6">Receitas</TabsTrigger>
                  <TabsTrigger value="despesa" className="text-xs px-3 h-6">Despesas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTimeline.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {tabFilter === "all" && <TableHead className="text-right">Saldo Acumulado</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTimeline.map((item, i) => (
                      <>
                        {todaySeparatorIndex === i && (
                          <TableRow key="today-sep" className="hover:bg-transparent">
                            <TableCell colSpan={tabFilter === "all" ? 5 : 4} className="py-1 px-0">
                              <div className="flex items-center gap-2">
                                <Separator className="flex-1" />
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded">Hoje</span>
                                <Separator className="flex-1" />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.015 }}
                          className={`border-b transition-colors hover:bg-muted/50 ${item.data > today ? "opacity-70" : ""} ${item.isProjected ? "bg-chart-3/5" : ""}`}
                        >
                          <TableCell className="text-sm">{formatDate(item.data)}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize">{item.descricao}</span>
                              {item.isProjected && <span title="Projeção recorrente"><Repeat className="h-3 w-3 text-chart-3 shrink-0" /></span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={item.tipo === "receita" ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20" : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"} variant="outline">
                              {item.tipo === "receita" ? "Receita" : "Despesa"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${item.tipo === "receita" ? "text-primary" : "text-destructive"}`}>
                            {item.tipo === "receita" ? "+" : "−"}{formatCurrency(item.valor)}
                          </TableCell>
                          {tabFilter === "all" && (
                            <TableCell className={`text-right font-bold ${item.saldoAcumulado >= 0 ? "text-primary" : "text-destructive"}`}>
                              {formatCurrency(item.saldoAcumulado)}
                            </TableCell>
                          )}
                        </motion.tr>
                      </>
                    ))}
                  </TableBody>
                </Table>
                {hasMore && !showAll && (
                  <div className="flex justify-center pt-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="gap-1">
                      <ChevronDown className="h-4 w-4" />
                      Ver mais ({filteredTimeline.length - 20} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
