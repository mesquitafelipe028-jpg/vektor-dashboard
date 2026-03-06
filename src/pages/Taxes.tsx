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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, AlertTriangle, Check, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

const LIMITE_MEI = 81000;

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

export default function Taxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState("71.60");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: impostos = [], isLoading } = useQuery({
    queryKey: ["impostos_mei"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impostos_mei")
        .select("*")
        .order("vencimento", { ascending: true });
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

  const currentYear = new Date().getFullYear().toString();
  const faturamentoAnual = receitas
    .filter((r: any) => r.data.startsWith(currentYear))
    .reduce((s: number, r: any) => s + r.valor, 0);
  const percentLimit = Math.min((faturamentoAnual / LIMITE_MEI) * 100, 100);

  // Guias próximas do vencimento (7 dias)
  const alertas = useMemo(() => {
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

  const resetForm = () => {
    setCompetencia("");
    setVencimento("");
    setValor("71.60");
    setEditingId(null);
  };

  const openEdit = (imp: Imposto) => {
    setEditingId(imp.id);
    setCompetencia(imp.competencia);
    setVencimento(imp.vencimento);
    setValor(String(imp.valor));
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("impostos_mei")
          .update({ competencia, vencimento, valor: parseFloat(valor) })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("impostos_mei").insert({
          competencia,
          vencimento,
          valor: parseFloat(valor),
          user_id: user!.id,
          status: "pendente",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostos_mei"] });
      toast.success(editingId ? "Guia atualizada" : "Guia DAS adicionada");
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar guia"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impostos_mei").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostos_mei"] });
      toast.success("Guia excluída");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir"),
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

  const dasValue = impostos.length > 0 ? impostos[0].valor : 71.60;

  const statusConfig = {
    pago: { label: "Pago", class: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
    pendente: { label: "Pendente", class: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400" },
    vencido: { label: "Vencido", class: "bg-destructive/15 text-destructive border-destructive/30" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Impostos MEI</h1>
          <p className="text-muted-foreground text-sm">Controle do DAS e limite de faturamento</p>
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

      {/* Alerta de vencimento próximo */}
      {alertas.length > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-heading">Vencimento próximo!</AlertTitle>
          <AlertDescription>
            {alertas.length === 1
              ? `A guia de ${alertas[0].competencia} vence em ${new Date(alertas[0].vencimento + "T12:00:00").toLocaleDateString("pt-BR")}.`
              : `${alertas.length} guias vencem nos próximos 7 dias: ${alertas.map((a) => a.competencia).join(", ")}.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">DAS Mensal</p>
                <p className="text-2xl font-bold font-heading">{formatCurrency(dasValue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Valor fixo mensal para MEI (Comércio e Serviços)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`h-6 w-6 ${percentLimit > 80 ? "text-destructive" : "text-accent"}`} />
              <div>
                <p className="text-sm text-muted-foreground">Limite Anual MEI</p>
                <p className="text-2xl font-bold font-heading">
                  {formatCurrency(faturamentoAnual)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(LIMITE_MEI)}</span>
                </p>
              </div>
            </div>
            <Progress value={percentLimit} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{percentLimit.toFixed(1)}% do limite utilizado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Controle do DAS</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : impostos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma guia cadastrada. Clique em "Nova Guia" para começar.</p>
          ) : (
            <div className="space-y-1">
              {impostos.map((m, i) => {
                const effStatus = getEffectiveStatus(m);
                const cfg = statusConfig[effStatus];
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${effStatus === "pago" ? "bg-emerald-500" : effStatus === "vencido" ? "bg-destructive" : "bg-amber-500"}`} />
                      <div>
                        <span className="font-medium">{m.competencia}</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Vence: {new Date(m.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(m.valor)}</span>
                      <Badge
                        variant="outline"
                        className={`cursor-pointer ${cfg.class}`}
                        onClick={() => togglePagoMutation.mutate({ id: m.id, currentStatus: effStatus === "vencido" ? "pendente" : m.status })}
                      >
                        {effStatus === "pago" && <Check className="mr-1 h-3 w-3" />}
                        {cfg.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guia DAS?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. A guia será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
