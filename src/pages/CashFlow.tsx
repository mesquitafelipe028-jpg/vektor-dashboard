import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeftRight } from "lucide-react";
import { useMemo } from "react";

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

  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const monthlyData = useMemo(() => {
    const now = new Date();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground text-sm">Acompanhe a movimentação financeira</p>
      </div>

      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-2xl font-bold font-heading">{formatCurrency(saldo)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Fluxo Mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(160, 60%, 38%)" fill="hsl(160, 60%, 38%)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Resumo por Mês</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyData.map((m) => (
              <div key={m.month} className="rounded-lg border border-border p-4">
                <p className="font-heading font-semibold text-lg mb-3">{m.month}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Receitas</span><span className="text-primary font-medium">{formatCurrency(m.receitas)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Despesas</span><span className="text-destructive font-medium">{formatCurrency(m.despesas)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-medium">Saldo</span><span className="font-bold">{formatCurrency(m.saldo)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
