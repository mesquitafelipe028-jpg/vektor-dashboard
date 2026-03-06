import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, HeartPulse, ShieldCheck, AlertTriangle, ShieldAlert, Target,
  FileText, ArrowUpRight, ArrowDownRight, Building2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { useFinancialInsights } from "@/hooks/useFinancialInsights";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PIE_COLORS = [
  "hsl(160, 60%, 38%)",
  "hsl(38, 90%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(145, 60%, 42%)",
  "hsl(220, 60%, 50%)",
  "hsl(340, 60%, 50%)",
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const receitasMes = receitas.filter((r) => r.data.startsWith(currentMonth));
  const despesasMes = despesas.filter((d) => d.data.startsWith(currentMonth));
  const faturamentoMes = receitasMes.reduce((s, r) => s + r.valor, 0);
  const despesasMesTotal = despesasMes.reduce((s, d) => s + d.valor, 0);
  const saldoMes = faturamentoMes - despesasMesTotal;

  // Previous month for report summary
  const prevMonth = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long" });
    const rec = receitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = despesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const lucro = rec - desp;
    const varFat = rec > 0 && faturamentoMes > 0 ? ((faturamentoMes - rec) / rec) * 100 : 0;
    return { label, rec, desp, lucro, varFat };
  }, [receitas, despesas, faturamentoMes]);

  // Saúde Financeira
  const despesaPercent = faturamentoMes > 0 ? (despesasMesTotal / faturamentoMes) * 100 : 0;
  const healthStatus = despesaPercent < 50 ? "healthy" : despesaPercent <= 75 ? "warning" : "critical";
  const healthConfig = {
    healthy: { label: "Saudável", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/30" },
    warning: { label: "Atenção", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    critical: { label: "Crítico", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
  }[healthStatus];

  const insights = useFinancialInsights(receitas, despesas);

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
    const rec = receitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = despesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
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

  const latestReceitas = receitas.slice(0, 5);
  const latestDespesas = despesas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header + CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/receitas")}>
            <Plus className="h-4 w-4" /> Registrar Receita
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/despesas")}>
            <Plus className="h-4 w-4" /> Registrar Despesa
          </Button>
        </div>
      </div>

      {/* Company Card */}
      {empresa && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
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
        </motion.div>
      )}

      {/* Saldo + Saúde Financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
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
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Faturamento do Mês", value: faturamentoMes, icon: TrendingUp, color: "text-primary" },
          { label: "Despesas do Mês", value: despesasMesTotal, icon: TrendingDown, color: "text-destructive" },
          { label: "Imposto MEI Pendente", value: impostoPendente?.valor ?? 0, icon: Receipt, color: "text-accent" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + i * 0.08 }}>
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="font-heading text-2xl font-bold">{formatCurrency(s.value)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Financial Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Insights Financeiros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <motion.div key={insight.title} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                <Card className={`border-l-4 ${insightColors[insight.type]}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <insight.icon className={`h-5 w-5 mt-0.5 shrink-0 ${insightIconColors[insight.type]}`} />
                    <div>
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                      <p className="text-xs text-muted-foreground italic mt-1">💡 {insight.suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Receitas vs Despesas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-52 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="receitas" name="Receitas" fill="hsl(160, 60%, 38%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {categoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma despesa registrada este mês.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Meta Financeira Card */}
      {metaAtual && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acumulado: <span className="font-semibold text-primary">{formatCurrency(metaAtual.valor_atual)}</span></span>
                <span className="text-muted-foreground">Meta: <span className="font-semibold">{formatCurrency(metaAtual.valor_alvo)}</span></span>
                <span className="text-muted-foreground">Falta: <span className="font-semibold text-destructive">{formatCurrency(Math.max(metaAtual.valor_alvo - metaAtual.valor_atual, 0))}</span></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Monthly Report Summary */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/relatorio-mensal")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-chart-3" />
                <span className="font-heading font-semibold">Resumo — {prevMonth.label}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {prevMonth.varFat >= 0
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                  : <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
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
      </motion.div>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Últimas Receitas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestReceitas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>}
                {latestReceitas.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.descricao}</p>
                      <p className="text-xs text-muted-foreground">{r.forma_pagamento ?? "—"} • {formatDate(r.data)}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">+{formatCurrency(r.valor)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Últimas Despesas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestDespesas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>}
                {latestDespesas.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground">{d.categoria ?? "—"} • {formatDate(d.data)}</p>
                    </div>
                    <span className="text-sm font-semibold text-destructive">-{formatCurrency(d.valor)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
