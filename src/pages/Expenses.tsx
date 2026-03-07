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
import { Plus, TrendingDown, Pencil, Trash2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, expenseCategories, suggestCategory } from "@/lib/mockData";
import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

const schema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(200),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data obrigatória"),
  categoria: z.string().optional(),
});

type DespesaForm = { descricao: string; valor: string; data: string; categoria: string; tipo_conta: string };
const emptyForm: DespesaForm = { descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "", tipo_conta: "mei" };

export default function Expenses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DespesaForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Filtered list
  const filtered = useMemo(() => {
    let list = despesas;
    if (filterMonth) {
      list = list.filter((d) => d.data.startsWith(filterMonth));
    }
    if (filterCategoria) {
      list = list.filter((d) => d.categoria === filterCategoria);
    }
    return list;
  }, [despesas, filterMonth, filterCategoria]);

  const total = filtered.reduce((s, d) => s + d.valor, 0);

  // Monthly totals
  const monthlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    despesas.forEach((d) => {
      const key = d.data.slice(0, 7);
      map[key] = (map[key] || 0) + d.valor;
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
  }, [despesas]);

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
        categoria: parsed.data.categoria || null,
        tipo_conta: form.tipo_conta || "mei",
        user_id: user!.id,
      };
      if (editingId) {
        const { error } = await supabase.from("despesas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("despesas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["despesas"] });
      toast.success(editingId ? "Despesa atualizada!" : "Despesa cadastrada!");
      closeDialog();
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error("Erro ao salvar despesa.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["despesas"] });
      toast.success("Despesa excluída!");
    },
    onError: () => toast.error("Erro ao excluir despesa."),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const openEdit = (d: (typeof despesas)[0]) => {
    setEditingId(d.id);
    setForm({ descricao: d.descricao, valor: String(d.valor), data: d.data, categoria: d.categoria ?? "", tipo_conta: (d as any).tipo_conta ?? "mei" });
    setOpen(true);
  };

  const clearFilters = () => {
    setFilterMonth("");
    setFilterCategoria("");
  };

  const hasFilters = filterMonth || filterCategoria;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas saídas financeiras</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
            <TrendingDown className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Total (filtrado)" : "Total de Despesas"}
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
                  <p className="font-heading font-bold text-destructive">{formatCurrency(m.value)}</p>
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
              <Label className="text-xs">Categoria</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
            Despesas {hasFilters && <span className="text-sm font-normal text-muted-foreground">({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {hasFilters ? "Nenhuma despesa encontrada com os filtros aplicados." : "Nenhuma despesa cadastrada."}
            </p>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d, i) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{d.descricao}</TableCell>
                    <TableCell>{d.categoria ?? "—"}</TableCell>
                    <TableCell>{formatDate(d.data)}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatCurrency(d.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
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
                            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. A despesa "{d.descricao}" será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMut.mutate(d.id)}
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
            </Table></div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => {
                  const desc = e.target.value;
                  const updates: Partial<DespesaForm> = { descricao: desc };
                  if (!editingId || !form.categoria) {
                    const suggested = suggestCategory(desc);
                    if (suggested) updates.categoria = suggested;
                  }
                  setForm((prev) => ({ ...prev, ...updates }));
                }}
                placeholder="Ex: Uber, Netflix, iFood..."
                maxLength={200}
              />
              {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
            </div>
            <div className="space-y-2">
              <Label>Categoria {form.categoria && suggestCategory(form.descricao) === form.categoria && <Badge variant="secondary" className="ml-2 text-xs">Sugerida automaticamente</Badge>}</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Tipo de Conta</Label>
              <Select value={form.tipo_conta} onValueChange={(v) => setForm({ ...form, tipo_conta: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mei">MEI</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
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
