import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const FALLBACK_COLOR = "hsl(220, 20%, 65%)";

interface DashboardChartsProps {
  monthlyData: { month: string; receitas: number; despesas: number }[];
  categoryData: { name: string; value: number; fill?: string }[];
  flowChartData?: { dia: number; receitas: number; despesas: number; saldo: number; dateStr?: string }[];
  onMonthClick?: (monthStr: string) => void;
  onCategoryClick?: (category: string) => void;
  onDayClick?: (dateStr: string) => void;
}

const DashboardCharts = React.memo(function DashboardCharts({ 
  monthlyData, 
  categoryData, 
  flowChartData = [],
  onMonthClick,
  onCategoryClick,
  onDayClick
}: DashboardChartsProps) {
  const isMobile = useIsMobile();
  const animationDuration = isMobile ? 800 : 1500;
  
  const avgReceitas = useMemo(() => 
    monthlyData.length > 0 ? monthlyData.reduce((s, m) => s + m.receitas, 0) / monthlyData.length : 0, 
  [monthlyData]);

  const totalCategoria = useMemo(() => 
    categoryData.reduce((s, c) => s + c.value, 0), 
  [categoryData]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rec = payload.find((p: any) => p.dataKey === 'receitas')?.value || 0;
      const desp = payload.find((p: any) => p.dataKey === 'despesas')?.value || 0;
      const diff = rec - desp;
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-xl flex flex-col gap-1 z-50 pointer-events-none">
          <p className="font-heading font-bold text-sm mb-1">{label}</p>
          <div className="flex justify-between gap-4 text-xs font-semibold text-emerald-500">
            <span>Receitas</span>
            <span>{formatCurrency(rec)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs font-semibold text-rose-500">
            <span>Despesas</span>
            <span>{formatCurrency(desp)}</span>
          </div>
          <div className="border-t border-border/50 my-1"></div>
          <div className={`flex justify-between gap-4 text-xs font-bold ${diff >= 0 ? 'text-primary' : 'text-rose-500'}`}>
            <span>Saldo</span>
            <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-xl flex flex-col gap-1 z-50 pointer-events-none min-w-[140px]">
          <p className="font-heading font-bold text-sm mb-1">Dia {label}</p>
          <div className="flex justify-between gap-4 text-xs font-semibold text-emerald-500">
            <span>Entradas</span>
            <span>{formatCurrency(data.receitas || 0)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs font-semibold text-rose-500">
            <span>Saídas</span>
            <span>{formatCurrency(data.despesas || 0)}</span>
          </div>
          <div className="border-t border-border/50 my-1"></div>
          <div className={`flex justify-between gap-4 text-xs font-bold ${data.saldo >= 0 ? 'text-primary' : 'text-rose-500'}`}>
            <span>Saldo Acumulado</span>
            <span>{formatCurrency(data.saldo)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="shadow-md border-primary/5 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">Receitas vs Despesas</span>
            <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded border border-border/50">6 meses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={isMobile ? 4 : 12} margin={{ bottom: 10, top: 20 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 60%, 55%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradReceitaStrong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 95%, 45%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(160, 95%, 35%)" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 60%, 75%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(0, 60%, 65%)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradDespesaStrong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 95%, 65%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(0, 95%, 55%)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis 
                  dataKey="month" 
                  className="text-[10px] font-semibold text-muted-foreground" 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  hide
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '24px' }}
                />
                <ReferenceLine y={avgReceitas} stroke="hsl(160, 95%, 45%)" strokeDasharray="3 3" opacity={0.3} />
                <Bar 
                  dataKey="receitas" 
                  name="Receitas" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isMobile ? 24 : 32}
                  animationDuration={animationDuration}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-rec-${index}`} 
                      fill={entry.receitas >= entry.despesas ? "url(#gradReceitaStrong)" : "url(#gradReceita)"} 
                      className={onMonthClick ? "cursor-pointer hover:saturate-150 transition-all" : ""}
                      onClick={() => onMonthClick && onMonthClick(entry.month)}
                    />
                  ))}
                  <LabelList 
                    dataKey="receitas" 
                    position="top" 
                    formatter={(val: number) => val > 0 ? `R$${(val/1000).toFixed(0)}k` : ''} 
                    className="fill-muted-foreground text-[8px] sm:text-[9px] font-bold" 
                    offset={4} 
                  />
                </Bar>
                <Bar 
                  dataKey="despesas" 
                  name="Despesas" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isMobile ? 24 : 32}
                  animationDuration={animationDuration}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-desp-${index}`} 
                      fill={entry.despesas > entry.receitas ? "url(#gradDespesaStrong)" : "url(#gradDespesa)"} 
                      className={onMonthClick ? "cursor-pointer hover:saturate-150 transition-all" : ""}
                      onClick={() => onMonthClick && onMonthClick(entry.month)}
                    />
                  ))}
                  <LabelList 
                    dataKey="despesas" 
                    position="top" 
                    formatter={(val: number) => val > 0 ? `R$${(val/1000).toFixed(0)}k` : ''} 
                    className="fill-muted-foreground text-[8px] sm:text-[9px] font-bold" 
                    offset={4} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-primary/5 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            <span>Despesas por Categoria</span>
            <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded border border-border/50">Mensal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72 mt-4 flex flex-col justify-center relative">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                Nenhuma despesa registrada este mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: isMobile ? 40 : 80, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={isMobile ? 80 : 110} 
                    className="text-[10px] font-semibold text-muted-foreground" 
                    tickFormatter={(v) => v.length > 14 ? v.substring(0, 14) + '...' : v} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }} 
                    contentStyle={{ 
                      backgroundColor: 'rgba(var(--background), 0.95)', 
                      backdropFilter: 'blur(8px)',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(v: number) => {
                      const pct = totalCategoria > 0 ? ((v / totalCategoria) * 100).toFixed(1) : "0";
                      return [`${formatCurrency(v)} (${pct}%)`, ""];
                    }}
                    labelStyle={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="value" 
                    barSize={16} 
                    radius={[0, 6, 6, 0]} 
                    animationDuration={animationDuration}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-cat-${index}`} 
                        fill={entry.fill || FALLBACK_COLOR} 
                        className={onCategoryClick ? "cursor-pointer hover:saturate-150 transition-all outline-none" : "outline-none"}
                        onClick={() => onCategoryClick && onCategoryClick(entry.name)}
                      />
                    ))}
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      formatter={(val: number) => {
                        const pct = totalCategoria > 0 ? ((val / totalCategoria) * 100).toFixed(1) : "0";
                        return isMobile ? `${pct}%` : `${formatCurrency(val)} (${pct}%)`;
                      }} 
                      className="fill-foreground/80 text-[10px] font-bold" 
                      offset={6} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {flowChartData.length > 0 && (
        <Card className="lg:col-span-2 shadow-md border-primary/5 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center justify-between">
              <span>Fluxo de Caixa Diário</span>
              <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded border border-border/50">Este Mês</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowChartData} margin={{ left: 0, right: 0, bottom: 0, top: 10 }}>
                  <defs>
                    <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                  <XAxis 
                    dataKey="dia" 
                    className="text-[10px] font-semibold text-muted-foreground" 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#gradSaldo)" 
                    activeDot={{ 
                      r: 6, 
                      strokeWidth: 0, 
                      fill: "hsl(var(--primary))", 
                      className: onDayClick ? "cursor-pointer" : "", 
                      onClick: (_: any, payload: any) => onDayClick && payload?.payload?.dateStr && onDayClick(payload.payload.dateStr) 
                    }}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      if (payload.saldo < 0) {
                        return <circle key={`dot-${payload.dia}`} cx={cx} cy={cy} r={3} fill="hsl(0, 95%, 60%)" stroke="none" className={onDayClick ? "cursor-pointer" : ""} onClick={() => onDayClick?.(payload.dateStr)} />;
                      }
                      return <circle key={`dot-${payload.dia}`} cx={cx} cy={cy} r={2} fill="hsl(var(--primary))" opacity={0.3} stroke="none" className={onDayClick ? "cursor-pointer hover:opacity-100 transition-opacity" : ""} onClick={() => onDayClick?.(payload.dateStr)} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default DashboardCharts;
