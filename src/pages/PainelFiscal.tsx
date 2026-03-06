import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Receipt, AlertTriangle, Check, ExternalLink,
  Calendar, Clock, Shield, FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import { toast } from "sonner";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const LIMITE_MEI = 81000;
const DAS_VALOR_PADRAO = 71.60;

interface Imposto {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: string;
  user_id: string;
}

function getEffectiveStatus(imp: Imposto): "pago" | "pendente" | "vencido" {
  if (imp.status === "pago") return "pago";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const venc = new Date(imp.vencimento + "T12:00:00");
  venc.setHours(0, 0, 0, 0);
  return venc < today ? "vencido" : "pendente";
}

export default function PainelFiscal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: impostos = [], isLoading } = useQuery({
    queryKey: ["impostos_mei"],
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

  const togglePagoMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "pago" ? "pendente" : "pago";
      const { error } = await supabase
        .from("impostos_mei")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostos_mei"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const faturamentoAnual = receitas
    .filter((r: any) => r.data.startsWith(currentYear))
    .reduce((s: number, r: any) => s + r.valor, 0);
  const limiteDisponivel = Math.max(LIMITE_MEI - faturamentoAnual, 0);
  const percentLimit = Math.min((faturamentoAnual / LIMITE_MEI) * 100, 100);

  // Current month DAS
  const dasDoMes = useMemo(() => {
    return impostos.find((imp) => imp.competencia.toLowerCase().includes(
      now.toLocaleDateString("pt-BR", { month: "long" }).toLowerCase()
    ) || imp.vencimento.startsWith(currentMonth));
  }, [impostos, currentMonth]);

  const vencimentoDAS = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 20);
    return d.toLocaleDateString("pt-BR");
  }, [now]);

  // Status color helpers
  const situacaoColor = (situacao: string) => {
    const s = situacao?.toLowerCase() || "";
    if (s.includes("ativa")) return { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" };
    if (s.includes("inapt")) return { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/30", dot: "bg-destructive" };
    return { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" };
  };

  const statusConfig = {
    pago: { label: "Pago", class: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400", icon: "✔" },
    pendente: { label: "Pendente", class: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400", icon: "⏳" },
    vencido: { label: "Vencido", class: "bg-destructive/15 text-destructive border-destructive/30", icon: "⚠" },
  };

  // Empty state — no CNPJ connected
  if (!empresa) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Painel Fiscal MEI</h1>
          <p className="text-muted-foreground text-sm">Acompanhe a situação fiscal do seu MEI</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-heading text-lg font-semibold mb-2">Conecte seu CNPJ</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Conecte seu CNPJ para visualizar informações fiscais do seu MEI, acompanhar o limite de faturamento e gerenciar seus impostos.
              </p>
              <Button onClick={() => navigate("/configuracoes")}>
                <Building2 className="mr-2 h-4 w-4" />
                Conectar CNPJ
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const sitColor = situacaoColor(empresa.situacao_cadastral || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Painel Fiscal MEI</h1>
        <p className="text-muted-foreground text-sm">Acompanhe a situação fiscal do seu MEI</p>
      </div>

      {/* CARD 1 — Situação do CNPJ */}
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
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${sitColor.bg} shrink-0`}>
                <Shield className={`h-7 w-7 ${sitColor.text}`} />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-semibold text-base">
                    {empresa.razao_social || empresa.nome_fantasia || "Empresa"}
                  </h3>
                  <Badge variant="outline" className={`${sitColor.bg} ${sitColor.text} ${sitColor.border}`}>
                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${sitColor.dot}`} />
                    {empresa.situacao_cadastral || "—"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">CNPJ:</span>{" "}
                    <span className="font-medium font-mono">
                      {empresa.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Abertura:</span>{" "}
                    <span className="font-medium">
                      {empresa.data_abertura
                        ? new Date(empresa.data_abertura + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">CNAE Principal:</span>{" "}
                    <span className="font-medium">{empresa.cnae_principal || "—"}</span>
                  </div>
                  {empresa.natureza_juridica && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Atividade:</span>{" "}
                      <span className="font-medium">{empresa.natureza_juridica}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CARD 2 — Limite anual do MEI */}
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
                <p className="text-2xl sm:text-3xl font-heading font-bold">
                  {formatCurrency(faturamentoAnual)} <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(LIMITE_MEI)}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Disponível: <span className="font-semibold text-primary">{formatCurrency(limiteDisponivel)}</span>
                </p>
              </div>
              <span className={`text-lg font-heading font-bold ${percentLimit >= 80 ? "text-amber-600" : "text-primary"}`}>
                {percentLimit.toFixed(1)}%
              </span>
            </div>

            <div className="relative">
              <Progress value={percentLimit} className="h-4" />
              <div className="absolute top-0 h-4 border-l-2 border-amber-500/70" style={{ left: "80%" }} />
            </div>

            {percentLimit >= 80 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {percentLimit >= 100
                    ? "Seu faturamento ultrapassou o limite anual do MEI. Considere migrar de categoria."
                    : `Atenção: ${percentLimit.toFixed(1)}% do limite utilizado. Planeje seus recebimentos.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* CARD 3 — Imposto MEI do mês (DAS) */}
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
                <p className="text-2xl font-heading font-bold text-primary">
                  {formatCurrency(dasDoMes?.valor ?? DAS_VALOR_PADRAO)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-4 space-y-1">
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-heading font-semibold">{vencimentoDAS}</p>
                </div>
                <p className="text-xs text-muted-foreground">Todo dia 20 do mês</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                onClick={() => window.open("https://www8.receita.fazenda.gov.br/simplesnacional/", "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Gerar DAS
              </Button>
              {dasDoMes && getEffectiveStatus(dasDoMes) !== "pago" ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    togglePagoMutation.mutate({
                      id: dasDoMes.id,
                      currentStatus: dasDoMes.status,
                    })
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marcar como Pago
                </Button>
              ) : !dasDoMes ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/impostos")}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Registrar Guia
                </Button>
              ) : (
                <div className="flex-1 flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium py-2">
                  <Check className="mr-2 h-4 w-4" /> DAS pago este mês
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CARD 4 — Histórico de pagamentos */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/impostos")}>
              Ver tudo
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Carregando...</p>
            ) : impostos.length === 0 ? (
              <div className="py-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma guia DAS registrada ainda.</p>
                <Button size="sm" variant="link" onClick={() => navigate("/impostos")}>
                  Registrar primeira guia
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {impostos.slice(0, 12).map((imp, i) => {
                  const effStatus = getEffectiveStatus(imp);
                  const cfg = statusConfig[effStatus];
                  return (
                    <motion.div
                      key={imp.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base">{cfg.icon}</span>
                        <span className="font-medium text-sm truncate">{imp.competencia}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs cursor-pointer ${cfg.class}`}
                          onClick={() =>
                            togglePagoMutation.mutate({
                              id: imp.id,
                              currentStatus: effStatus === "vencido" ? "pendente" : imp.status,
                            })
                          }
                        >
                          {cfg.label}
                        </Badge>
                        {effStatus === "pago" && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(imp.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
