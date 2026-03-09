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
import { Plus, TrendingUp, Pencil, Trash2, Filter, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { TransactionTypeBadge, StatusBadge } from "@/components/transaction/TransactionBadge";
import TransactionCard from "@/components/transaction/TransactionCard";
import MonthNavigator, { getCurrentMonth } from "@/components/MonthNavigator";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { ReceitaExtended } from "@/types/transactions";

export default function Revenues() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterClientId, setFilterClientId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

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
    if (filterClientId && filterClientId !== "all") list = list.filter((r) => r.cliente_id === filterClientId);
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      list = list.filter((r) => r.descricao.toLowerCase().includes(q) || (r.categoria ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [receitas, filterMonth, filterClientId, searchText]);

  const total = filtered.reduce((s, r) => s + r.valor, 0);

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
      qc.invalidateQueries({ queryKey: ["receitas", user?.id] });
      toast.success("Status atualizado!");
    },
  });

  const hasFilters = filterClientId && filterClientId !== "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Receitas</h1>
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "Total (filtrado)" : "Total do mês"}{" "}
            <span className="font-heading font-bold text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-5 w-5" />
          </Button>
          {!isMobile && (
            <Button onClick={() => navigate("/receitas/nova")}>
              <Plus className="mr-2 h-4 w-4" /> Nova Receita
            </Button>
          )}
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {searchOpen && (
        <Input
          placeholder="Buscar por descrição ou categoria..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          autoFocus
        />
      )}

      {/* Month navigator */}
      <MonthNavigator month={filterMonth} onChange={setFilterMonth} />

      {/* Desktop filters */}
      {!isMobile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filtros</span>
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
                <Button variant="ghost" size="sm" onClick={() => setFilterClientId("")}>Limpar filtros</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchText || hasFilters ? "Nenhuma receita encontrada com os filtros aplicados." : "Nenhuma receita neste mês."}
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* ── Mobile: Card list ── */
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <TransactionCard
              key={r.id}
              id={r.id}
              descricao={r.descricao}
              valor={r.valor}
              data={r.data}
              categoria={r.categoria}
              status={r.status}
              tipo_transacao={r.tipo_transacao}
              clienteNome={(r.clientes as any)?.nome}
              type="receita"
              index={i}
              onEdit={(id) => navigate(`/receitas/editar/${id}`)}
              onDelete={(id) => deleteMut.mutate(id)}
              deleteWarning={
                r.tipo_transacao === "recorrente" && !r.transacao_pai_id
                  ? `"${r.descricao}" e todas as ocorrências futuras serão excluídas permanentemente.`
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Receitas <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
            </Table>
          </CardContent>
        </Card>
      )}

      {/* FAB for mobile */}
      {isMobile && (
        <button
          onClick={() => navigate("/receitas/nova")}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
