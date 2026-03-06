import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeftRight, TrendingUp, TrendingDown, CalendarClock } from "lucide-react";
import { motion } from "framer-motion";

export default function CashFlow() {
  const { user } = useAuth();

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

  // Past & future splits
  const receitasPassadas = receitas.filter((r) => r.data <= today);
  const receitasFuturas = receitas.filter((r) => r.data > today);
  const despesasPassadas = despesas.filter((d) => d.data <= today);
  const despesasFuturas = despesas.filter((d) => d.data > today);

  const saldoAtual = receitasPassadas.reduce((s, r) => s + r.valor, 0) - despesasPassadas.reduce((s, d) => s + d.valor, 0);
  const entradasFuturas = receitasFuturas.reduce((s, r) => s + r.valor, 0);
  const saidasFuturas = despesasFuturas.reduce((s, d) => s + d.valor, 0);
  const previsaoSaldo = saldoAtual + entradasFuturas - saidasFuturas;

  // Projection chart: next 30 days
  const projectionData = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    const endStr = endDate.toISOString().slice(0, 10);

    // Future movements within 30 days
    const futureMovements: { date: string; valor: number }[] = [];
    receitasFuturas
      .filter((r) => r.data <= endStr)
      .forEach((r) => futureMovements.push({ date: r.data, valor: r.valor }));
    despesasFuturas
      .filter((d) => d.data <= endStr)
      .forEach((d) => futureMovements.push({ date: d.data, valor: -d.valor }));
    futureMovements.sort((a, b) => a.date.localeCompare(b.date));

    // Build daily points
    const points: { date: string; label: string; saldo: number }[] = [];
    let running = saldoAtual;

    for (let i = 0; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayMovements = futureMovements.filter((m) => m.date === dateStr);
      dayMovements.forEach((m) => (running += m.valor));
      points.push({
        date: dateStr,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        saldo: running,
      });
    }
    return points;
  }, [saldoAtual, receitasFuturas, despesasFuturas]);

  // Combined timeline table (all transactions sorted by date)
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

  const stats = [
    { label: "Saldo Atual", value: saldoAtual, icon: ArrowLeftRight, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Previsão de Saldo", value: previsaoSaldo, icon: CalendarClock, color: "text-chart-3", bgColor: "bg-chart-3/10" },
    { label: "Entradas Futuras", value: entradasFuturas, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Saídas Futuras", value: saidasFuturas, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground text-sm">Acompanhe a movimentação financeira e projeções</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg ${s.bgColor} flex items-center justify-center`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold font-heading">{formatCurrency(s.value)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Projection Chart */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Projeção de Saldo — Próximos 30 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" interval={4} />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(_, payload) => {
                      if (payload?.[0]?.payload?.date) return formatDate(payload[0].payload.date);
                      return "";
                    }}
                  />
                  <defs>
                    <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(200, 70%, 50%)" fill="url(#saldoGrad)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Movimentações</CardTitle></CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="text-sm">{formatDate(item.data)}</TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === "receita" ? "default" : "secondary"}>
                          {item.tipo === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${item.tipo === "receita" ? "text-primary" : "text-destructive"}`}>
                        {item.tipo === "receita" ? "+" : "−"}{formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.saldoAcumulado >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatCurrency(item.saldoAcumulado)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
