import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, Plus, Pencil, Trash2, TrendingUp, TrendingDown,
  CheckCircle2, Clock, BarChart3, Link as LinkIcon,
} from "lucide-react";
import { formatCurrency, formatDate, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────

type StatusProjeto = "ativo" | "concluido" | "pausado" | "cancelado";

interface LancamentoProjeto {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
}

interface Projeto {
  id: string;
  user_id: string;
  nome: string;
  cliente: string | null;
  status: StatusProjeto;
  valor_contrato: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  descricao: string | null;
  cor: string;
  lancamentos: LancamentoProjeto[];
  created_at: string;
}

type ProjetoForm = {
  nome: string;
  cliente: string;
  status: StatusProjeto;
  valor_contrato: string;
  data_inicio: string;
  data_fim: string;
  descricao: string;
  cor: string;
};

const emptyForm: ProjetoForm = {
  nome: "",
  cliente: "",
  status: "ativo",
  valor_contrato: "",
  data_inicio: getLocalDateString(),
  data_fim: "",
  descricao: "",
  cor: "#8b5cf6",
};

type LancamentoForm = { tipo: "receita" | "despesa"; descricao: string; valor: string; data: string };
const emptyLancamento: LancamentoForm = { tipo: "receita", descricao: "", valor: "", data: getLocalDateString() };

const statusLabels: Record<StatusProjeto, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

const statusColors: Record<StatusProjeto, string> = {
  ativo: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  concluido: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pausado: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

const paletaCores = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#f97316",
];

// ── Helpers ────────────────────────────────────────────────────
function getStorageKey(userId: string) {
  return `vektor_projetos_${userId}`;
}

function loadProjetos(userId: string): Projeto[] {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProjetos(userId: string, projetos: Projeto[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(projetos));
}

// ── Component ───────────────────────────────────────────────────

export default function Projects() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjetoForm>(emptyForm);

  const [lancDialogOpen, setLancDialogOpen] = useState(false);
  const [lancProjetoId, setLancProjetoId] = useState<string | null>(null);
  const [lancForm, setLancForm] = useState<LancamentoForm>(emptyLancamento);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Load from localStorage via useQuery for reactivity
  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos", user?.id],
    queryFn: () => loadProjetos(user!.id),
    enabled: !!user,
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["projetos", user?.id] }), [qc, user?.id]);

  const selectedProject = useMemo(
    () => projetos.find((p) => p.id === selectedProjectId) ?? projetos[0] ?? null,
    [projetos, selectedProjectId]
  );

  // ── Mutations ────────────────────────────────────────────────
  const saveProjeto = useCallback(() => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    const updated: Projeto = {
      id: editingId || crypto.randomUUID(),
      user_id: user!.id,
      nome: form.nome.trim(),
      cliente: form.cliente || null,
      status: form.status,
      valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato) : null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      descricao: form.descricao || null,
      cor: form.cor,
      lancamentos: editingId ? (projetos.find((p) => p.id === editingId)?.lancamentos ?? []) : [],
      created_at: editingId ? (projetos.find((p) => p.id === editingId)?.created_at ?? getLocalDateString()) : getLocalDateString(),
    };
    if (editingId) {
      saveProjetos(user!.id, projetos.map((p) => (p.id === editingId ? updated : p)));
    } else {
      saveProjetos(user!.id, [...projetos, updated]);
    }
    refresh();
    toast.success(editingId ? "Projeto atualizado!" : "Projeto criado!");
    closeDialog();
  }, [form, editingId, projetos, user, refresh]);

  const deleteProjeto = useCallback((id: string) => {
    saveProjetos(user!.id, projetos.filter((p) => p.id !== id));
    refresh();
    toast.success("Projeto excluído!");
    if (selectedProjectId === id) setSelectedProjectId(null);
  }, [projetos, user, refresh, selectedProjectId]);

  const saveLancamento = useCallback(() => {
    const valor = parseFloat(lancForm.valor);
    if (!valor || !lancForm.descricao.trim() || !lancProjetoId) { toast.error("Preencha todos os campos"); return; }
    const lanc: LancamentoProjeto = {
      id: crypto.randomUUID(),
      tipo: lancForm.tipo,
      descricao: lancForm.descricao.trim(),
      valor,
      data: lancForm.data,
    };
    const updated = projetos.map((p) =>
      p.id === lancProjetoId ? { ...p, lancamentos: [...p.lancamentos, lanc] } : p
    );
    saveProjetos(user!.id, updated);
    refresh();
    toast.success("Lançamento adicionado!");
    setLancDialogOpen(false);
    setLancForm(emptyLancamento);
  }, [lancForm, lancProjetoId, projetos, user, refresh]);

  const deleteLancamento = useCallback((projetoId: string, lancId: string) => {
    const updated = projetos.map((p) =>
      p.id === projetoId ? { ...p, lancamentos: p.lancamentos.filter((l) => l.id !== lancId) } : p
    );
    saveProjetos(user!.id, updated);
    refresh();
    toast.success("Lançamento removido!");
  }, [projetos, user, refresh]);

  // ── Dialog helpers ────────────────────────────────────────────
  const closeDialog = useCallback(() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }, []);

  const openEdit = (p: Projeto) => {
    setEditingId(p.id);
    setForm({
      nome: p.nome,
      cliente: p.cliente ?? "",
      status: p.status,
      valor_contrato: p.valor_contrato ? String(p.valor_contrato) : "",
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
      descricao: p.descricao ?? "",
      cor: p.cor,
    });
    setDialogOpen(true);
  };

  const openNewLanc = (id: string) => {
    setLancProjetoId(id);
    setLancForm(emptyLancamento);
    setLancDialogOpen(true);
  };

  // ── Summary stats ────────────────────────────────────────────
  const totalStats = useMemo(() => {
    const ativos = projetos.filter((p) => p.status === "ativo");
    const totalContratado = projetos.reduce((s, p) => s + (p.valor_contrato ?? 0), 0);
    const totalReceitas = projetos.reduce((s, p) => s + p.lancamentos.filter((l) => l.tipo === "receita").reduce((ss, l) => ss + l.valor, 0), 0);
    const totalDespesas = projetos.reduce((s, p) => s + p.lancamentos.filter((l) => l.tipo === "despesa").reduce((ss, l) => ss + l.valor, 0), 0);
    return { ativos, totalContratado, totalReceitas, totalDespesas, lucro: totalReceitas - totalDespesas };
  }, [projetos]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Hub de Projetos
          </h1>
          <p className="text-sm text-muted-foreground">Centro de custos e margens por projeto / cliente</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Projetos Ativos", value: String(totalStats.ativos.length), icon: "⚡" },
          { label: "Total Contratado", value: formatCurrency(totalStats.totalContratado), icon: "📋" },
          { label: "Receitas Registradas", value: formatCurrency(totalStats.totalReceitas), icon: "💰", green: true },
          { label: "Lucro Total", value: formatCurrency(totalStats.lucro), icon: "📈", green: totalStats.lucro >= 0 },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xl">{item.icon}</span>
              <span className={`font-heading font-bold text-lg ${item.green === false ? "text-destructive" : item.green ? "text-emerald-600" : "text-foreground"}`}>{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {projetos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Crie um projeto para registrar receitas e despesas vinculadas, visualizar margem de lucro e controlar seu portfólio de trabalhos.
            </p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar Projeto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects list */}
          <div className="lg:col-span-1 space-y-3">
            {projetos.map((p, i) => {
              const receitas = p.lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
              const despesas = p.lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
              const margem = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
              const isSelected = selectedProject?.id === p.id;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedProjectId(p.id)}
                >
                  <Card
                    className={`cursor-pointer transition-all relative overflow-hidden ${
                      isSelected ? "border-primary ring-1 ring-primary shadow-md" : "hover:border-primary/40"
                    }`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: p.cor }} />
                    <CardContent className="p-4 pl-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-sm truncate">{p.nome}</p>
                          {p.cliente && <p className="text-[11px] text-muted-foreground truncate">{p.cliente}</p>}
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[p.status]}`}>
                          {statusLabels[p.status]}
                        </Badge>
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-emerald-600 font-medium">{formatCurrency(receitas)}</span>
                        <span className="text-muted-foreground">Margem: {margem.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(margem, 100)} className="h-1 mt-1.5" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Project detail */}
          {selectedProject && (
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: selectedProject.cor }} />
                      <div>
                        <CardTitle className="font-heading text-xl">{selectedProject.nome}</CardTitle>
                        {selectedProject.cliente && (
                          <p className="text-sm text-muted-foreground">{selectedProject.cliente}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(selectedProject)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                            <AlertDialogDescription>Todos os lançamentos deste projeto serão perdidos.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive" onClick={() => deleteProjeto(selectedProject.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Financial summary */}
                  {(() => {
                    const receitas = selectedProject.lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
                    const despesas = selectedProject.lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
                    const lucro = receitas - despesas;
                    const margem = receitas > 0 ? (lucro / receitas) * 100 : 0;
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Receitas", value: formatCurrency(receitas), color: "text-emerald-600" },
                          { label: "Despesas", value: formatCurrency(despesas), color: "text-destructive" },
                          { label: "Lucro / Margem", value: `${formatCurrency(lucro)} (${margem.toFixed(0)}%)`, color: lucro >= 0 ? "text-emerald-600" : "text-destructive" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg bg-muted/50 p-3">
                            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                            <p className={`font-heading font-bold text-sm mt-0.5 ${s.color}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {selectedProject.valor_contrato && (
                    <div className="text-sm text-muted-foreground">
                      Valor do contrato: <span className="font-semibold text-foreground">{formatCurrency(selectedProject.valor_contrato)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lancamentos */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Lançamentos do Projeto</CardTitle>
                  <Button size="sm" onClick={() => openNewLanc(selectedProject.id)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Lançamento
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedProject.lancamentos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Nenhum lançamento. Adicione receitas e despesas deste projeto.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedProject.lancamentos
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((l) => (
                          <div key={l.id} className="flex items-center gap-3 rounded-lg border p-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${l.tipo === "receita" ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                              {l.tipo === "receita"
                                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{l.descricao}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDate(l.data)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-heading font-bold text-sm ${l.tipo === "receita" ? "text-emerald-600" : "text-destructive"}`}>
                                {l.tipo === "despesa" ? "-" : "+"}{formatCurrency(l.valor)}
                              </span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteLancamento(selectedProject.id, l.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Projeto" : "Novo Projeto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome do Projeto *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Site da Padaria, App do Cliente X" /></div>
            <div className="space-y-2"><Label>Cliente / Contratante</Label><Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Ex: João Silva" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusProjeto })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valor do Contrato (R$)</Label><Input type="number" step="0.01" value={form.valor_contrato} onChange={(e) => setForm({ ...form, valor_contrato: e.target.value })} placeholder="Ex: 3000.00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data de Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div className="space-y-2"><Label>Prazo de Entrega</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Cor do Projeto</Label>
              <div className="flex gap-2">
                {paletaCores.map((cor) => (
                  <button key={cor} type="button" className={`h-7 w-7 rounded-full border-2 transition-transform ${form.cor === cor ? "scale-125 border-foreground" : "border-transparent"}`} style={{ backgroundColor: cor }} onClick={() => setForm({ ...form, cor })} />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={saveProjeto}>Salvar Projeto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lancamento Dialog */}
      <Dialog open={lancDialogOpen} onOpenChange={(v) => { if (!v) { setLancDialogOpen(false); setLancForm(emptyLancamento); } else setLancDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={lancForm.tipo} onValueChange={(v) => setLancForm({ ...lancForm, tipo: v as "receita" | "despesa" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">💰 Receita</SelectItem>
                  <SelectItem value="despesa">💸 Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={lancForm.descricao} onChange={(e) => setLancForm({ ...lancForm, descricao: e.target.value })} placeholder="Ex: Pagamento 50%, Domínio, Reunião" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={lancForm.valor} onChange={(e) => setLancForm({ ...lancForm, valor: e.target.value })} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={lancForm.data} onChange={(e) => setLancForm({ ...lancForm, data: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={saveLancamento}>Adicionar Lançamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
