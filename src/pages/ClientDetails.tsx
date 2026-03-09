import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, DollarSign, Clock, Calendar, CheckCircle,
  Pencil, Send, CreditCard, AlertTriangle, CalendarClock,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { TransactionTypeBadge, StatusBadge } from "@/components/transaction/TransactionBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { z } from "zod";
import type { ReceitaExtended } from "@/types/transactions";
import { generateRecurringDates, frequenciaLabels } from "@/types/transactions";
import { Badge } from "@/components/ui/badge";
import { BillingReminderSheet } from "@/components/billing/BillingReminderSheet";

const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")).optional(),
  telefone: z.string().trim().max(20).optional(),
});

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [showAllProjections, setShowAllProjections] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", email: "", telefone: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // --- Queries ---
  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ["clientes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: receitas = [], isLoading: loadingReceitas } = useQuery({
    queryKey: ["receitas_cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*")
        .eq("cliente_id", id!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as ReceitaExtended[];
    },
    enabled: !!user && !!id,
  });

  // --- KPIs ---
  const stats = useMemo(() => {
    const totalPago = receitas
      .filter((r) => r.status === "recebido")
      .reduce((s, r) => s + r.valor, 0);
    const totalAberto = receitas
      .filter((r) => r.status === "pendente" || r.status === "atrasado")
      .reduce((s, r) => s + r.valor, 0);
    const ultimoPagamento = receitas.find((r) => r.status === "recebido")?.data ?? null;
    const hoje = new Date().toISOString().slice(0, 10);
    const proximaCobranca = receitas
      .filter((r) => r.status === "pendente" && r.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))[0]?.data ?? null;
    const pendentes = receitas.filter((r) => r.status === "pendente" || r.status === "atrasado");
    return { totalPago, totalAberto, ultimoPagamento, proximaCobranca, pendentes };
  }, [receitas]);

  // --- Future projections for recurring charges ---
  const projections = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const parentRecurrentes = receitas.filter(
      (r) => r.tipo_transacao === "recorrente" && !r.transacao_pai_id && r.frequencia
    );
    if (parentRecurrentes.length === 0) return [];

    const allProjections: { descricao: string; valor: number; data: string; frequencia: string }[] = [];

    for (const r of parentRecurrentes) {
      const dates = generateRecurringDates(r.data, r.frequencia!, r.data_fim, 12);
      const existingDates = new Set(
        receitas.filter((rx) => rx.transacao_pai_id === r.id || rx.id === r.id).map((rx) => rx.data)
      );
      for (const d of dates) {
        if (d > hoje && !existingDates.has(d)) {
          allProjections.push({
            descricao: r.descricao,
            valor: r.valor,
            data: d,
            frequencia: frequenciaLabels[r.frequencia!] || r.frequencia!,
          });
        }
      }
    }

    return allProjections.sort((a, b) => a.data.localeCompare(b.data));
  }, [receitas]);

  const visibleProjections = showAllProjections ? projections : projections.slice(0, 6);

  // --- Mutations ---
  const updateCliente = useMutation({
    mutationFn: async () => {
      const parsed = clienteSchema.safeParse(editForm);
      if (!parsed.success) {
        const fe: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
        setEditErrors(fe);
        throw new Error("validation");
      }
      setEditErrors({});
      const { error } = await supabase.from("clientes").update({
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        telefone: parsed.data.telefone || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes", id] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente atualizado!");
      setEditOpen(false);
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error("Erro ao salvar.");
    },
  });

  const markPaid = useMutation({
    mutationFn: async (receitaId: string) => {
      const { error } = await supabase
        .from("receitas")
        .update({ status: "recebido" } as any)
        .eq("id", receitaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas_cliente", id] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Pagamento registrado!");
    },
  });

  // --- Handlers ---
  const openEditDialog = () => {
    if (!cliente) return;
    setEditForm({
      nome: cliente.nome,
      email: cliente.email ?? "",
      telefone: cliente.telefone ?? "",
    });
    setEditErrors({});
    setEditOpen(true);
  };

  const handleReminder = () => {
    if (stats.pendentes.length === 0) {
      toast.info("Nenhuma cobrança pendente para este cliente.");
      return;
    }
    setReminderOpen(true);
  };

  // --- Loading / Not Found ---
  if (loadingCliente) {
    return <p className="py-12 text-center text-muted-foreground">Carregando...</p>;
  }
  if (!cliente) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-4">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const kpis = [
    { label: "Total Pago", value: formatCurrency(stats.totalPago), icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total em Aberto", value: formatCurrency(stats.totalAberto), icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { label: "Último Pagamento", value: stats.ultimoPagamento ? formatDate(stats.ultimoPagamento) : "—", icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: "Próxima Cobrança", value: stats.proximaCobranca ? formatDate(stats.proximaCobranca) : "—", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold truncate">{cliente.nome}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {[cliente.telefone, cliente.email].filter(Boolean).join(" • ") || "Sem contato cadastrado"}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/receitas/nova?cliente=${id}`)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Nova Cobrança
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPayOpen(true)}
            className="gap-1.5"
          >
            <CreditCard className="h-4 w-4" /> Registrar Pgto
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReminder}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" /> Lembrete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/clientes/editar/${id}`)}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                    <k.icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                </div>
                <p className="font-heading text-lg sm:text-xl font-bold truncate">{k.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Client Info */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">E-mail</p>
              <p className="font-medium">{cliente.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Telefone</p>
              <p className="font-medium">{cliente.telefone ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente desde</p>
              <p className="font-medium">{formatDate(cliente.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Projections — only shown if recurring charges exist */}
      {projections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Próximas Cobranças
              <Badge variant="secondary" className="ml-auto text-xs font-normal">
                {projections.length} prevista{projections.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {visibleProjections.map((p, i) => (
                <motion.div
                  key={`${p.descricao}-${p.data}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.descricao}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(p.data)}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-600 dark:text-blue-400">
                        {p.frequencia}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-0 text-[10px]">
                      Prevista
                    </Badge>
                    <span className="font-heading font-bold text-sm text-muted-foreground">
                      {formatCurrency(p.valor)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            {projections.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs text-muted-foreground"
                onClick={() => setShowAllProjections(!showAllProjections)}
              >
                {showAllProjections ? (
                  <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Mostrar menos</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5 mr-1" /> Ver mais {projections.length - 6} cobranças</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Financial History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Histórico do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReceitas ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : receitas.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma cobrança vinculada a este cliente.</p>
              <Button variant="outline" onClick={() => navigate(`/receitas/nova?cliente=${id}`)}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Cobrança
              </Button>
            </div>
          ) : isMobile ? (
            /* Mobile: card list */
            <div className="space-y-3">
              {receitas.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1">{r.descricao}</span>
                    <span className="font-heading font-bold text-primary ml-2">
                      {formatCurrency(r.valor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(r.data)}</span>
                    <div className="flex items-center gap-1.5">
                      <TransactionTypeBadge tipo={r.tipo_transacao || "unica"} />
                      <StatusBadge status={r.status || "pendente"} type="receita" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Desktop: table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell>{formatDate(r.data)}</TableCell>
                      <TableCell className="font-medium">{r.descricao}</TableCell>
                      <TableCell>
                        <TransactionTypeBadge tipo={r.tipo_transacao || "unica"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status || "pendente"} type="receita" />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(r.valor)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                maxLength={100}
              />
              {editErrors.nome && <p className="text-sm text-destructive">{editErrors.nome}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  maxLength={255}
                />
                {editErrors.email && <p className="text-sm text-destructive">{editErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  maxLength={20}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateCliente.mutate()} disabled={updateCliente.isPending}>
              {updateCliente.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {stats.pendentes.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Nenhuma cobrança pendente para este cliente.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.pendentes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.data)} • {formatCurrency(r.valor)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markPaid.mutate(r.id)}
                    disabled={markPaid.isPending}
                    className="ml-2 shrink-0 gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Pago
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
