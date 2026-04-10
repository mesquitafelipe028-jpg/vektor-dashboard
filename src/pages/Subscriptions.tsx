import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, RepeatIcon, Calendar, TrendingDown, RefreshCw, CheckCircle2, Wallet, CreditCard } from "lucide-react";
import { formatCurrency, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

type FrequenciaAssinatura = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual" | "semanal";

interface Assinatura {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  frequencia: FrequenciaAssinatura;
  dia_cobranca: number;
  categoria: string | null;
  ativa: boolean;
  cor: string | null;
  icone: string | null;
  created_at: string;
  payment_source_type?: "account" | "credit_card" | null;
  payment_source_id?: string | null;
  status?: "pending" | "paid";
  last_paid_month?: string | null;
}

type AssinaturaForm = {
  nome: string; valor: string; frequencia: FrequenciaAssinatura;
  dia_cobranca: string; categoria: string; ativa: boolean; cor: string;
  payment_source_type: "account" | "credit_card" | "";
  payment_source_id: string;
};

const emptyForm: AssinaturaForm = {
  nome: "", valor: "", frequencia: "mensal", dia_cobranca: "1",
  categoria: "Streaming", ativa: true, cor: "#8b5cf6",
  payment_source_type: "", payment_source_id: ""
};

const categorias = [
  "Streaming", "Música", "Jogos", "Produtividade", "Saúde", "Educação",
  "Seguro", "Assinatura de Software", "Contador/Financeiro", "Aluguel",
  "Plano de Celular", "Internet", "Energia", "Academia", "Outro",
];

const frequenciaLabels: Record<FrequenciaAssinatura, string> = {
  semanal: "Semanal", mensal: "Mensal", bimestral: "Bimestral",
  trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};

const frequenciaMeses: Record<FrequenciaAssinatura, number> = {
  semanal: 0.25, mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
};

function toMonthlyValue(valor: number, freq: FrequenciaAssinatura) {
  const m = frequenciaMeses[freq]; return m === 0 ? 0 : valor / m;
}

function toYearlyValue(valor: number, freq: FrequenciaAssinatura) {
  return toMonthlyValue(valor, freq) * 12;
}

function getDaysUntilNextCharge(diaCobranca: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(today.getFullYear(), today.getMonth(), diaCobranca);
  if (d <= today) d.setMonth(d.getMonth() + 1);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

const pastelColors = [
  "#8b5cf6","#6366f1","#3b82f6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#ec4899","#f97316","#84cc16",
];

async function migrateFromLocalStorage(userId: string) {
  const migKey = `vektor_assinaturas_migrated_v2_${userId}`;
  if (localStorage.getItem(migKey)) return;
  try {
    const raw = localStorage.getItem(`vektor_assinaturas_${userId}`);
    if (raw) {
      const items: Assinatura[] = JSON.parse(raw);
      if (items.length > 0) {
        const { count } = await supabase
          .from("radar_assinaturas").select("id", { count: "exact", head: true }).eq("user_id", userId);
        if ((count ?? 0) === 0) {
          await supabase.from("radar_assinaturas").insert(
            items.map(({ id, user_id, nome, valor, frequencia, dia_cobranca, categoria, ativa, cor, icone, created_at }) =>
              ({ id, user_id, nome, valor, frequencia, dia_cobranca, categoria, ativa, cor, icone, created_at }))
          );
        }
      }
    }
  } catch (e) { console.warn("[Subscriptions] migration error:", e); }
  finally { localStorage.setItem(migKey, "true"); }
}

export default function Subscriptions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { accounts } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssinaturaForm>(emptyForm);

  useEffect(() => { if (user?.id) migrateFromLocalStorage(user.id); }, [user?.id]);

  const { data: assinaturas = [], isLoading, refetch } = useQuery({
    queryKey: ["radar_assinaturas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_assinaturas").select("*")
        .eq("user_id", user!.id).order("created_at", { ascending: true });
      if (error) throw error;
      
      const currentMonth = getLocalDateString().slice(0, 7);
      return (data ?? []).map(a => ({
        ...a,
        status: a.last_paid_month === currentMonth ? a.status : "pending"
      })) as Assinatura[];
    },
    enabled: !!user, staleTime: 0, refetchOnWindowFocus: true,
  });

  const { data: cartoes = [] } = useQuery({
    queryKey: ["cartoes_credito", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartoes_credito").select("*").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`radar_assinaturas:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "radar_assinaturas", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["radar_assinaturas", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["radar_assinaturas", user?.id] });

  const saveAssinatura = useMutation({
    mutationFn: async () => {
      const valor = parseFloat(form.valor);
      if (!form.nome.trim() || !valor) throw new Error("Preencha os campos obrigatórios");
      const payload = {
        user_id: user!.id, nome: form.nome.trim(), valor,
        frequencia: form.frequencia, dia_cobranca: parseInt(form.dia_cobranca) || 1,
        categoria: form.categoria || null, ativa: form.ativa, cor: form.cor || "#8b5cf6", icone: null,
        payment_source_type: form.payment_source_type || null,
        payment_source_id: form.payment_source_id || null,
      };
      if (editingId) {
        const { error } = await supabase.from("radar_assinaturas").update(payload).eq("id", editingId).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("radar_assinaturas").insert({ ...payload, created_at: getLocalDateString() });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editingId ? "Assinatura atualizada!" : "Assinatura registrada!"); invalidate(); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAssinatura = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("radar_assinaturas").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assinatura removida!"); invalidate(); },
    onError: () => toast.error("Erro ao remover"),
  });

  const toggleActiva = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from("radar_assinaturas").update({ ativa: !ativa }).eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const closeDialog = useCallback(() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }, []);
  const openEdit = (a: Assinatura) => {
    setEditingId(a.id);
    setForm({ 
      nome: a.nome, valor: String(a.valor), frequencia: a.frequencia, dia_cobranca: String(a.dia_cobranca), 
      categoria: a.categoria ?? "Outro", ativa: a.ativa, cor: a.cor ?? "#8b5cf6",
      payment_source_type: a.payment_source_type ?? "",
      payment_source_id: a.payment_source_id ?? ""
    });
    setDialogOpen(true);
  };

  const markAsPaid = useMutation({
    mutationFn: async (a: Assinatura) => {
      if (!a.payment_source_id || !a.payment_source_type) {
        throw new Error("Edite a assinatura e defina a origem de pagamento antes de pagar.");
      }
      
      const thisMonth = getLocalDateString().slice(0, 7); // YYYY-MM
      const startOfMonth = `${thisMonth}-01`;
      const endOfMonth = `${thisMonth}-31`; 

      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference_id", a.id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .limit(1);
        
      if (existing && existing.length > 0) {
        throw new Error("Já existe um pagamento para o mês atual.");
      }

      const tPayload = {
        user_id: user!.id,
        amount: a.valor,
        date: getLocalDateString(),
        description: `Ref: ${a.nome}`,
        category: a.categoria ?? "Assinaturas",
        status: "confirmed",
        type: "expense",
        subtype: a.payment_source_type === "credit_card" ? "credit_card_expense" : null,
        account_id: a.payment_source_id,
        reference_id: a.id
      };

      const { error: tError } = await supabase.from("transactions").insert([tPayload]);
      if (tError) throw tError;

      // Injeta também no legado de cartões para refletir na fatura visual (CreditCards.tsx)
      if (a.payment_source_type === "credit_card") {
        const cPayload = {
          user_id: user!.id,
          cartao_id: a.payment_source_id,
          descricao: `Assinatura: ${a.nome}`,
          valor: a.valor,
          data: getLocalDateString(),
          categoria: a.categoria ?? "Assinaturas"
        };
        const { error: cError } = await supabase.from("compras_cartao").insert([cPayload]);
        if (cError) {
           console.error("Não foi possível espelhar na fatura:", cError);
        }
      }

      const { error: aError } = await supabase
        .from("radar_assinaturas")
        .update({ status: "paid", last_paid_month: thisMonth })
        .eq("id", a.id);
      if (aError) throw aError;
    },
    onSuccess: () => {
      toast.success("Assinatura marcada como paga!");
      invalidate();
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const ativas = assinaturas.filter((a) => a.ativa);
    const totalMensal = ativas.reduce((s, a) => s + toMonthlyValue(a.valor, a.frequencia), 0);
    const nextCharges = ativas.map((a) => ({ ...a, daysLeft: getDaysUntilNextCharge(a.dia_cobranca) })).sort((a, b) => a.daysLeft - b.daysLeft);
    const byCategory = ativas.reduce<Record<string, number>>((acc, a) => {
      const cat = a.categoria ?? "Outro"; acc[cat] = (acc[cat] || 0) + toMonthlyValue(a.valor, a.frequencia); return acc;
    }, {});
    return { ativas, totalMensal, totalAnual: totalMensal * 12, nextCharges, byCategory };
  }, [assinaturas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <RepeatIcon className="h-6 w-6 text-primary" /> Radar de Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground">Controle de serviços e contratos recorrentes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} title="Sincronizar">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Assinatura</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total / Mês", value: formatCurrency(stats.totalMensal), icon: "💸", color: "text-destructive" },
          { label: "Total / Ano", value: formatCurrency(stats.totalAnual), icon: "📅", color: "text-destructive" },
          { label: "Ativas", value: `${stats.ativas.length}`, icon: "✅", color: "text-emerald-600" },
          { label: "Pausadas", value: `${assinaturas.filter((a) => !a.ativa).length}`, icon: "⏸️", color: "text-muted-foreground" },
        ].map((item) => (
          <Card key={item.label}><CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xl">{item.icon}</span>
            <span className={`font-heading font-bold text-lg ${item.color}`}>{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </CardContent></Card>
        ))}
      </div>

      {stats.nextCharges.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Próximas Cobranças</CardTitle></CardHeader>
          <CardContent><div className="space-y-3">
            {stats.nextCharges.slice(0, 5).map((a) => {
              const urgency = a.daysLeft <= 3 ? "destructive" : a.daysLeft <= 7 ? "warning" : "neutral";
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs" style={{ backgroundColor: a.cor ?? "#8b5cf6" }}>{a.nome.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{a.nome}</p><p className="text-xs text-muted-foreground">{a.categoria}</p></div>
                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-sm">{formatCurrency(a.valor)}</p>
                    <Badge variant="outline" className={`text-[10px] ${urgency === "destructive" ? "bg-destructive/10 text-destructive border-destructive/20" : urgency === "warning" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground"}`}>
                      {a.daysLeft === 0 ? "Hoje!" : a.daysLeft === 1 ? "Amanhã" : `em ${a.daysLeft} dias`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div></CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Card key={i} className="h-40 animate-pulse bg-muted/30" />)}
        </div>
      ) : assinaturas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RepeatIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">Nenhuma assinatura registrada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">Cadastre Netflix, Spotify, contador, plano de saúde e outros serviços recorrentes para monitorar automaticamente.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Adicionar Assinatura</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assinaturas.map((a, i) => {
            const daysLeft = getDaysUntilNextCharge(a.dia_cobranca);
            const monthlyVal = toMonthlyValue(a.valor, a.frequencia);
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`relative overflow-hidden ${!a.ativa ? "opacity-60" : ""}`}>
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: a.cor ?? "#8b5cf6" }} />
                  <CardContent className="p-4 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: a.cor ?? "#8b5cf6" }}>{a.nome.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-sm leading-tight truncate">{a.nome}</p>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            {a.payment_source_type === "credit_card" ? <CreditCard className="h-3 w-3" /> : a.payment_source_type === "account" ? <Wallet className="h-3 w-3" /> : null}
                            <span className="truncate">{a.payment_source_type === "credit_card" ? cartoes.find((c: any) => c.id === a.payment_source_id)?.nome : a.payment_source_type === "account" ? accounts.find((acc: any) => acc.id === a.payment_source_id)?.nome : (a.categoria || "—")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remover assinatura?</AlertDialogTitle><AlertDialogDescription>"{a.nome}" será removida do radar permanentemente.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteAssinatura.mutate(a.id)} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">{frequenciaLabels[a.frequencia]}</span><span className="font-heading font-bold">{formatCurrency(a.valor)}</span></div>
                      <div className="flex justify-between text-xs text-muted-foreground"><span>≈ {formatCurrency(monthlyVal)}/mês</span><span>Dia {a.dia_cobranca}</span></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] cursor-pointer transition-colors ${a.ativa ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} onClick={() => toggleActiva.mutate({ id: a.id, ativa: a.ativa })}>
                          {a.ativa ? "✓ Ativa" : "⏸ Pausada"}
                        </Badge>
                        {a.ativa && a.status === "paid" && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Pago</Badge>
                        )}
                        {a.ativa && a.status !== "paid" && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Pendente</Badge>
                        )}
                      </div>
                      {a.ativa && <span className={`text-[10px] font-medium ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>{daysLeft === 0 ? "Cobrado hoje!" : `Próx. em ${daysLeft}d`}</span>}
                    </div>
                    {a.ativa && a.status !== "paid" && (
                      <Button className="w-full mt-3 h-8 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white" variant="ghost" onClick={() => markAsPaid.mutate(a)} disabled={markAsPaid.isPending}>
                         <CheckCircle2 className="h-3 w-3 mr-1.5" /> Marcar como pago
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /> Gasto Mensal por Categoria</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
              const pct = stats.totalMensal > 0 ? (val / stats.totalMensal) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">{cat}</span><span className="font-semibold">{formatCurrency(val)}/mês</span></div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Assinatura" : "Nova Assinatura"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome do Serviço *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Netflix, Spotify, Contador" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 39.90" /></div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.frequencia} onValueChange={(v) => setForm({ ...form, frequencia: v as FrequenciaAssinatura })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(frequenciaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Dia de Cobrança</Label><Input type="number" min="1" max="31" value={form.dia_cobranca} onChange={(e) => setForm({ ...form, dia_cobranca: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cobrar de (Opcional)</Label>
                <Select value={form.payment_source_type || "none"} onValueChange={(v) => {
                   if (v === "none") setForm({ ...form, payment_source_type: "", payment_source_id: "" });
                   else setForm({ ...form, payment_source_type: v as any, payment_source_id: "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Fonte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não vincular</SelectItem>
                    <SelectItem value="account">Conta Corrente</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conta/Cartão ID</Label>
                <Select disabled={!form.payment_source_type} value={form.payment_source_id} onValueChange={(v) => setForm({ ...form, payment_source_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {form.payment_source_type === "account" && accounts.filter((a: any) => a.tipo !== "cartao").map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                    {form.payment_source_type === "credit_card" && cartoes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor do Card</Label>
              <div className="flex gap-2 flex-wrap">
                {pastelColors.map((color) => (
                  <button key={color} type="button" className={`h-7 w-7 rounded-full transition-transform border-2 ${form.cor === color ? "scale-125 border-foreground" : "border-transparent"}`} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, cor: color })} />
                ))}
              </div>
            </div>
            {form.valor && form.frequencia && (
              <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                <p className="font-medium">Impacto estimado:</p>
                <p className="text-muted-foreground">Mensal: <span className="font-semibold text-foreground">{formatCurrency(toMonthlyValue(parseFloat(form.valor) || 0, form.frequencia))}</span>{" · "}Anual: <span className="font-semibold text-foreground">{formatCurrency(toYearlyValue(parseFloat(form.valor) || 0, form.frequencia))}</span></p>
              </div>
            )}
            <Button className="w-full" onClick={() => saveAssinatura.mutate()} disabled={saveAssinatura.isPending}>
              {saveAssinatura.isPending ? "Salvando..." : "Salvar Assinatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
