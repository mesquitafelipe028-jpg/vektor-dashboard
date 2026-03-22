import { useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { transactionColors } from "@/lib/categories";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Activity, PiggyBank, Percent, Scale,
  Download, Loader2, CalendarIcon, Info, FileText, ShieldAlert, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFinancialData } from "@/hooks/useFinancialData";
import { FinanceService } from "@/lib/financeService";

const PIE_COLORS = [
  "hsl(160, 60%, 38%)", "hsl(38, 90%, 55%)", "hsl(200, 70%, 50%)",
  "hsl(280, 60%, 55%)", "hsl(0, 72%, 51%)", "hsl(145, 60%, 42%)",
  "hsl(220, 60%, 50%)", "hsl(340, 60%, 50%)",
];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthLabel(year: number, month: number) {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const VarIndicator = ({ value }: { value: number }) => {
  if (Math.abs(value) < 0.5) return <Minus className="h-4 w-4 text-muted-foreground" />;
  return value > 0
    ? <ArrowUpRight className="h-4 w-4 text-green-600" />
    : <ArrowDownRight className="h-4 w-4 text-red-600" />;
};


export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const now = new Date();

  // Use the hook to get base data
  const { raw, loading } = useFinancialData();

  const defaultMonth = now.getMonth() === 0
    ? getMonthKey(now.getFullYear() - 1, 11)
    : getMonthKey(now.getFullYear(), now.getMonth() - 1);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  // Available months from raw data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    raw.receitas.forEach((r) => months.add(r.data.slice(0, 7)));
    raw.despesas.forEach((d) => months.add(d.data.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [raw.receitas, raw.despesas]);

  // View Geral
  const monthlyData = useMemo(() => 
    FinanceService.getMonthlySeries(raw.receitas, raw.despesas, "tudo"),
    [raw.receitas, raw.despesas]
  );

  const last3Months = monthlyData.slice(-3);

  // Main Report (DRE + Stats)
  const report = useMemo(() => {
    const dre = FinanceService.getDRE(raw.receitas, raw.despesas, "tudo", selectedMonth);
    const categorias = FinanceService.getCategoryBreakdown(raw.despesas, "tudo", selectedMonth);
    
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevKey = m === 1 ? getMonthKey(y - 1, 11) : getMonthKey(y, m - 2);
    const dreAnterior = FinanceService.getDRE(raw.receitas, raw.despesas, "tudo", prevKey);

    const varFaturamento = dreAnterior.rec > 0 ? ((dre.rec - dreAnterior.rec) / dreAnterior.rec) * 100 : 0;
    const varDespesas = (dreAnterior.recLiquida - dreAnterior.lucroLiquido) > 0 
      ? (((dre.recLiquida - dre.lucroLiquido) - (dreAnterior.recLiquida - dreAnterior.lucroLiquido)) / (dreAnterior.recLiquida - dreAnterior.lucroLiquido)) * 100 
      : 0;
    const varLucro = dreAnterior.lucroLiquido !== 0 ? ((dre.lucroLiquido - dreAnterior.lucroLiquido) / Math.abs(dreAnterior.lucroLiquido)) * 100 : 0;

    return {
      faturamento: dre.rec,
      totalDespesas: dre.rec - dre.lucroLiquido, // Simplified for summary cards
      lucro: dre.lucroLiquido,
      categorias,
      maiorCategoria: categorias[0] || null,
      fatAnterior: dreAnterior.rec,
      despAnterior: dreAnterior.rec - dreAnterior.lucroLiquido,
      lucroAnterior: dreAnterior.lucroLiquido,
      varFaturamento,
      varDespesas,
      varLucro,
      dre,
      despesaPercent: dre.rec > 0 ? ((dre.rec - dre.lucroLiquido) / dre.rec) * 100 : 0
    };
  }, [raw.receitas, raw.despesas, selectedMonth]);

  const healthIndicators = useMemo(() => 
    FinanceService.getHealthIndicators(raw.receitas, raw.despesas, "tudo"),
    [raw.receitas, raw.despesas]
  );

  const [selY, selM] = selectedMonth.split("-").map(Number);
  const monthLabel = getMonthLabel(selY, selM - 1);

  const handleExportExcel = useCallback(() => {
    const data = [
      ["DEMONSTRATIVO DE RESULTADO (DRE)", "", monthLabel],
      ["", "", ""],
      ["1. RECEITA OPERACIONAL BRUTA", "", report.dre.rec],
      ["(-) Tributos sobre Vendas", "", -report.dre.impostos],
      ["(=) RECEITA OPERACIONAL LÍQUIDA", "", report.dre.recLiquida],
      ["", "", ""],
      ["(-) Custos Variáveis", "", -report.dre.custosVariaveis],
      ["(=) MARGEM DE CONTRIBUIÇÃO", "", report.dre.margem],
      ["", "", ""],
      ["(-) Despesas Fixas Operacionais", "", -report.dre.despesasFixas],
      ["(=) LUCRO OPERACIONAL (EBITDA)", "", report.dre.ebitda],
      ["", "", ""],
      ["(-) Outras Despesas/Receitas", "", -report.dre.outras],
      ["(=) LUCRO LÍQUIDO DO EXERCÍCIO", "", report.dre.lucroLiquido],
      ["", "", ""],
      ["Percentual de Despesa/Rec: ", "", `${report.despesaPercent.toFixed(2)}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRE");
    XLSX.writeFile(wb, `DRE-${selectedMonth}.xlsx`);
    toast({ title: "Excel (DRE) exportado com sucesso!" });
  }, [report, monthLabel, selectedMonth, toast]);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;

      let y = 10;
      let remainingHeight = imgHeight;

      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);

      // If content overflows, add pages
      while (remainingHeight > pageHeight) {
        remainingHeight -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, -(imgHeight - remainingHeight), imgWidth, imgHeight);
      }

      pdf.save(`relatorio-${selectedMonth}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [selectedMonth, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Análise financeira completa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Excel (Contador)
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef}>
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="visao-geral" className="flex-1 sm:flex-initial">Visão Geral</TabsTrigger>
          <TabsTrigger value="analise-mensal" className="flex-1 sm:flex-initial">Análise Mensal</TabsTrigger>
          <TabsTrigger value="dre" className="flex-1 sm:flex-initial">DRE Profissional</TabsTrigger>
        </TabsList>

        {/* ===== TAB: Visão Geral ===== */}
        <TabsContent value="visao-geral" className="space-y-6">
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
            <CardHeader><CardTitle className="font-heading text-lg">Resumo do Período</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {last3Months.map((m) => (
                  <div key={m.month} className="text-center p-4 rounded-lg border border-border">
                    <p className="font-heading text-lg font-semibold mb-2">{m.month}</p>
                    <p className={`font-bold text-xl ${transactionColors.receita.text}`}>{formatCurrency(m.receitas)}</p>
                    <p className="text-xs text-muted-foreground">receitas</p>
                    <p className={`font-bold text-xl mt-2 ${transactionColors.despesa.text}`}>{formatCurrency(m.despesas)}</p>
                    <p className="text-xs text-muted-foreground">despesas</p>
                    <div className="border-t border-border mt-3 pt-3">
                      <p className={`font-bold text-lg ${m.saldo >= 0 ? transactionColors.receita.text : transactionColors.despesa.text}`}>{formatCurrency(m.saldo)}</p>
                      <p className="text-xs text-muted-foreground">saldo</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: Análise Mensal ===== */}
        <TabsContent value="analise-mensal" className="space-y-6">
          <div className="flex justify-end">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => {
                  const [y, mo] = m.split("-").map(Number);
                  return <SelectItem key={m} value={m}>{getMonthLabel(y, mo - 1)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Faturamento", value: report.faturamento, prev: report.fatAnterior, variation: report.varFaturamento, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "Despesas", value: report.totalDespesas, prev: report.despAnterior, variation: report.varDespesas, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10", invertColor: true },
              { label: "Lucro Líquido", value: report.lucro, prev: report.lucroAnterior, variation: report.varLucro, icon: Wallet, color: report.lucro >= 0 ? "text-primary" : "text-destructive", bgColor: report.lucro >= 0 ? "bg-primary/10" : "bg-destructive/10" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-9 w-9 rounded-lg ${s.bgColor} flex items-center justify-center`}>
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </div>
                    <p className="font-heading text-2xl font-bold">{formatCurrency(s.value)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <VarIndicator value={s.invertColor ? -s.variation : s.variation} />
                      <span className="text-xs text-muted-foreground">
                        {Math.abs(s.variation).toFixed(1)}% vs mês anterior ({formatCurrency(s.prev)})
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Expense ratio + Top category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <span className="font-heading font-semibold">Percentual de Despesas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Despesas / Faturamento</span>
                  <span className="font-semibold">{report.despesaPercent.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(report.despesaPercent, 100)} className="h-3" />
                <Badge variant="outline" className={
                  report.despesaPercent < 50 ? "bg-green-500/15 text-green-700 border-green-500/30" :
                  report.despesaPercent <= 75 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" :
                  "bg-red-500/15 text-red-700 border-red-500/30"
                }>
                  {report.despesaPercent < 50 ? "Saudável" : report.despesaPercent <= 75 ? "Atenção" : "Crítico"}
                </Badge>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-heading font-semibold">Maior Gasto por Categoria</span>
                </div>
                {report.maiorCategoria ? (
                  <>
                    <p className="text-2xl font-bold font-heading">{report.maiorCategoria.name}</p>
                    <p className="text-lg font-semibold text-destructive">{formatCurrency(report.maiorCategoria.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      Representa {report.totalDespesas > 0 ? ((report.maiorCategoria.value / report.totalDespesas) * 100).toFixed(0) : 0}% do total de despesas
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart */}
          {report.categorias.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Despesas por Categoria — {monthLabel}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={report.categorias} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {report.categorias.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Saúde Financeira */}
          <div>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Saúde Financeira
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Indicadores calculados com base nos últimos 6 meses de atividade.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Lucro Médio Mensal", value: formatCurrency(healthIndicators.lucroMedioMensal), positive: healthIndicators.lucroMedioMensal >= 0, explanation: "Média de receitas menos despesas nos últimos 6 meses.", icon: PiggyBank },
                { label: "Despesas / Faturamento", value: `${healthIndicators.despesaPercentMedia.toFixed(1)}%`, positive: healthIndicators.despesaPercentMedia < 60, explanation: "Percentual médio do faturamento consumido por despesas. Abaixo de 60% é saudável.", icon: Percent },
                { label: "Crescimento", value: `${healthIndicators.crescimento >= 0 ? "+" : ""}${healthIndicators.crescimento.toFixed(1)}%`, positive: healthIndicators.crescimento >= 0, explanation: "Compara faturamento dos últimos 3 meses com os 3 anteriores.", icon: TrendingUp },
                { label: "Saldo Médio Mensal", value: formatCurrency(healthIndicators.saldoMedioMensal), positive: healthIndicators.saldoMedioMensal >= 0, explanation: "Média do saldo (receitas - despesas) por mês.", icon: Scale },
              ].map((ind, i) => (
                <motion.div key={ind.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
                  <Card className={`h-full border-l-4 ${ind.positive ? "border-l-green-500" : "border-l-red-500"}`}>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <ind.icon className={`h-5 w-5 ${ind.positive ? "text-green-600" : "text-red-600"}`} />
                        <span className="text-sm font-medium text-muted-foreground">{ind.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-xl font-bold">{ind.value}</p>
                        {ind.positive ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ind.explanation}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB: DRE Profissional ===== */}
        <TabsContent value="dre" className="space-y-6">
          <div className="flex justify-end">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => {
                  const [y, mo] = m.split("-").map(Number);
                  return <SelectItem key={m} value={m}>{getMonthLabel(y, mo - 1)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-xl">Demonstrativo de Resultado (DRE)</CardTitle>
                <p className="text-sm text-muted-foreground">{monthLabel}</p>
              </div>
              <Badge variant="secondary">Visão Contábil</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <DRELine label="1. RECEITA OPERACIONAL BRUTA" value={report.dre.rec} primary />
                  <DRELine label="(-) Tributos sobre Vendas" value={-report.dre.impostos} indent />
                  <Separator className="my-1" />
                  <DRELine label="(=) RECEITA OPERACIONAL LÍQUIDA" value={report.dre.recLiquida} bold />
                  
                  <div className="h-4" />
                  
                  <DRELine label="(-) Custos Variáveis" value={-report.dre.custosVariaveis} indent />
                  <DRELine label="(Marketing, Transporte, Insumos)" value={null} subtext indent />
                  <Separator className="my-1" />
                  <DRELine label="(=) MARGEM DE CONTRIBUIÇÃO" value={report.dre.margem} bold />
                  <DRELine label={`Margem rel. à rec. líquida: ${(report.dre.recLiquida > 0 ? (report.dre.margem / report.dre.recLiquida) * 100 : 0).toFixed(1)}%`} value={null} subtext />

                  <div className="h-4" />

                  <DRELine label="(-) Despesas Fixas Operacionais" value={-report.dre.despesasFixas} indent />
                  <DRELine label="(Aluguel, Software, Comunicação)" value={null} subtext indent />
                  <Separator className="my-1" />
                  <DRELine label="(=) LUCRO OPERACIONAL (EBITDA)" value={report.dre.ebitda} bold />

                  <div className="h-4" />

                  <DRELine label="(-) Outras Despesas/Receitas" value={-report.dre.outras} indent />
                  <Separator className="my-2 h-[2px] bg-foreground/10" />
                  <DRELine label="(=) LUCRO LÍQUIDO DO EXERCÍCIO" value={report.dre.lucroLiquido} primary bold highlight />
                </div>
              </div>

              <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-dashed border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Este relatório agrupa automaticamente suas categorias de despesas entre fixas e variáveis para facilitar a gestão.
                  Consulte seu contador para validação oficial.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function DRELine({ 
  label, 
  value, 
  indent = false, 
  bold = false, 
  primary = false, 
  subtext = false,
  highlight = false
}: { 
  label: string; 
  value: number | null; 
  indent?: boolean; 
  bold?: boolean; 
  primary?: boolean;
  subtext?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${highlight ? "bg-primary/5 px-2 rounded -mx-2" : ""}`}>
      <span className={cn(
        "text-sm",
        indent && "pl-8",
        bold && "font-bold",
        primary && "text-primary font-bold text-base",
        subtext && "text-xs text-muted-foreground italic -mt-1"
      )}>
        {label}
      </span>
      {value !== null && (
        <span className={cn(
          "font-mono text-sm",
          bold && "font-bold",
          primary && "text-primary font-bold text-base",
          value < 0 && !primary && "text-destructive"
        )}>
          {formatCurrency(value)}
        </span>
      )}
    </div>
  );
}
