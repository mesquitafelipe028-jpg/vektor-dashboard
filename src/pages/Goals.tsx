import { useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/mockData";
import {
  Target, Plus, Pencil, Trash2, TrendingUp, Trophy, Rocket,
  PiggyBank, History, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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

interface Deposito {
  id: string;
  meta_id: string;
  user_id: string;
  valor: number;
  descricao: string | null;
  data: string;
  created_at: string;
}

const CATEGORIAS = [
  "Reserva de Emergência", "Equipamento", "Viagem",
  "Investimento", "Educação", "Veículo", "Outros",
];

const categoryIcons: Record<string, string> = {
  "Reserva de Emergência": "🛡️", Equipamento: "🖥️", Viagem: "✈️",
  Investimento: "📈", Educação: "📚", Veículo: "🚗", Outros: "🎯",
};

export default function Goals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [depositMeta, setDepositMeta] = useState<Meta | null>(null);
  const [withdrawMeta, setWithdrawMeta] = useState<Meta | null>(null);
  const [detailMeta, setDetailMeta] = useState<Meta | null>(null);

  // Meta form
  const [titulo, setTitulo] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const [categoria, setCategoria] = useState("Outros");

  // Deposit/Withdraw form
  const [txValor, setTxValor] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txData, setTxData] = useState(new Date().toISOString().slice(0, 10));

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ["metas_financeiras", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("metas_financeiras").select("*").order("prazo", { ascending: true });
      if (error) throw error;
      return data as Meta[];
    },
    enabled: !!user,
  });

  const { data: allDepositos = [] } = useQuery({
    queryKey: ["depositos_meta", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("depositos_meta").select("*").order("data", { ascending: true });
      if (error) throw error;
      return data as Deposito[];
    },
    enabled: !!user,
  });

  const upsertMeta = useMutation({
    mutationFn: async (meta: Partial<Meta>) => {
      if (editing) {
        const { error } = await (supabase as any).from("metas_financeiras").update(meta).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("metas_financeiras").insert({ ...meta, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["depositos_meta", user?.id] });
      toast.success("Meta excluída.");
      setDeleteId(null);
    },
  });

  const resetTxForm = () => {
    setTxValor("");
    setTxDesc("");
    setTxData(new Date().toISOString().slice(0, 10));
  };

  const addDeposit = useMutation({
    mutationFn: async () => {
      if (!depositMeta) return;
      const valor = parseFloat(txValor);
      if (!valor || valor <= 0) throw new Error("Valor inválido");

      const { error: depError } = await (supabase as any).from("depositos_meta").insert({
        meta_id: depositMeta.id,
        user_id: user!.id,
        valor,
        descricao: txDesc.trim() || null,
        data: txData,
      });
      if (depError) throw depError;

      const { error: metaError } = await (supabase as any)
        .from("metas_financeiras")
        .update({ valor_atual: depositMeta.valor_atual + valor })
        .eq("id", depositMeta.id);
      if (metaError) throw metaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["depositos_meta"] });
      toast.success("Depósito registrado!");
      setDepositMeta(null);
      resetTxForm();
    },
    onError: () => toast.error("Erro ao registrar depósito."),
  });

  const addWithdraw = useMutation({
    mutationFn: async () => {
      if (!withdrawMeta) return;
      const valor = parseFloat(txValor);
      if (!valor || valor <= 0) throw new Error("Valor inválido");
      if (valor > withdrawMeta.valor_atual) throw new Error("Saldo insuficiente");

      // Insert negative deposit
      const { error: depError } = await (supabase as any).from("depositos_meta").insert({
        meta_id: withdrawMeta.id,
        user_id: user!.id,
        valor: -valor,
        descricao: txDesc.trim() || "Saque",
        data: txData,
      });
      if (depError) throw depError;

      const { error: metaError } = await (supabase as any)
        .from("metas_financeiras")
        .update({ valor_atual: withdrawMeta.valor_atual - valor })
        .eq("id", withdrawMeta.id);
      if (metaError) throw metaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["depositos_meta"] });
      toast.success("Saque registrado!");
      setWithdrawMeta(null);
      resetTxForm();
    },
    onError: (e) => toast.error(e.message === "Saldo insuficiente" ? "Saldo insuficiente na meta." : "Erro ao registrar saque."),
  });

  const openNew = () => {
    setEditing(null);
    setTitulo(""); setValorAlvo(""); setValorAtual("0"); setPrazo(""); setCategoria("Outros");
    setDialogOpen(true);
  };

  const openEdit = (meta: Meta) => {
    setEditing(meta);
    setTitulo(meta.titulo); setValorAlvo(String(meta.valor_alvo));
    setValorAtual(String(meta.valor_atual)); setPrazo(meta.prazo); setCategoria(meta.categoria);
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = () => {
    if (!titulo.trim() || !valorAlvo || !prazo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    upsertMeta.mutate({
      titulo: titulo.trim(), valor_alvo: parseFloat(valorAlvo),
      valor_atual: parseFloat(valorAtual || "0"), prazo, categoria,
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

  // Detail view data
  const detailDepositos = useMemo(
    () => allDepositos.filter((d) => d.meta_id === detailMeta?.id),
    [allDepositos, detailMeta]
  );

  const chartData = useMemo(() => {
    if (!detailMeta) return [];
    const deps = detailDepositos.sort((a, b) => a.data.localeCompare(b.data));
    let acum = 0;
    const points = [{ date: detailMeta.created_at.slice(0, 10), label: formatDate(detailMeta.created_at.slice(0, 10)), valor: 0, meta: detailMeta.valor_alvo }];
    deps.forEach((d) => {
      acum += d.valor;
      points.push({ date: d.data, label: formatDate(d.data), valor: acum, meta: detailMeta.valor_alvo });
    });
    return points;
  }, [detailDepositos, detailMeta]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Defina objetivos e acompanhe seu progresso</p>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4" /> Nova Meta</Button>
      </div>

      {/* Summary */}
      {metas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total de Metas", value: metas.length, icon: Target, suffix: "" },
            { label: "Valor Acumulado", value: metas.reduce((s, m) => s + m.valor_atual, 0), icon: TrendingUp, isCurrency: true },
            { label: "Metas Concluídas", value: metas.filter((m) => m.valor_atual >= m.valor_alvo).length, icon: Trophy, suffix: `/${metas.length}` },
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
              <Button onClick={openNew}><Plus className="h-4 w-4" /> Criar Primeira Meta</Button>
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
          const metaDepositos = allDepositos.filter((d) => d.meta_id === meta.id);

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

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { resetTxForm(); setDepositMeta(meta); }} disabled={pct >= 100}>
                      <PiggyBank className="h-4 w-4" /> Depositar
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => { resetTxForm(); setWithdrawMeta(meta); }} disabled={meta.valor_atual <= 0}>
                      <ArrowDownLeft className="h-4 w-4" /> Sacar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDetailMeta(meta)}>
                      <History className="h-4 w-4" /> ({metaDepositos.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={!!depositMeta} onOpenChange={() => setDepositMeta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depositar na Meta</DialogTitle>
            <DialogDescription>
              {depositMeta && (
                <>{depositMeta.titulo} — Falta {formatCurrency(Math.max(depositMeta.valor_alvo - depositMeta.valor_atual, 0))}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={txValor} onChange={(e) => setTxValor(e.target.value)} placeholder="500.00" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Ex: Freelance do mês" maxLength={200} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={txData} onChange={(e) => setTxData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositMeta(null)}>Cancelar</Button>
            <Button onClick={() => addDeposit.mutate()} disabled={addDeposit.isPending || !txValor}>
              <ArrowUpRight className="h-4 w-4" /> Confirmar Depósito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={!!withdrawMeta} onOpenChange={() => setWithdrawMeta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sacar da Meta</DialogTitle>
            <DialogDescription>
              {withdrawMeta && (
                <>{withdrawMeta.titulo} — Saldo: {formatCurrency(withdrawMeta.valor_atual)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" max={withdrawMeta?.valor_atual} value={txValor} onChange={(e) => setTxValor(e.target.value)} placeholder="200.00" />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Ex: Emergência" maxLength={200} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={txData} onChange={(e) => setTxData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawMeta(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => addWithdraw.mutate()} disabled={addWithdraw.isPending || !txValor}>
              <ArrowDownLeft className="h-4 w-4" /> Confirmar Saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / History Dialog */}
      <Dialog open={!!detailMeta} onOpenChange={() => setDetailMeta(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{detailMeta && (categoryIcons[detailMeta.categoria] || "🎯")}</span>
              {detailMeta?.titulo}
            </DialogTitle>
            <DialogDescription>Histórico de movimentações</DialogDescription>
          </DialogHeader>

          {detailMeta && (
            <div className="space-y-4">
              {/* Progress summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold">
                    {formatCurrency(detailMeta.valor_atual)} / {formatCurrency(detailMeta.valor_alvo)}
                    {" "}({detailMeta.valor_alvo > 0 ? Math.min((detailMeta.valor_atual / detailMeta.valor_alvo) * 100, 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <Progress value={detailMeta.valor_alvo > 0 ? Math.min((detailMeta.valor_atual / detailMeta.valor_alvo) * 100, 100) : 0} className="h-3" />
              </div>

              {/* Evolution Chart */}
              {chartData.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Evolução do Acumulado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" className="text-xs" />
                          <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.[0]) return null;
                              const p = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-card p-3 shadow-md">
                                  <p className="text-xs text-muted-foreground">{p.label}</p>
                                  <p className="text-sm font-bold text-primary">{formatCurrency(p.valor)}</p>
                                  <p className="text-xs text-muted-foreground">Meta: {formatCurrency(p.meta)}</p>
                                </div>
                              );
                            }}
                          />
                          <defs>
                            <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#depositGrad)" strokeWidth={2.5} dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction History */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Movimentações ({detailDepositos.length})
                </h3>
                {detailDepositos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma movimentação registrada ainda.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {[...detailDepositos].reverse().map((dep) => {
                      const isWithdraw = dep.valor < 0;
                      return (
                        <div key={dep.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            {isWithdraw ? (
                              <ArrowDownLeft className="h-4 w-4 text-destructive" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-primary" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{dep.descricao || (isWithdraw ? "Saque" : "Depósito")}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(dep.data)}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${isWithdraw ? "text-destructive" : "text-primary"}`}>
                            {isWithdraw ? "" : "+"}{formatCurrency(dep.valor)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os depósitos serão removidos.</AlertDialogDescription>
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
