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
import { formatCurrency, formatDate } from "@/lib/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeftRight, TrendingUp, TrendingDown, CalendarClock, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

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

  const receitasPassadas = receitas.filter((r) => r.data <= today);
  const receitasFuturas = receitas.filter((r) => r.data > today);
  const despesasPassadas = despesas.filter((d) => d.data <= today);
  const despesasFuturas = despesas.filter((d) => d.data > today);

  const saldoAtual = receitasPassadas.reduce((s, r) => s + r.valor, 0) - despesasPassadas.reduce((s, d) => s + d.valor, 0);
  const entradasFuturas = receitasFuturas.reduce((s, r) => s + r.valor, 0);
  const saidasFuturas = despesasFuturas.reduce((s, d) => s + d.valor, 0);
  const previsaoSaldo = saldoAtual + entradasFuturas - saidasFuturas;

  // Projection chart
  const projectionData = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    const endStr = endDate.toISOString().slice(0, 10);

    const futureMovements: { date: string; valor: number }[] = [];
    receitasFuturas.filter((r) => r.data <= endStr).forEach((r) => futureMovements.push({ date: r.data, valor: r.valor }));
    despesasFuturas.filter((d) => d.data <= endStr).forEach((d) => futureMovements.push({ date: d.data, valor: -d.valor }));
    futureMovements.sort((a, b) => a.date.localeCompare(b.date));

    const points: { date: string; label: string; saldo: number }[] = [];
    let running = saldoAtual;
    for (let i = 0; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      futureMovements.filter((m) => m.date === dateStr).forEach((m) => (running += m.valor));
      points.push({ date: dateStr, label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), saldo: running });
    }
    return points;
  }, [saldoAtual, receitasFuturas, despesasFuturas]);

  // Next 5 future movements
  const nextMovements = useMemo(() => {
    const all: { data: string; descricao: string; tipo: "receita" | "despesa"; valor: number }[] = [];
    receitasFuturas.forEach((r) => all.push({ data: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor }));
    despesasFuturas.forEach((d) => all.push({ data: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor }));
    all.sort((a, b) => a.data.localeCompare(b.data));
    return all.slice(0, 5);
  }, [receitasFuturas, despesasFuturas]);

  // Timeline with today separator
  const timeline = useMemo(() => {
    const all: { id: string; data: string; descricao: string; tipo: "receita" | "despesa"; valor: number }[] = [];
    receitas.forEach((r) => all.push({ id: r.id, data: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor }));
    despesas.forEach((d) => all.push({ id: d.id, data: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor }));
    all.sort((a, b) => a.data.localeCompare(b.data));

    let acumulado = 0;
    return all.map((item) => {
      acumulado += item.tipo === "receita" ? item.valor : -item.valor;
      return { ...item, saldoAcumulado: acumulado };
    });
  }, [receitas, despesas]);

  const filteredTimeline = useMemo(() => {
    if (tabFilter === "all") return timeline;
    return timeline.filter((t) => t.tipo === tabFilter);
  }, [timeline, tabFilter]);

  const displayedTimeline = showAll ? filteredTimeline : filteredTimeline.slice(0, 20);
  const hasMore = filteredTimeline.length > 20;

  // Find index where "today" separator should go
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
        <p className="text-muted-foreground text-sm">Movimentação financeira e projeções · {periodLabel}</p>
      </div>

      {/* Summary Cards — Saldo Atual destacado */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="h-full border-2 border-accent/30">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ArrowLeftRight className="h-5 w-5 text-accent" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
              </div>
              <p className={`text-4xl font-bold font-heading ${saldoAtual >= 0 ? "text-primary" : "text-destructive"}`}>
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
          { label: "Entradas Futuras", value: entradasFuturas, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Saídas Futuras", value: saidasFuturas, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10" },
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

      {/* Chart + Next Movements — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">Projeção de Saldo — Próximos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
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
                            <p className="text-sm font-bold">{formatCurrency(p.saldo)}</p>
                          </div>
                        );
                      }}
                    />
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(var(--primary))" fill="url(#saldoGrad)" strokeWidth={2.5} dot={false} />
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
                        <p className="text-sm font-medium truncate">{m.descricao}</p>
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
                          className={`border-b transition-colors hover:bg-muted/50 ${item.data > today ? "opacity-70" : ""}`}
                        >
                          <TableCell className="text-sm">{formatDate(item.data)}</TableCell>
                          <TableCell className="font-medium">{item.descricao}</TableCell>
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
