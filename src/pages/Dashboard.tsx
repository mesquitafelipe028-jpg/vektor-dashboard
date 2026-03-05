import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { mockTransactions, mockMonthlyData, totalReceitas, totalDespesas, saldo, formatCurrency, formatDate } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const stats = [
  { label: "Receitas", value: totalReceitas, icon: TrendingUp, color: "text-primary" },
  { label: "Despesas", value: totalDespesas, icon: TrendingDown, color: "text-destructive" },
  { label: "Saldo", value: saldo, icon: Wallet, color: "text-accent" },
  { label: "Pendentes", value: mockTransactions.filter(t => t.status === "pendente").length, icon: AlertTriangle, color: "text-warning", isCount: true },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold font-heading">
                  {s.isCount ? s.value : formatCurrency(s.value as number)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(160, 60%, 38%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(38, 90%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTransactions.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} • {formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={t.status === "pago" ? "default" : t.status === "pendente" ? "secondary" : "destructive"} className="text-xs">
                    {t.status}
                  </Badge>
                  <span className={`font-semibold text-sm ${t.type === "receita" ? "text-primary" : "text-destructive"}`}>
                    {t.type === "receita" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
