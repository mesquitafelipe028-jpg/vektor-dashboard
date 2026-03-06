import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Pencil, Trash2, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

const schema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(200),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data obrigatória"),
  forma_pagamento: z.string().optional(),
  cliente_id: z.string().optional(),
});

type ReceitaForm = {
  descricao: string;
  valor: string;
  data: string;
  forma_pagamento: string;
  cliente_id: string;
};

const emptyForm: ReceitaForm = {
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  forma_pagamento: "",
  cliente_id: "",
};

export default function Revenues() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReceitaForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*, clientes(nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filtered list
  const filtered = useMemo(() => {
    let list = receitas;
    if (filterMonth) {
      list = list.filter((r) => r.data.startsWith(filterMonth));
    }
    if (filterClientId) {
      list = list.filter((r) => r.cliente_id === filterClientId);
    }
    return list;
  }, [receitas, filterMonth, filterClientId]);

  const total = filtered.reduce((s, r) => s + r.valor, 0);

  // Monthly totals
  const monthlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      const key = r.data.slice(0, 7); // "YYYY-MM"
      map[key] = (map[key] || 0) + r.valor;
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([month, value]) => {
        const [y, m] = month.split("-");
        const d = new Date(parseInt(y), parseInt(m) - 1);
        const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return { label: label.charAt(0).toUpperCase() + label.slice(1), value };
      });
  }, [receitas]);

  const upsert = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ ...form, valor: parseFloat(form.valor) });
      if (!parsed.success) {
        const fe: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
        setErrors(fe);
        throw new Error("validation");
      }
      setErrors({});
      const payload = {
        descricao: parsed.data.descricao,
        valor: parsed.data.valor,
        data: parsed.data.data,
        forma_pagamento: parsed.data.forma_pagamento || null,
        cliente_id: parsed.data.cliente_id || null,
        user_id: user!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("receitas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("receitas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success(editingId ? "Receita atualizada!" : "Receita cadastrada!");
      closeDialog();
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error("Erro ao salvar receita.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("receitas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita excluída!");
    },
    onError: () => toast.error("Erro ao excluir receita."),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const openEdit = (r: (typeof receitas)[0]) => {
    setEditingId(r.id);
    setForm({
      descricao: r.descricao,
      valor: String(r.valor),
      data: r.data,
      forma_pagamento: r.forma_pagamento ?? "",
      cliente_id: r.cliente_id ?? "",
    });
    setOpen(true);
  };

  const clearFilters = () => {
    setFilterMonth("");
    setFilterClientId("");
  };

  const hasFilters = filterMonth || filterClientId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Receitas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas entradas financeiras</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Total (filtrado)" : "Total de Receitas"}
            </p>
            <p className="font-heading text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Totals */}
      {monthlyTotals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Total por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {monthlyTotals.map((m) => (
                <div key={m.label} className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <p className="font-heading font-bold text-primary">{formatCurrency(m.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Receitas {hasFilters && <span className="text-sm font-normal text-muted-foreground">({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {hasFilters ? "Nenhuma receita encontrada com os filtros aplicados." : "Nenhuma receita cadastrada."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{(r.clientes as any)?.nome ?? "—"}</TableCell>
                    <TableCell>{r.forma_pagamento ?? "—"}</TableCell>
                    <TableCell>{formatDate(r.data)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(r.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. A receita "{r.descricao}" será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Editar Receita" : "Nova Receita"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição da receita"
                maxLength={200}
              />
              {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
                {errors.valor && <p className="text-sm text-destructive">{errors.valor}</p>}
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
                {errors.data && <p className="text-sm text-destructive">{errors.data}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
