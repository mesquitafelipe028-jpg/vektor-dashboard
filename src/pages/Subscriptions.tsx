import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, RepeatIcon, AlertTriangle, Calendar, TrendingDown } from "lucide-react";
import { formatCurrency, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Types ──────────────────────────────────────────────────────

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
}

type AssinaturaForm = {
  nome: string;
  valor: string;
  frequencia: FrequenciaAssinatura;
  dia_cobranca: string;
  categoria: string;
  ativa: boolean;
  cor: string;
};

const emptyForm: AssinaturaForm = {
  nome: "",
  valor: "",
  frequencia: "mensal",
  dia_cobranca: "1",
  categoria: "Streaming",
  ativa: true,
  cor: "#8b5cf6",
};

const categorias = [
  "Streaming", "Música", "Jogos", "Produtividade", "Saúde", "Educação",
  "Seguro", "Assinatura de Software", "Contador/Financeiro", "Aluguel",
  "Plano de Celular", "Internet", "Energia", "Academia", "Outro",
];

const frequenciaLabels: Record<FrequenciaAssinatura, string> = {
  semanal: "Semanal",
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const frequenciaMeses: Record<FrequenciaAssinatura, number> = {
  semanal: 0.25,
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

function toMonthlyValue(valor: number, freq: FrequenciaAssinatura): number {
  const meses = frequenciaMeses[freq];
  if (meses === 0) return 0;
  return valor / meses;
}

function toYearlyValue(valor: number, freq: FrequenciaAssinatura): number {
  const monthlyEquiv = toMonthlyValue(valor, freq);
  return monthlyEquiv * 12;
}

function getDaysUntilNextCharge(diaCobranca: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisCycleDate = new Date(today.getFullYear(), today.getMonth(), diaCobranca);
  if (thisCycleDate <= today) {
    thisCycleDate.setMonth(thisCycleDate.getMonth() + 1);
  }
  return Math.ceil((thisCycleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const pastelColors = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#f97316", "#84cc16",
];

// ── Component ───────────────────────────────────────────────────

export default function Subscriptions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssinaturaForm>(emptyForm);

  // ── Data ────────────────────────────────────────────────────
  const { data: assinaturas = [], isLoading } = useQuery({
    queryKey: ["assinaturas", user?.id],
    queryFn: async () => {
      // We'll use the despesas table with categoria recorrecia as our storage
      // Using a separate Supabase table if it exists, otherwise fallback to local
      // We use localStorage for now since we avoid DB migrations
      const stored = localStorage.getItem(`vektor_assinaturas_${user?.id}`);
      return stored ? (JSON.parse(stored) as Assinatura[]) : [];
    },
    enabled: !!user,
  });

  const saveToLocalStorage = useCallback((items: Assinatura[]) => {
    localStorage.setItem(`vektor_assinaturas_${user?.id}`, JSON.stringify(items));
    qc.invalidateQueries({ queryKey: ["assinaturas", user?.id] });
  }, [user?.id, qc]);

  // ── Mutations ────────────────────────────────────────────────
  const saveAssinatura = useMutation({
    mutationFn: async () => {
      const valor = parseFloat(form.valor);
      if (!form.nome.trim() || !valor) throw new Error("Preencha os campos obrigatórios");

      const newItem: Assinatura = {
        id: editingId || crypto.randomUUID(),
        user_id: user!.id,
        nome: form.nome.trim(),
        valor,
        frequencia: form.frequencia,
        dia_cobranca: parseInt(form.dia_cobranca) || 1,
        categoria: form.categoria || null,
        ativa: form.ativa,
        cor: form.cor || "#8b5cf6",
        icone: null,
        created_at: getLocalDateString(),
      };

      if (editingId) {
        const updated = assinaturas.map((a) => (a.id === editingId ? newItem : a));
        saveToLocalStorage(updated);
      } else {
        saveToLocalStorage([...assinaturas, newItem]);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Assinatura atualizada!" : "Assinatura registrada!");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAssinatura = useMutation({
    mutationFn: async (id: string) => {
      saveToLocalStorage(assinaturas.filter((a) => a.id !== id));
    },
    onSuccess: () => toast.success("Assinatura removida!"),
  });

  const toggleActiva = useMutation({
    mutationFn: async (id: string) => {
      saveToLocalStorage(assinaturas.map((a) => (a.id === id ? { ...a, ativa: !a.ativa } : a)));
    },
  });

  // ── Handlers ────────────────────────────────────────────────
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const openEdit = (a: Assinatura) => {
    setEditingId(a.id);
    setForm({
      nome: a.nome,
      valor: String(a.valor),
      frequencia: a.frequencia,
      dia_cobranca: String(a.dia_cobranca),
      categoria: a.categoria ?? "Outro",
      ativa: a.ativa,
      cor: a.cor ?? "#8b5cf6",
    });
    setDialogOpen(true);
  };

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const ativas = assinaturas.filter((a) => a.ativa);
    const totalMensal = ativas.reduce((s, a) => s + toMonthlyValue(a.valor, a.frequencia), 0);
    const totalAnual = totalMensal * 12;
    const nextCharges = ativas
      .map((a) => ({ ...a, daysLeft: getDaysUntilNextCharge(a.dia_cobranca) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const byCategory = ativas.reduce<Record<string, number>>((acc, a) => {
      const cat = a.categoria ?? "Outro";
      acc[cat] = (acc[cat] || 0) + toMonthlyValue(a.valor, a.frequencia);
      return acc;
    }, {});
    return { ativas, totalMensal, totalAnual, nextCharges, byCategory };
  }, [assinaturas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <RepeatIcon className="h-6 w-6 text-primary" /> Radar de Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground">Controle de serviços e contratos recorrentes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Assinatura
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total / Mês", value: formatCurrency(stats.totalMensal), icon: "💸", color: "text-destructive" },
          { label: "Total / Ano", value: formatCurrency(stats.totalAnual), icon: "📅", color: "text-destructive" },
          { label: "Ativas", value: `${stats.ativas.length}`, icon: "✅", color: "text-emerald-600" },
          { label: "Pausadas", value: `${assinaturas.filter((a) => !a.ativa).length}`, icon: "⏸️", color: "text-muted-foreground" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xl">{item.icon}</span>
              <span className={`font-heading font-bold text-lg ${item.color}`}>{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Charges Timeline */}
      {stats.nextCharges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Próximas Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.nextCharges.slice(0, 5).map((a) => {
                const urgency = a.daysLeft <= 3 ? "destructive" : a.daysLeft <= 7 ? "warning" : "neutral";
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
                      style={{ backgroundColor: a.cor ?? "#8b5cf6" }}
                    >
                      {a.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.categoria}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading font-bold text-sm">{formatCurrency(a.valor)}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          urgency === "destructive"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : urgency === "warning"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {a.daysLeft === 0 ? "Hoje!" : a.daysLeft === 1 ? "Amanhã" : `em ${a.daysLeft} dias`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Subscriptions */}
      {assinaturas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RepeatIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">Nenhuma assinatura registrada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Cadastre Netflix, Spotify, contador, plano de saúde e outros serviços recorrentes para monitorar automaticamente.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Assinatura
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assinaturas.map((a, i) => {
            const daysLeft = getDaysUntilNextCharge(a.dia_cobranca);
            const monthlyVal = toMonthlyValue(a.valor, a.frequencia);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`relative overflow-hidden ${!a.ativa ? "opacity-60" : ""}`}>
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: a.cor ?? "#8b5cf6" }}
                  />
                  <CardContent className="p-4 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: a.cor ?? "#8b5cf6" }}
                        >
                          {a.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-sm leading-tight truncate">{a.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{a.categoria ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover assinatura?</AlertDialogTitle>
                              <AlertDialogDescription>"{a.nome}" será removida do radar permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAssinatura.mutate(a.id)} className="bg-destructive">
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{frequenciaLabels[a.frequencia]}</span>
                        <span className="font-heading font-bold">{formatCurrency(a.valor)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>≈ {formatCurrency(monthlyVal)}/mês</span>
                        <span>Dia {a.dia_cobranca}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] cursor-pointer transition-colors ${
                          a.ativa
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() => toggleActiva.mutate(a.id)}
                      >
                        {a.ativa ? "✓ Ativa" : "⏸ Pausada"}
                      </Badge>
                      {a.ativa && (
                        <span className={`text-[10px] font-medium ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                          {daysLeft === 0 ? "Cobrado hoje!" : `Próx. em ${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Monthly Category Breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" /> Gasto Mensal por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, val]) => {
                const pct = stats.totalMensal > 0 ? (val / stats.totalMensal) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{cat}</span>
                      <span className="font-semibold">{formatCurrency(val)}/mês</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Assinatura" : "Nova Assinatura"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Serviço *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Netflix, Spotify, Contador" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 39.90" />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.frequencia} onValueChange={(v) => setForm({ ...form, frequencia: v as FrequenciaAssinatura })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequenciaLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Cobrança</Label>
                <Input type="number" min="1" max="31" value={form.dia_cobranca} onChange={(e) => setForm({ ...form, dia_cobranca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Color picker */}
            <div className="space-y-2">
              <Label>Cor do Card</Label>
              <div className="flex gap-2 flex-wrap">
                {pastelColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-transform border-2 ${
                      form.cor === color ? "scale-125 border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm({ ...form, cor: color })}
                  />
                ))}
              </div>
            </div>

            {form.valor && form.frequencia && (
              <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                <p className="font-medium">Impacto estimado:</p>
                <p className="text-muted-foreground">
                  Mensal: <span className="font-semibold text-foreground">{formatCurrency(toMonthlyValue(parseFloat(form.valor) || 0, form.frequencia))}</span>
                  {" · "}Anual: <span className="font-semibold text-foreground">{formatCurrency(toYearlyValue(parseFloat(form.valor) || 0, form.frequencia))}</span>
                </p>
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
