import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Target } from "lucide-react";

interface Goal {
  id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  prazo: string;
  categoria: string;
}

interface DashboardMetasChartProps {
  metas: Goal[];
}

export function DashboardMetasChart({ metas }: DashboardMetasChartProps) {
  if (!metas || metas.length === 0) return null;

  const data = metas.map(m => {
    const percent = m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
    return {
      name: m.titulo,
      percent: Math.min(Math.round(percent), 100),
      atual: m.valor_atual,
      alvo: m.valor_alvo,
      displayPercent: `${Math.round(percent)}%`
    };
  }).sort((a, b) => b.percent - a.percent);

  return (
    <Card className="shadow-md border-primary/5 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <span>Progresso das Metas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 40, right: 40, top: 10, bottom: 10 }}
              barSize={24}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                className="text-[10px] font-bold text-foreground"
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }}
                contentStyle={{
                  backgroundColor: 'rgba(var(--background), 0.8)',
                  backdropFilter: 'blur(8px)',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string, props: any) => {
                  return [
                    `${value}% (${formatCurrency(props.payload.atual)} / ${formatCurrency(props.payload.alvo)})`,
                    "Progresso"
                  ];
                }}
              />
              <Bar
                dataKey="percent"
                radius={[0, 12, 12, 0]}
                background={{ fill: 'hsl(var(--muted))', radius: 12, opacity: 0.3 }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.percent >= 100 ? 'hsl(160, 95%, 45%)' : 'hsl(var(--primary))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
