import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/mockData";
import { Target, Plus, Pencil, Trash2, TrendingUp, Trophy, Rocket } from "lucide-react";
import { toast } from "sonner";

interface Meta {
  id: string;
  user_id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  prazo: string;
  categoria: string;
  created_at: string;
}

const CATEGORIAS = [
  "Reserva de Emergência",
  "Equipamento",
  "Viagem",
  "Investimento",
  "Educação",
  "Veículo",
  "Outros",
];

const categoryIcons: Record<string, string> = {
  "Reserva de Emergência": "🛡️",
  Equipamento: "🖥️",
  Viagem: "✈️",
  Investimento: "📈",
  Educação: "📚",
  Veículo: "🚗",
  Outros: "🎯",
};

export default function Goals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Meta | null>(null);

  const [titulo, setTitulo] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const [categoria, setCategoria] = useState("Outros");

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ["metas_financeiras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("metas_financeiras")
        .select("*")
        .order("prazo", { ascending: true });
      if (error) throw error;
      return data as Meta[];
    },
    enabled: !!user,
  });

  const upsertMeta = useMutation({
    mutationFn: async (meta: Partial<Meta>) => {
      if (editing) {
        const { error } = await (supabase as any)
          .from("metas_financeiras")
          .update(meta)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("metas_financeiras")
          .insert({ ...meta, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras"] });
      toast.success(editing ? "Meta atualizada!" : "Meta criada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar meta."),
  });

  const deleteMeta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("metas_financeiras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras"] });
      toast.success("Meta excluída.");
      setDeleteId(null);
    },
  });

  const openNew = () => {
    setEditing(null);
    setTitulo("");
    setValorAlvo("");
    setValorAtual("0");
    setPrazo("");
    setCategoria("Outros");
    setDialogOpen(true);
  };

  const openEdit = (meta: Meta) => {
    setEditing(meta);
    setTitulo(meta.titulo);
    setValorAlvo(String(meta.valor_alvo));
    setValorAtual(String(meta.valor_atual));
    setPrazo(meta.prazo);
    setCategoria(meta.categoria);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!titulo.trim() || !valorAlvo || !prazo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    upsertMeta.mutate({
      titulo: titulo.trim(),
      valor_alvo: parseFloat(valorAlvo),
      valor_atual: parseFloat(valorAtual || "0"),
      prazo,
      categoria,
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  const getStatus = (meta: Meta) => {
    const pct = meta.valor_alvo > 0 ? (meta.valor_atual / meta.valor_alvo) * 100 : 0;
    if (pct >= 100) return { label: "Concluída", color: "bg-green-500/15 text-green-700 border-green-500/30" };
    if (meta.prazo < today) return { label: "Vencida", color: "bg-red-500/15 text-red-700 border-red-500/30" };
    if (pct >= 75) return { label: "Quase lá", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" };
    return { label: "Em andamento", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Defina objetivos e acompanhe seu progresso</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {/* Summary */}
      {metas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total de Metas", value: metas.length, icon: Target, suffix: "" },
            {
              label: "Valor Acumulado",
              value: metas.reduce((s, m) => s + m.valor_atual, 0),
              icon: TrendingUp,
              isCurrency: true,
            },
            {
              label: "Metas Concluídas",
              value: metas.filter((m) => m.valor_atual >= m.valor_alvo).length,
              icon: Trophy,
              suffix: `/${metas.length}`,
            },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold font-heading">
                      {s.isCurrency ? formatCurrency(s.value as number) : `${s.value}${s.suffix || ""}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && metas.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="font-heading text-lg font-semibold mb-1">Nenhuma meta cadastrada</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Defina metas financeiras para acompanhar seu progresso. Exemplos: reserva de emergência, compra de equipamento, viagem.
              </p>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metas.map((meta, i) => {
          const pct = meta.valor_alvo > 0 ? Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100) : 0;
          const restante = Math.max(meta.valor_alvo - meta.valor_atual, 0);
          const status = getStatus(meta);
          const prazoDate = new Date(meta.prazo + "T00:00:00");
          const diasRestantes = Math.ceil((prazoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return (
            <motion.div key={meta.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="h-full">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryIcons[meta.categoria] || "🎯"}</span>
                      <div>
                        <p className="font-heading font-semibold text-base">{meta.titulo}</p>
                        <p className="text-xs text-muted-foreground">{meta.categoria}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={status.color}>{status.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(meta)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(meta.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-3" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Acumulado</p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(meta.valor_atual)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="text-sm font-semibold">{formatCurrency(meta.valor_alvo)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Falta</p>
                      <p className="text-sm font-semibold text-destructive">{formatCurrency(restante)}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    Prazo: {prazoDate.toLocaleDateString("pt-BR")}
                    {diasRestantes > 0 && ` · ${diasRestantes} dias restantes`}
                    {diasRestantes <= 0 && pct < 100 && " · Prazo expirado"}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da sua meta financeira." : "Defina uma nova meta financeira para acompanhar."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reserva de emergência" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor da Meta (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="10000" />
              </div>
              <div>
                <Label>Valor Atual (R$)</Label>
                <Input type="number" min="0" step="0.01" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prazo *</Label>
                <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{categoryIcons[c]} {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={upsertMeta.isPending}>
              {editing ? "Salvar" : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMeta.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
