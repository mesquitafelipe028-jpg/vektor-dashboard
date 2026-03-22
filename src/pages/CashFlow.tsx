import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getLocalDateString } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArrowLeftRight, TrendingUp, TrendingDown, CalendarClock, ChevronDown, Repeat, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/transaction/TransactionBadge";
import { useFinancialData } from "@/hooks/useFinancialData";

export default function CashFlow() {
  const { user } = useAuth();
  const [tabFilter, setTabFilter] = useState<"all" | "receita" | "despesa">("all");
  const [showAll, setShowAll] = useState(false);

  const { 
    raw, 
    saldoTotal: saldoAtual, 
    loading: isLoading 
  } = useFinancialData();

  const receitas = (raw.receitas as unknown as ReceitaExtended[]) || [];
  const despesas = (raw.despesas as unknown as DespesaExtended[]) || [];

  const hoje = getLocalDateString();
  const end30 = new Date();
  end30.setDate(end30.getDate() + 30);
  const endStr = getLocalDateString(end30);

  // --- PROJECTION ENGINE ---
  const projections = useMemo(() => {
    const items: { date: string; descricao: string; tipo: "receita" | "despesa"; valor: number; isProjected: boolean }[] = [];
    
    // 1. Add explicitly PENDING/OVERDUE items (they are expected money flow)
    receitas.filter(r => (r.status === "pendente" || r.status === "atrasado")).forEach(r => {
      items.push({ date: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor, isProjected: false });
    });
    despesas.filter(d => (d.status === "pendente" || d.status === "atrasado")).forEach(d => {
      items.push({ date: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor, isProjected: false });
    });

    // 2. Generate future occurrences from RECURRING parents
    const generateFromRecurring = (list: (ReceitaExtended | DespesaExtended)[], tipo: "receita" | "despesa") => {
      const parents = list.filter(item => item.tipo_transacao === "recorrente" && !item.transacao_pai_id && item.frequencia);
      parents.forEach(p => {
        let currentD = new Date(p.data + "T00:00:00");
        const limit = new Date(endStr + "T23:59:59");
        const existingDates = new Set(list.filter(item => item.transacao_pai_id === p.id || item.id === p.id).map(item => item.data));
        
        for (let i = 0; i < 60; i++) {
          const dStr = getLocalDateString(currentD);
          if (dStr > hoje && dStr <= endStr && !existingDates.has(dStr)) {
            items.push({ date: dStr, descricao: p.descricao, tipo, valor: p.valor, isProjected: true });
          }
          if (currentD > limit) break;
          
          if (p.frequencia === "semanal") currentD.setDate(currentD.getDate() + 7);
          else if (p.frequencia === "quinzenal") currentD.setDate(currentD.getDate() + 15);
          else if (p.frequencia === "mensal") currentD.setMonth(currentD.getMonth() + 1);
          else if (p.frequencia === "anual") currentD.setFullYear(currentD.getFullYear() + 1);
          else break;
        }
      });
    };

    generateFromRecurring(receitas, "receita");
    generateFromRecurring(despesas, "despesa");

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [receitas, despesas, hoje, endStr]);

  // --- STATS ---
  const entradasFuturas = projections.filter(p => p.tipo === "receita").reduce((s, p) => s + p.valor, 0);
  const saidasFuturas = projections.filter(p => p.tipo === "despesa").reduce((s, p) => s + p.valor, 0);
  const previsaoSaldo = saldoAtual + entradasFuturas - saidasFuturas;

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    const data: { date: string; label: string; saldo: number; isFuture: boolean }[] = [];
    const now = new Date();
    
    // Find earliest record to start historical baseline? 
    // Actually, for "Cash Flow" focus on current status + next 30 days is better UX.
    let runningBalance = saldoAtual;
    
    for (let i = 0; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dStr = getLocalDateString(d);
      
      const dayMovements = projections.filter(p => p.date === dStr);
      dayMovements.forEach(m => {
        runningBalance += (m.tipo === "receita" ? m.valor : -m.valor);
      });

      data.push({
        date: dStr,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        saldo: runningBalance,
        isFuture: i > 0
      });
    }
    return data;
  }, [saldoAtual, projections]);

  // --- TIMELINE ---
  const timeline = useMemo(() => {
    const all: { id: string; data: string; descricao: string; tipo: "receita" | "despesa"; valor: number; isProjected?: boolean; status: string }[] = [];
    
    // Real items (those affecting the historical/current state)
    receitas.forEach(r => all.push({ id: r.id, data: r.data, descricao: r.descricao, tipo: "receita", valor: r.valor, status: r.status }));
    despesas.forEach(d => all.push({ id: d.id, data: d.data, descricao: d.descricao, tipo: "despesa", valor: d.valor, status: d.status }));
    
    // Future projections
    projections.filter(p => p.isProjected).forEach((p, i) => {
      all.push({ id: `proj-${i}`, data: p.date, descricao: p.descricao, tipo: p.tipo, valor: p.valor, isProjected: true, status: "prevista" });
    });

    const filtered = all.filter(item => {
      if (tabFilter === "all") return true;
      return item.tipo === tabFilter;
    }).sort((a, b) => a.data.localeCompare(b.data));

    return showAll ? filtered : filtered.slice(-20);
  }, [receitas, despesas, projections, tabFilter, showAll]);

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Calculando fluxo...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground text-sm">Visão de liquidez real e projeção para 30 dias</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1 flex items-center gap-2 text-xs font-medium text-primary">
          <CalendarClock className="h-3.5 w-3.5" />
          Projeção até {formatDate(endStr)}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo em Conta</p>
            </div>
            <p className={`text-3xl font-bold font-heading ${saldoAtual >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(saldoAtual)}
            </p>
            <div className="mt-2 flex items-center gap-2">
               <Badge variant="outline" className="text-[10px] py-0 h-5 bg-background border-primary/30 text-primary">Saldo Real</Badge>
               <span className="text-[10px] text-muted-foreground">Somente itens baixados</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entradas a Vir</p>
            </div>
            <p className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(entradasFuturas)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Estimativa de 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saídas Previstas</p>
            </div>
            <p className="text-2xl font-bold font-heading text-destructive">
              -{formatCurrency(saidasFuturas)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Estimativa de 30 dias</p>
          </CardContent>
        </Card>

        <Card className={previsaoSaldo < 0 ? "border-destructive/30 bg-destructive/5" : "border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10"}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${previsaoSaldo < 0 ? "bg-destructive/10" : "bg-blue-500/10"}`}>
                <CalendarClock className={`h-5 w-5 ${previsaoSaldo < 0 ? "text-destructive" : "text-blue-600 dark:text-blue-400"}`} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projeção Final</p>
            </div>
            <p className={`text-2xl font-bold font-heading ${previsaoSaldo < 0 ? "text-destructive" : "text-blue-600 dark:text-blue-400"}`}>
              {formatCurrency(previsaoSaldo)}
            </p>
            {previsaoSaldo < 0 && (
              <div className="flex items-center gap-1 text-[10px] text-destructive mt-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> Atenção: Déficit projetado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-heading">Evolução do Saldo (30 dias)</CardTitle>
              <p className="text-xs text-muted-foreground">Projeção baseada em pendências e recorrências</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" /> Saldo</div>
              <div className="flex items-center gap-1.5"><div className="h-0 w-3 border-t border-destructive border-dashed" /> Zero</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                  interval={4}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-lg shadow-xl outline-none">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{formatDate(data.date)}</p>
                          <p className="text-sm font-bold font-heading">{formatCurrency(data.saldo)}</p>
                          {data.isFuture && <Badge variant="secondary" className="mt-2 text-[8px] h-4 py-0 leading-none">Projetado</Badge>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-heading">Linha de Movimentação</CardTitle>
          <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 h-8 text-xs">
              <TabsTrigger value="all">Tudo</TabsTrigger>
              <TabsTrigger value="receita">Entradas</TabsTrigger>
              <TabsTrigger value="despesa">Saídas</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent uppercase tracking-wider text-[10px] font-bold text-muted-foreground">
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((item, i) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b group ${item.isProjected ? "bg-muted/20 opacity-70" : ""} ${item.data === hoje ? "bg-primary/5" : ""}`}
                  >
                    <TableCell className="text-xs">
                      {item.data === hoje ? (
                        <span className="font-bold text-primary">Hoje</span>
                      ) : formatDate(item.data)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.descricao}</span>
                        {item.isProjected && <Repeat className="h-3 w-3 text-muted-foreground" title="Projeção Automática" />}
                      </div>
                    </TableCell>
                    <TableCell>
                       {item.isProjected ? (
                         <Badge variant="outline" className="text-[10px] font-normal border-dashed opacity-70">Prevista</Badge>
                       ) : (
                         <StatusBadge status={item.status as any} type={item.tipo} />
                       )}
                    </TableCell>
                    <TableCell className={`text-right font-bold text-sm ${item.tipo === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                       {item.tipo === "receita" ? "+" : "-"}{formatCurrency(item.valor)}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground">Exibindo os últimos 20 lançamentos e projeções</p>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Ver menos" : "Ver todo histórico"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
