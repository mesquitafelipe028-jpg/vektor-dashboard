import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, Activity } from "lucide-react";

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
        <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-1.5 z-50 pointer-events-none min-w-[180px]">
          <p className="font-heading font-bold text-sm mb-1.5 text-foreground">{label}</p>
          <div className="flex justify-between gap-6 text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />Receitas</span>
            <span>{formatCurrency(rec)}</span>
          </div>
          <div className="flex justify-between gap-6 text-xs font-semibold text-rose-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />Despesas</span>
            <span>{formatCurrency(desp)}</span>
          </div>
          <div className="border-t border-white/10 my-1" />
          <div className={`flex justify-between gap-6 text-xs font-bold ${diff >= 0 ? 'text-primary' : 'text-rose-400'}`}>
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
        <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-1.5 z-50 pointer-events-none min-w-[160px]">
          <p className="font-heading font-bold text-sm mb-1.5 text-foreground">Dia {label}</p>
          <div className="flex justify-between gap-6 text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />Entradas</span>
            <span>{formatCurrency(data.receitas || 0)}</span>
          </div>
          <div className="flex justify-between gap-6 text-xs font-semibold text-rose-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />Saídas</span>
            <span>{formatCurrency(data.despesas || 0)}</span>
          </div>
          <div className="border-t border-white/10 my-1" />
          <div className={`flex justify-between gap-6 text-xs font-bold ${data.saldo >= 0 ? 'text-primary' : 'text-rose-400'}`}>
            <span>Acumulado</span>
            <span>{formatCurrency(data.saldo)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const name = payload[0].payload?.name || "";
      const pct = totalCategoria > 0 ? ((val / totalCategoria) * 100).toFixed(1) : "0";
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50 pointer-events-none min-w-[160px]">
          <p className="font-bold text-sm mb-1.5 text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(val)} <span className="text-primary font-bold">({pct}%)</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Receitas vs Despesas ─────────────────────────────── */}
      <Card className="relative overflow-hidden border-none rounded-2xl bg-card shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="font-heading text-base flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span>Receitas vs Despesas</span>
            </span>
            <span className="text-[9px] text-emerald-600/70 font-bold uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              6 meses
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="h-64 sm:h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={isMobile ? 4 : 12} margin={{ bottom: 10, top: 20 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(157, 80%, 55%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(157, 80%, 40%)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="gradReceitaStrong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(157, 95%, 52%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(157, 95%, 38%)" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 70%, 70%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="gradDespesaStrong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 90%, 65%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(0, 90%, 50%)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--primary))', opacity: 0.04 }} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '20px' }}
                />
                <ReferenceLine y={avgReceitas} stroke="hsl(157, 80%, 43%)" strokeDasharray="4 4" opacity={0.4} />
                <Bar 
                  dataKey="receitas" 
                  name="Receitas" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isMobile ? 22 : 30}
                  animationDuration={animationDuration}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-rec-${index}`} 
                      fill={entry.receitas >= entry.despesas ? "url(#gradReceitaStrong)" : "url(#gradReceita)"} 
                      className={onMonthClick ? "cursor-pointer" : ""}
                      onClick={() => onMonthClick && onMonthClick(entry.month)}
                    />
                  ))}
                  <LabelList 
                    dataKey="receitas" 
                    position="top" 
                    formatter={(val: number) => val > 0 ? `R$${(val/1000).toFixed(0)}k` : ''} 
                    style={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 9, fontWeight: 700 }}
                    offset={5}
                  />
                </Bar>
                <Bar 
                  dataKey="despesas" 
                  name="Despesas" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isMobile ? 22 : 30}
                  animationDuration={animationDuration}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-desp-${index}`} 
                      fill={entry.despesas > entry.receitas ? "url(#gradDespesaStrong)" : "url(#gradDespesa)"} 
                      className={onMonthClick ? "cursor-pointer" : ""}
                      onClick={() => onMonthClick && onMonthClick(entry.month)}
                    />
                  ))}
                  <LabelList 
                    dataKey="despesas" 
                    position="top" 
                    formatter={(val: number) => val > 0 ? `R$${(val/1000).toFixed(0)}k` : ''} 
                    style={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 9, fontWeight: 700 }}
                    offset={5}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Despesas por Categoria ────────────────────────────── */}
      <Card className="relative overflow-hidden border-none rounded-2xl bg-card shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="font-heading text-base flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-500">
                <PieChartIcon className="h-4 w-4" />
              </span>
              <span>Despesas por Categoria</span>
            </span>
            <span className="text-[9px] text-rose-600/70 font-bold uppercase tracking-widest bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              Mensal
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="h-64 sm:h-72 mt-2 flex flex-col justify-center">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                Nenhuma despesa registrada este mês.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoryData} 
                  layout="vertical" 
                  margin={{ left: 0, right: isMobile ? 50 : 90, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={isMobile ? 90 : 120}
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => v.length > 16 ? v.substring(0, 16) + '…' : v}
                  />
                  <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar 
                    dataKey="value" 
                    barSize={14}
                    radius={[0, 8, 8, 0]} 
                    animationDuration={animationDuration}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-cat-${index}`} 
                        fill={entry.fill || FALLBACK_COLOR} 
                        className={onCategoryClick ? "cursor-pointer" : ""}
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
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 700, opacity: 0.8 }}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Fluxo de Caixa Diário ─────────────────────────────── */}
      {flowChartData.length > 0 && (
        <Card className="lg:col-span-2 relative overflow-hidden border-none rounded-2xl bg-card shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="font-heading text-base flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 border border-primary/20 text-primary">
                  <Activity className="h-4 w-4" />
                </span>
                <span>Fluxo de Caixa Diário</span>
              </span>
              <span className="text-[9px] text-primary/70 font-bold uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                Este Mês
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="h-64 sm:h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowChartData} margin={{ left: 0, right: 0, bottom: 0, top: 10 }}>
                  <defs>
                    <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="70%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glowLine">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="dia" 
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }} />
                  <Area 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#gradSaldo)"
                    filter="url(#glowLine)"
                    activeDot={{ 
                      r: 7, 
                      strokeWidth: 2,
                      stroke: "hsl(var(--primary))",
                      fill: "hsl(var(--background))",
                      className: onDayClick ? "cursor-pointer" : "", 
                      onClick: (_: any, payload: any) => onDayClick && payload?.payload?.dateStr && onDayClick(payload.payload.dateStr) 
                    }}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      if (payload.saldo < 0) {
                        return (
                          <g key={`dot-${payload.dia}`}>
                            <circle cx={cx} cy={cy} r={5} fill="hsl(0, 90%, 60%)" stroke="hsl(var(--background))" strokeWidth={2} className={onDayClick ? "cursor-pointer" : ""} onClick={() => onDayClick?.(payload.dateStr)} />
                          </g>
                        );
                      }
                      return <circle key={`dot-${payload.dia}`} cx={cx} cy={cy} r={2} fill="hsl(var(--primary))" opacity={0.4} stroke="none" className={onDayClick ? "cursor-pointer" : ""} onClick={() => onDayClick?.(payload.dateStr)} />;
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
