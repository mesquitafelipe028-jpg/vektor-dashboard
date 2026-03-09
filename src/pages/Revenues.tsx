import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Pencil, Trash2, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { TransactionTypeBadge, StatusBadge } from "@/components/transaction/TransactionBadge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { ReceitaExtended } from "@/types/transactions";

export default function Revenues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [filterMonth, setFilterMonth] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["receitas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*, clientes(nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as ReceitaExtended[];
    },
    enabled: !!user,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list = receitas;
    if (filterMonth) list = list.filter((r) => r.data.startsWith(filterMonth));
    if (filterClientId) list = list.filter((r) => r.cliente_id === filterClientId);
    return list;
  }, [receitas, filterMonth, filterClientId]);

  const total = filtered.reduce((s, r) => s + r.valor, 0);

  const monthlyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      const key = r.data.slice(0, 7);
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

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("receitas").delete().eq("id", id);
      if (error) throw error;
      await (supabase.from("receitas") as any).delete().eq("transacao_pai_id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas", user?.id] });
      toast.success("Receita excluída!");
    },
    onError: () => toast.error("Erro ao excluir receita."),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("receitas").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Status atualizado!");
    },
  });

  const clearFilters = () => {
    setFilterMonth("");
    setFilterClientId("");
  };

  const hasFilters = filterMonth || filterClientId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Receitas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas entradas financeiras</p>
        </div>
        <Button onClick={() => navigate("/receitas/nova")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>

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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={r.categoria ?? r.descricao} type="receita" size={28} />
                        <span className="font-medium">{r.descricao}</span>
                      </div>
                    </TableCell>
                    <TableCell>{(r.clientes as any)?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <TransactionTypeBadge tipo={r.tipo_transacao || "unica"} />
                    </TableCell>
                    <TableCell>
                      {r.tipo_transacao === "recorrente" ? (
                        <Select
                          value={r.status || "pendente"}
                          onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="recebido">Recebido</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={r.status || "recebido"} type="receita" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(r.data)}</TableCell>
                    <TableCell className={`text-right font-semibold ${transactionColors.receita.text}`}>
                      +{formatCurrency(r.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/receitas/editar/${r.id}`)}>
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
                              {r.tipo_transacao === "recorrente" && !r.transacao_pai_id &&
                                " Todas as ocorrências futuras também serão excluídas."}
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
            </Table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
