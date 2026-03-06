import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Users, Search, Trophy, Eye, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";
import { formatCurrency } from "@/lib/mockData";

const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")).optional(),
  telefone: z.string().trim().max(20).optional(),
  cpf_cnpj: z.string().trim().max(18).optional(),
  tipo_cliente: z.string().optional(),
  observacoes: z.string().trim().max(500).optional(),
});

type ClienteForm = {
  nome: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  tipo_cliente: string;
  observacoes: string;
};

const emptyForm: ClienteForm = {
  nome: "",
  email: "",
  telefone: "",
  cpf_cnpj: "",
  tipo_cliente: "",
  observacoes: "",
};

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch receitas to compute per-client stats
  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("id, valor, data, cliente_id")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Top 5 clients by revenue
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      if (r.cliente_id) map[r.cliente_id] = (map[r.cliente_id] || 0) + r.valor;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const cliente = clientes.find((c) => c.id === id);
        return { id, nome: cliente?.nome ?? "—", total };
      });
  }, [receitas, clientes]);

  const upsert = useMutation({
    mutationFn: async (values: ClienteForm) => {
      const payload = {
        nome: values.nome.trim(),
        email: values.email.trim() || null,
        telefone: values.telefone.trim() || null,
        user_id: user!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(editingId ? "Cliente atualizado!" : "Cliente cadastrado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar cliente."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente excluído!");
    },
    onError: () => toast.error("Erro ao excluir cliente."),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const openEdit = (c: typeof clientes[0]) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      cpf_cnpj: "",
      tipo_cliente: "",
      observacoes: "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    const result = clienteSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    upsert.mutate(form);
  };

  // Smart search: nome, email, telefone
  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    const q = search.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.telefone ?? "").toLowerCase().includes(q)
    );
  }, [clientes, search]);

  // Per-client revenue map for table display
  const clientRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      if (r.cliente_id) map[r.cliente_id] = (map[r.cliente_id] || 0) + r.valor;
    });
    return map;
  }, [receitas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus clientes e acompanhe o faturamento
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
            <p className="font-heading text-2xl font-bold">{clientes.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Clients */}
      {topClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Top 5 Clientes por Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topClients.map((tc, i) => (
                <motion.div
                  key={tc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="cursor-pointer rounded-lg border border-border p-3 text-center hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/clientes/${tc.id}`)}
                >
                  <p className="text-xs text-muted-foreground mb-1">#{i + 1}</p>
                  <p className="text-sm font-semibold truncate">{tc.nome}</p>
                  <p className="font-heading font-bold text-primary text-sm mt-1">
                    {formatCurrency(tc.total)}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="font-heading text-lg">Todos os Clientes</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, e-mail ou telefone..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : clientes.length === 0 ? (
            /* Empty state */
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">
                Você ainda não possui clientes cadastrados
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Cadastre seu primeiro cliente para começar a registrar receitas e acompanhar o faturamento por cliente.
              </p>
              <Button onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Primeiro Cliente
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum cliente encontrado para "{search}".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Total Faturado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/clientes/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell>{c.telefone ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(clientRevenue[c.id] ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O cliente "{c.nome}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(c.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do cliente"
                maxLength={100}
              />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  maxLength={255}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  maxLength={20}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
