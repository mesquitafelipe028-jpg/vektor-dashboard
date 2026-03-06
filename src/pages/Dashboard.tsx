import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function Dashboard() {
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

  // Current month calculations
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const receitasMes = receitas.filter((r) => r.data.startsWith(currentMonth));
  const despesasMes = despesas.filter((d) => d.data.startsWith(currentMonth));
  const faturamentoMes = receitasMes.reduce((s, r) => s + r.valor, 0);
  const despesasMesTotal = despesasMes.reduce((s, d) => s + d.valor, 0);
  const lucroLiquido = faturamentoMes - despesasMesTotal;

  const stats = [
    { label: "Faturamento do Mês", value: faturamentoMes, icon: TrendingUp, color: "text-primary" },
    { label: "Despesas do Mês", value: despesasMesTotal, icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro Líquido", value: lucroLiquido, icon: Wallet, color: "text-chart-3" },
    { label: "Imposto MEI Pendente", value: impostoPendente?.valor ?? 0, icon: Receipt, color: "text-warning" },
  ];

  // Monthly chart data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const rec = receitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    const desp = despesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
    return { month: label.charAt(0).toUpperCase() + label.slice(1), receitas: rec, despesas: desp };
  });

  const latestReceitas = receitas.slice(0, 5);
  const latestDespesas = despesas.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Receitas vs Despesas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
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
            <CardHeader><CardTitle className="font-heading text-lg">Evolução do Faturamento</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="receitas" name="Faturamento" stroke="hsl(200, 70%, 50%)" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
