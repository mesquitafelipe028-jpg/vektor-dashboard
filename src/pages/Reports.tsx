import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";

const COLORS = ["hsl(160, 60%, 38%)", "hsl(38, 90%, 55%)", "hsl(200, 70%, 50%)", "hsl(280, 60%, 55%)", "hsl(0, 72%, 51%)"];

export default function Reports() {
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

  const now = new Date();

  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const rec = receitas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
      const desp = despesas.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        receitas: rec,
        despesas: desp,
        saldo: rec - desp,
      };
    });
  }, [receitas, despesas]);

  const pieData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    despesas.forEach((d) => {
      const cat = d.categoria || "Outros";
      categoryMap[cat] = (categoryMap[cat] || 0) + d.valor;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [despesas]);

  const last3Months = monthlyData.slice(-3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Análise financeira detalhada</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Receitas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
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

        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52 sm:h-72">
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Nenhuma despesa cadastrada.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Resumo do Período</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {last3Months.map((m) => (
              <div key={m.month} className="text-center p-4 rounded-lg border border-border">
                <p className="font-heading text-lg font-semibold mb-2">{m.month}</p>
                <p className="text-primary font-bold text-xl">{formatCurrency(m.receitas)}</p>
                <p className="text-xs text-muted-foreground">receitas</p>
                <p className="text-destructive font-bold text-xl mt-2">{formatCurrency(m.despesas)}</p>
                <p className="text-xs text-muted-foreground">despesas</p>
                <div className="border-t border-border mt-3 pt-3">
                  <p className="font-bold text-lg">{formatCurrency(m.saldo)}</p>
                  <p className="text-xs text-muted-foreground">saldo</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
