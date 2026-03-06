import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/mockData";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Lightbulb, BarChart3, DollarSign, Percent, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FinancialAnalysis() {
  const { user } = useAuth();

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const analysis = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const recentReceitas = receitas.filter((r) => new Date(r.data) >= threeMonthsAgo);
    const recentDespesas = despesas.filter((d) => new Date(d.data) >= threeMonthsAgo);

    const totalReceitas = recentReceitas.reduce((s, r) => s + r.valor, 0);
    const totalDespesas = recentDespesas.reduce((s, d) => s + d.valor, 0);
    const totalLucro = totalReceitas - totalDespesas;

    const months = new Set<string>();
    recentReceitas.forEach((r) => months.add(r.data.slice(0, 7)));
    recentDespesas.forEach((d) => months.add(d.data.slice(0, 7)));
    const numMonths = Math.max(months.size, 1);

    const avgReceitas = totalReceitas / numMonths;
    const avgDespesas = totalDespesas / numMonths;
    const avgLucro = totalLucro / numMonths;
    const despesaPercent = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
    const margemLucro = totalReceitas > 0 ? (totalLucro / totalReceitas) * 100 : 0;

    // Category breakdown
    const catMap: Record<string, number> = {};
    recentDespesas.forEach((d) => {
      const cat = d.categoria || "Outros";
      catMap[cat] = (catMap[cat] || 0) + d.valor;
    });
    const sortedCats = Object.entries(catMap).sort(([, a], [, b]) => b - a);
    const topCategory = sortedCats[0] ?? ["N/A", 0];

    // Monthly chart data
    const monthlyMap: Record<string, { receitas: number; despesas: number }> = {};
    recentReceitas.forEach((r) => {
      const key = r.data.slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { receitas: 0, despesas: 0 };
      monthlyMap[key].receitas += r.valor;
    });
    recentDespesas.forEach((d) => {
      const key = d.data.slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { receitas: 0, despesas: 0 };
      monthlyMap[key].despesas += d.valor;
    });
    const chartData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => {
        const [y, m] = month.split("-");
        const d = new Date(parseInt(y), parseInt(m) - 1);
        return {
          name: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          Receitas: vals.receitas,
          Despesas: vals.despesas,
          Lucro: vals.receitas - vals.despesas,
        };
      });

    // Recommendations
    const recommendations: { text: string; type: "warning" | "success" | "info" }[] = [];

    if (despesaPercent > 70) {
      recommendations.push({
        text: `Suas despesas representam ${despesaPercent.toFixed(0)}% do faturamento. Tente reduzir para abaixo de 60% para uma margem saudável.`,
        type: "warning",
      });
    } else {
      recommendations.push({
        text: `Boa proporção! Despesas em ${despesaPercent.toFixed(0)}% do faturamento. Continue mantendo os custos controlados.`,
        type: "success",
      });
    }

    if (topCategory[1] > totalDespesas * 0.4) {
      recommendations.push({
        text: `A categoria "${topCategory[0]}" concentra ${((topCategory[1] as number / totalDespesas) * 100).toFixed(0)}% das suas despesas. Considere renegociar ou buscar alternativas mais econômicas.`,
        type: "warning",
      });
    }

    if (margemLucro < 20) {
      recommendations.push({
        text: `Margem de lucro em ${margemLucro.toFixed(1)}%. Considere aumentar preços ou reduzir custos operacionais para atingir pelo menos 20%.`,
        type: "warning",
      });
    } else {
      recommendations.push({
        text: `Margem de lucro saudável em ${margemLucro.toFixed(1)}%. Continue otimizando para crescer com segurança.`,
        type: "success",
      });
    }

    if (numMonths >= 2) {
      const monthKeys = Object.keys(monthlyMap).sort();
      const lastMonth = monthlyMap[monthKeys[monthKeys.length - 1]];
      const prevMonth = monthlyMap[monthKeys[monthKeys.length - 2]];
      if (lastMonth && prevMonth && prevMonth.receitas > 0) {
        const growth = ((lastMonth.receitas - prevMonth.receitas) / prevMonth.receitas) * 100;
        if (growth < -10) {
          recommendations.push({
            text: `Faturamento caiu ${Math.abs(growth).toFixed(0)}% no último mês. Diversifique fontes de renda para melhorar previsibilidade.`,
            type: "warning",
          });
        } else if (growth > 10) {
          recommendations.push({
            text: `Faturamento cresceu ${growth.toFixed(0)}% — ótimo momento para investir em crescimento sustentável.`,
            type: "info",
          });
        }
      }
    }

    recommendations.push({
      text: "Mantenha uma reserva de emergência equivalente a pelo menos 3 meses de despesas fixas.",
      type: "info",
    });

    return {
      avgReceitas, avgDespesas, avgLucro, despesaPercent, margemLucro,
      topCategory, sortedCats, chartData, recommendations, numMonths,
    };
  }, [receitas, despesas]);

  const kpis = [
    {
      label: "Faturamento Médio",
      value: formatCurrency(analysis.avgReceitas),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Despesas Médias",
      value: formatCurrency(analysis.avgDespesas),
      icon: ShoppingCart,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Lucro Médio",
      value: formatCurrency(analysis.avgLucro),
      icon: analysis.avgLucro >= 0 ? TrendingUp : TrendingDown,
      color: analysis.avgLucro >= 0 ? "text-emerald-500" : "text-destructive",
      bg: analysis.avgLucro >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
    },
    {
      label: "Margem de Lucro",
      value: `${analysis.margemLucro.toFixed(1)}%`,
      icon: Percent,
      color: analysis.margemLucro >= 20 ? "text-emerald-500" : "text-amber-500",
      bg: analysis.margemLucro >= 20 ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Análise Financeira</h1>
        <p className="text-sm text-muted-foreground">
          Diagnóstico baseado nos últimos {analysis.numMonths} meses de atividade
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="font-heading text-xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {analysis.chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Comparativo Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top expense categories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-destructive" />
                Maiores Categorias de Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.sortedCats.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem dados de despesas no período.</p>
              ) : (
                analysis.sortedCats.slice(0, 5).map(([cat, val], i) => {
                  const totalDesp = analysis.sortedCats.reduce((s, [, v]) => s + v, 0);
                  const pct = totalDesp > 0 ? (val / totalDesp) * 100 : 0;
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{i + 1}. {cat}</span>
                        <Badge variant="secondary" className="text-xs">{pct.toFixed(0)}%</Badge>
                      </div>
                      <span className="text-sm font-semibold text-destructive">{formatCurrency(val)}</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.recommendations.map((rec, i) => {
                const Icon = rec.type === "warning" ? AlertTriangle : rec.type === "success" ? CheckCircle2 : Lightbulb;
                const color = rec.type === "warning" ? "text-amber-500" : rec.type === "success" ? "text-emerald-500" : "text-primary";
                const bgColor = rec.type === "warning" ? "bg-amber-500/10" : rec.type === "success" ? "bg-emerald-500/10" : "bg-primary/10";
                return (
                  <div key={i} className={`flex gap-3 rounded-lg p-3 ${bgColor}`}>
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
                    <p className="text-sm">{rec.text}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}