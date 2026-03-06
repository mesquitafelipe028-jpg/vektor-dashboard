import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import {
  mockMonthlyData, faturamentoMes, despesasMes, lucroLiquido,
  impostoPendente, formatCurrency, formatDate,
  getMonthTransactions,
} from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const stats = [
  { label: "Faturamento do Mês", value: faturamentoMes, icon: TrendingUp, color: "text-primary" },
  { label: "Despesas do Mês", value: despesasMes, icon: TrendingDown, color: "text-destructive" },
  { label: "Lucro Líquido", value: lucroLiquido, icon: Wallet, color: "text-chart-3" },
  { label: "Imposto MEI Pendente", value: impostoPendente?.valor ?? 0, icon: Receipt, color: "text-warning" },
];

const recentReceitas = getMonthTransactions("receita").slice(0, 5);
const recentDespesas = getMonthTransactions("despesa").slice(0, 5);

// Fallback: if current month has fewer than 5, grab from all
const latestReceitas = recentReceitas.length >= 5 ? recentReceitas :
  [...recentReceitas, ...getMonthTransactions("receita", "2026-02"), ...getMonthTransactions("receita", "2026-01")].slice(0, 5);
const latestDespesas = recentDespesas.length >= 5 ? recentDespesas :
  [...recentDespesas, ...getMonthTransactions("despesa", "2026-02"), ...getMonthTransactions("despesa", "2026-01")].slice(0, 5);

function TransactionList({ title, items }: { title: string; items: typeof latestReceitas }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-heading text-lg">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((t) => (
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
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral das suas finanças — Março 2026</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold font-heading">{formatCurrency(s.value)}</p>
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
                  <BarChart data={mockMonthlyData} barGap={4}>
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
                  <LineChart data={mockMonthlyData}>
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
          <TransactionList title="Últimas Receitas" items={latestReceitas} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <TransactionList title="Últimas Despesas" items={latestDespesas} />
        </motion.div>
      </div>
    </div>
  );
}
