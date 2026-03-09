import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt, AlertTriangle, Check, Plus, Pencil, Trash2, Clock,
  TrendingUp, DollarSign, Target, ShieldAlert, Lightbulb,
  Building2, ExternalLink, Calendar, Shield, FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  LIMITE_MEI, DAS_VALOR_PADRAO, DAS_CONFIG, type ActivityType,
  type Imposto, getEffectiveStatus, statusConfig, alertColorMap, situacaoColor,
} from "@/lib/fiscal";

export default function Taxes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState("71.60");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>("comercio");

  // ── Queries ──────────────────────────────────────────
  const { data: empresa } = useQuery({
    queryKey: ["empresa", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("empresas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: impostos = [], isLoading } = useQuery({
    queryKey: ["impostos_mei", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impostos_mei")
        .select("*")
        .order("vencimento", { ascending: false });
      if (error) throw error;
      return data as Imposto[];
    },
    enabled: !!user,
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Computed values ──────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const receitasAno = receitas.filter((r: any) => r.data.startsWith(currentYear));
  const faturamentoAnual = receitasAno.reduce((s: number, r: any) => s + r.valor, 0);
  const limiteDisponivel = Math.max(LIMITE_MEI - faturamentoAnual, 0);
  const percentLimit = Math.min((faturamentoAnual / LIMITE_MEI) * 100, 100);

  const faturamentoMes = receitas
    .filter((r: any) => r.data.startsWith(currentMonth))
    .reduce((s: number, r: any) => s + r.valor, 0);

  const dasEstimado = DAS_CONFIG[activityType].total;

  const dasDoMes = useMemo(() => {
    return impostos.find((imp) => imp.competencia.toLowerCase().includes(
      now.toLocaleDateString("pt-BR", { month: "long" }).toLowerCase()
    ) || imp.vencimento.startsWith(currentMonth));
  }, [impostos, currentMonth]);

  const vencimentoDAS = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 20);
    return d.toLocaleDateString("pt-BR");
  }, [now]);

  const monthlyChartData = useMemo(() => {
    const months: { month: string; label: string; faturamento: number; acumulado: number }[] = [];
    let acumulado = 0;
    for (let m = 0; m < 12; m++) {
      const key = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const d = new Date(parseInt(currentYear), m);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const faturamento = receitas
        .filter((r: any) => r.data.startsWith(key))
        .reduce((s: number, r: any) => s + r.valor, 0);
      acumulado += faturamento;
      months.push({ month: key, label: label.charAt(0).toUpperCase() + label.slice(1), faturamento, acumulado });
    }
    return months;
  }, [receitas, currentYear]);

  const limitAlerts = useMemo(() => {
    const alerts: { type: "warning" | "danger" | "critical"; message: string; icon: typeof AlertTriangle }[] = [];
    if (percentLimit >= 100) {
      alerts.push({ type: "critical", message: "⚠️ Seu faturamento ultrapassou o limite anual do MEI (R$ 81.000). Você precisa migrar para outra categoria empresarial.", icon: ShieldAlert });
    } else if (percentLimit >= 90) {
      alerts.push({ type: "danger", message: `Atenção: seu faturamento atingiu ${percentLimit.toFixed(1)}% do limite anual do MEI. Faltam apenas ${formatCurrency(LIMITE_MEI - faturamentoAnual)}.`, icon: AlertTriangle });
    } else if (percentLimit >= 80) {
      alerts.push({ type: "warning", message: `Seu faturamento está próximo do limite anual do MEI (${percentLimit.toFixed(1)}%). Planeje-se para não ultrapassar.`, icon: AlertTriangle });
    }
    return alerts;
  }, [percentLimit, faturamentoAnual]);

  const alertasVencimento = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);
    return impostos.filter((imp) => {
      if (imp.status === "pago") return false;
      const venc = new Date(imp.vencimento + "T12:00:00");
      venc.setHours(0, 0, 0, 0);
      return venc >= today && venc <= limit;
    });
  }, [impostos]);

  const smartMessage = useMemo(() => {
    if (percentLimit >= 100) return null;
    if (percentLimit >= 80) return "Atenção: seu faturamento está próximo do limite anual do MEI. Considere planejar seus recebimentos para o próximo ano.";
    const monthsRemaining = 12 - now.getMonth();
    if (monthsRemaining > 0 && faturamentoAnual > 0) {
      const avgMonthly = faturamentoAnual / (now.getMonth() + 1);
      const projected = faturamentoAnual + avgMonthly * monthsRemaining;
      if (projected > LIMITE_MEI) return `Com base no seu faturamento médio mensal de ${formatCurrency(avgMonthly)}, a projeção anual é de ${formatCurrency(projected)}. Isso ultrapassa o limite MEI.`;
    }
    return null;
  }, [percentLimit, faturamentoAnual, now]);

  // ── Mutations ────────────────────────────────────────
  const resetForm = () => { setCompetencia(""); setVencimento(""); setValor(String(dasEstimado)); setEditingId(null); };

  const openEdit = (imp: Imposto) => { setEditingId(imp.id); setCompetencia(imp.competencia); setVencimento(imp.vencimento); setValor(String(imp.valor)); setOpen(true); };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("impostos_mei").update({ competencia, vencimento, valor: parseFloat(valor) }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("impostos_mei").insert({ competencia, vencimento, valor: parseFloat(valor), user_id: user!.id, status: "pendente" });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["impostos_mei"] }); toast.success(editingId ? "Guia atualizada" : "Guia DAS adicionada"); setOpen(false); resetForm(); },
    onError: () => toast.error("Erro ao salvar guia"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("impostos_mei").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["impostos_mei"] }); toast.success("Guia excluída"); setDeleteId(null); },
    onError: () => toast.error("Erro ao excluir"),
  });

  const togglePagoMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "pago" ? "pendente" : "pago";
      const { error } = await supabase.from("impostos_mei").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["impostos_mei"] }); toast.success("Status atualizado"); },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const sitColor = empresa ? situacaoColor(empresa.situacao_cadastral || "") : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Área Fiscal MEI</h1>
          <p className="text-muted-foreground text-sm">Gerencie impostos e situação fiscal do seu MEI</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Guia</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Guia DAS" : "Adicionar Guia DAS"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Competência</Label>
                <Input placeholder="Ex: Março/2026" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!competencia || !vencimento || createMutation.isPending}>
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Global Alerts */}
      {limitAlerts.map((alert, i) => (
        <Alert key={i} variant="destructive" className={alertColorMap[alert.type]}>
          <alert.icon className="h-4 w-4" />
          <AlertTitle className="font-heading">{alert.type === "critical" ? "Limite ultrapassado!" : "Atenção ao limite MEI"}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      {alertasVencimento.length > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-heading">Vencimento próximo!</AlertTitle>
          <AlertDescription>
            {alertasVencimento.length === 1
              ? `A guia de ${alertasVencimento[0].competencia} vence em ${new Date(alertasVencimento[0].vencimento + "T12:00:00").toLocaleDateString("pt-BR")}.`
              : `${alertasVencimento.length} guias vencem nos próximos 7 dias.`}
          </AlertDescription>
        </Alert>
      )}

      {smartMessage && (
        <Alert className="border-chart-3/50 bg-chart-3/5 text-chart-3 [&>svg]:text-chart-3">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle className="font-heading">Insight</AlertTitle>
          <AlertDescription>{smartMessage}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="guias-das">Guias DAS</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Visão Geral ─── */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* CNPJ Card */}
          {empresa ? (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Situação do CNPJ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${sitColor!.bg} shrink-0`}>
                      <Shield className={`h-7 w-7 ${sitColor!.text}`} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-semibold text-base">{empresa.razao_social || empresa.nome_fantasia || "Empresa"}</h3>
                        <Badge variant="outline" className={`${sitColor!.bg} ${sitColor!.text} ${sitColor!.border}`}>
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${sitColor!.dot}`} />
                          {empresa.situacao_cadastral || "—"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div><span className="text-muted-foreground">CNPJ:</span>{" "}<span className="font-medium font-mono">{empresa.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || "—"}</span></div>
                        <div><span className="text-muted-foreground">Abertura:</span>{" "}<span className="font-medium">{empresa.data_abertura ? new Date(empresa.data_abertura + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
                        <div className="sm:col-span-2"><span className="text-muted-foreground">CNAE Principal:</span>{" "}<span className="font-medium">{empresa.cnae_principal || "—"}</span></div>
                        {empresa.natureza_juridica && (<div className="sm:col-span-2"><span className="text-muted-foreground">Atividade:</span>{" "}<span className="font-medium">{empresa.natureza_juridica}</span></div>)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="font-heading text-lg font-semibold mb-2">Conecte seu CNPJ</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Conecte seu CNPJ para visualizar informações fiscais do seu MEI.</p>
                  <Button onClick={() => navigate("/configuracoes")}><Building2 className="mr-2 h-4 w-4" />Conectar CNPJ</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Limite Anual */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className={percentLimit >= 80 ? "border-amber-500/40" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Limite Anual MEI {currentYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  <div>
                    <p className="text-2xl sm:text-3xl font-heading font-bold">{formatCurrency(faturamentoAnual)} <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(LIMITE_MEI)}</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Disponível: <span className="font-semibold text-primary">{formatCurrency(limiteDisponivel)}</span></p>
                  </div>
                  <span className={`text-lg font-heading font-bold ${percentLimit >= 80 ? "text-amber-600" : "text-primary"}`}>{percentLimit.toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <Progress value={percentLimit} className="h-4" />
                  <div className="absolute top-0 h-4 border-l-2 border-amber-500/70" style={{ left: "80%" }} />
                  <div className="absolute top-0 h-4 border-l-2 border-destructive/70" style={{ left: "90%" }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>0%</span><span className="text-amber-600">80%</span><span className="text-destructive">90%</span><span>100%</span>
                </div>
                {percentLimit >= 80 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {percentLimit >= 100 ? "Seu faturamento ultrapassou o limite anual do MEI. Considere migrar de categoria." : `Atenção: ${percentLimit.toFixed(1)}% do limite utilizado. Planeje seus recebimentos.`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* DAS do Mês */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Imposto MEI do Mês (DAS)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/50 p-4 space-y-1">
                    <p className="text-sm text-muted-foreground">Valor estimado do DAS</p>
                    <p className="text-2xl font-heading font-bold text-primary">{formatCurrency(dasDoMes?.valor ?? DAS_VALOR_PADRAO)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-4 space-y-1">
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><p className="text-lg font-heading font-semibold">{vencimentoDAS}</p></div>
                    <p className="text-xs text-muted-foreground">Todo dia 20 do mês</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1" onClick={() => window.open("https://www8.receita.fazenda.gov.br/simplesnacional/", "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />Gerar DAS
                  </Button>
                  {dasDoMes && getEffectiveStatus(dasDoMes) !== "pago" ? (
                    <Button variant="outline" className="flex-1" onClick={() => togglePagoMutation.mutate({ id: dasDoMes.id, currentStatus: dasDoMes.status })}>
                      <Check className="mr-2 h-4 w-4" />Marcar como Pago
                    </Button>
                  ) : !dasDoMes ? null : (
                    <div className="flex-1 flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium py-2">
                      <Check className="mr-2 h-4 w-4" /> DAS pago este mês
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Histórico Resumido */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Histórico Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Carregando...</p>
                ) : impostos.length === 0 ? (
                  <div className="py-8 text-center">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma guia DAS registrada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {impostos.slice(0, 6).map((imp, i) => {
                      const effStatus = getEffectiveStatus(imp);
                      const cfg = statusConfig[effStatus];
                      return (
                        <motion.div key={imp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-base">{cfg.icon}</span>
                            <span className="font-medium text-sm truncate">{imp.competencia}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className={`text-xs cursor-pointer ${cfg.class}`} onClick={() => togglePagoMutation.mutate({ id: imp.id, currentStatus: effStatus === "vencido" ? "pendente" : imp.status })}>{cfg.label}</Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── TAB 2: Guias DAS ─── */}
        <TabsContent value="guias-das" className="space-y-6">
          {/* Activity Type Selector */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm">Tipo de Atividade MEI</Label>
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DAS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>INSS: {formatCurrency(DAS_CONFIG[activityType].inss)}</p>
                  {DAS_CONFIG[activityType].icms > 0 && <p>ICMS: {formatCurrency(DAS_CONFIG[activityType].icms)}</p>}
                  {DAS_CONFIG[activityType].iss > 0 && <p>ISS: {formatCurrency(DAS_CONFIG[activityType].iss)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DAS Control List */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Controle do DAS</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : impostos.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Receipt className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-heading font-semibold mb-1">Nenhuma guia DAS cadastrada</p>
                  <p className="text-sm text-muted-foreground mb-4">Clique em "Nova Guia" para registrar seus pagamentos do DAS.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {impostos.map((m, i) => {
                    const effStatus = getEffectiveStatus(m);
                    const cfg = statusConfig[effStatus];
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${effStatus === "pago" ? "bg-emerald-500" : effStatus === "vencido" ? "bg-destructive" : "bg-amber-500"}`} />
                          <div>
                            <span className="font-medium">{m.competencia}</span>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Vence: {new Date(m.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCurrency(m.valor)}</span>
                          <Badge variant="outline" className={`cursor-pointer ${cfg.class}`} onClick={() => togglePagoMutation.mutate({ id: m.id, currentStatus: effStatus === "vencido" ? "pendente" : m.status })}>
                            {effStatus === "pago" && <Check className="mr-1 h-3 w-3" />}{cfg.label}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Faturamento ─── */}
        <TabsContent value="faturamento" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Faturamento do Mês", value: formatCurrency(faturamentoMes), icon: TrendingUp, color: "text-primary" },
              { label: "DAS Estimado", value: formatCurrency(dasEstimado), icon: Receipt, color: "text-accent" },
              { label: "Faturamento Anual", value: formatCurrency(faturamentoAnual), icon: DollarSign, color: "text-chart-3" },
              { label: "Limite Utilizado", value: `${percentLimit.toFixed(1)}%`, icon: Target, color: percentLimit >= 80 ? "text-destructive" : "text-primary" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <p className="font-heading text-2xl font-bold">{s.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Limit Progress */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Limite Anual MEI</span>
                <span className="text-sm text-muted-foreground">{formatCurrency(faturamentoAnual)} / {formatCurrency(LIMITE_MEI)}</span>
              </div>
              <div className="relative">
                <Progress value={percentLimit} className="h-4" />
                <div className="absolute top-0 h-4 border-l-2 border-amber-500/70" style={{ left: "80%" }} />
                <div className="absolute top-0 h-4 border-l-2 border-destructive/70" style={{ left: "90%" }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>0%</span><span className="text-amber-600">80%</span><span className="text-destructive">90%</span><span>100%</span>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Faturamento Acumulado vs Limite MEI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === "faturamento" ? "Mensal" : "Acumulado"]} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Faturamento Mensal" fill="hsl(160, 60%, 38%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="acumulado" name="Acumulado" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} />
                    <ReferenceLine y={LIMITE_MEI} stroke="hsl(0, 72%, 51%)" strokeDasharray="6 4" strokeWidth={2} label={{ value: "Limite MEI", position: "top", fill: "hsl(0, 72%, 51%)", fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guia DAS?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
