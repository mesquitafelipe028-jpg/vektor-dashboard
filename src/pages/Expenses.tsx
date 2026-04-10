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
import { Plus, TrendingDown, Pencil, Trash2, Filter, Search, X } from "lucide-react";
import { formatCurrency, formatDate, getLocalDateString, expenseCategories as expenseCategoryNames } from "@/lib/utils";
import { CategoryIcon } from "@/components/CategoryIcon";
import { transactionColors } from "@/lib/categories";
import { TransactionTypeBadge, StatusBadge } from "@/components/transaction/TransactionBadge";
import TransactionCard from "@/components/transaction/TransactionCard";
import MonthNavigator, { getCurrentMonth } from "@/components/MonthNavigator";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { DespesaExtended } from "@/types/transactions";
import type { ExtendedUnifiedTransaction } from "@/lib/virtualTransactions";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMarkAsPaid } from "@/hooks/useMarkAsPaid";

export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterCategoria, setFilterCategoria] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("data-desc");

  const { raw, loading: isLoading } = useFinancialData();
  const despesas = (raw.despesas as unknown as (DespesaExtended & ExtendedUnifiedTransaction)[]) || [];

  const markAsPaidMut = useMarkAsPaid();

  const filtered = useMemo(() => {
    let list = despesas;
    if (filterMonth) list = list.filter((d) => d.data.startsWith(filterMonth));
    if (filterCategoria && filterCategoria !== "all") list = list.filter((d) => d.categoria === filterCategoria);
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      list = list.filter((d) => d.descricao.toLowerCase().includes(q) || (d.categoria ?? "").toLowerCase().includes(q));
    }

    // Sorting logic
    return [...list].sort((a, b) => {
      if (sortBy === "data-desc") return new Date(b.data).getTime() - new Date(a.data).getTime();
      if (sortBy === "data-asc") return new Date(a.data).getTime() - new Date(b.data).getTime();
      if (sortBy === "valor-desc") return b.valor - a.valor;
      if (sortBy === "valor-asc") return a.valor - b.valor;
      if (sortBy === "abc-asc") return a.descricao.localeCompare(b.descricao);
      return 0;
    });
  }, [despesas, filterMonth, filterCategoria, searchText, sortBy]);

  const total = filtered.reduce((s, d) => s + d.valor, 0);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      let targetId = id;
      if (id.startsWith("virtual-")) {
        const parts = id.split("-");
        targetId = parts.slice(1, 6).join("-"); // extrai o parentId
      }
      console.log(`[Expenses] Deleting transaction ${targetId} via Ledger System`);
      const { error } = await supabase.from("transactions").delete().eq("id", targetId);
      if (error) throw error;
      console.log("[Expenses] Deletion complete.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", user?.id] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
      toast.success("Despesa excluída!");
    },
    onError: (e: any) => {
      console.error("[Expenses] Delete error:", e);
      toast.error("Erro ao excluir despesa.");
    },
  });



  const hasFilters = (filterCategoria && filterCategoria !== "all") || searchText.trim();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Despesas</h1>
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
            <Button onClick={() => navigate("/despesas/nova")}>
              <Plus className="mr-2 h-4 w-4" /> Nova Despesa
            </Button>
          )}
        </div>
      </div>

      {searchOpen && (
        <Input
          placeholder="Buscar por descrição ou categoria..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          autoFocus
        />
      )}

      <MonthNavigator month={filterMonth} onChange={setFilterMonth} />

      {!isMobile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filtros</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {expenseCategoryNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ordenação Profissional</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-56 h-10 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data-desc">📅 Data (Mais recentes)</SelectItem>
                    <SelectItem value="data-asc">📅 Data (Mais antigos)</SelectItem>
                    <SelectItem value="valor-desc">💰 Valor (Maior p/ menor)</SelectItem>
                    <SelectItem value="valor-asc">💰 Valor (Menor p/ maior)</SelectItem>
                    <SelectItem value="abc-asc">🔤 A-Z (Alfabética)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(hasFilters || sortBy !== "data-desc") && (
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="text-xs h-10 px-3 hover:bg-destructive/10 hover:text-destructive"
                   onClick={() => { 
                     setFilterCategoria(""); 
                     setSortBy("data-desc"); 
                     setSearchText(""); 
                   }}
                >
                  <X className="mr-2 h-3 w-3" /> Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {hasFilters ? "Nenhuma despesa encontrada com os filtros aplicados." : "Nenhuma despesa neste mês."}
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((d, i) => (
            <TransactionCard
              key={d.id}
              id={d.id}
              descricao={d.descricao}
              valor={d.valor}
              data={d.data}
              categoria={d.categoria}
              status={d.status}
              tipo_transacao={d.tipo_transacao}
              parcela_atual={d.parcela_atual}
              numero_parcelas={d.numero_parcelas}
              type="despesa"
              index={i}
              isVirtual={d.isVirtual}
              onMarkAsPaid={(id) => markAsPaidMut.mutate(id)}
              onEdit={(id) => {
                if (d.isVirtual) {
                   toast.info("Essa é uma projeção futura. Para editá-la, edite a transação original.");
                   const parts = id.split("-");
                   const parentId = parts.slice(1, 6).join("-");
                   navigate(`/despesas/editar/${parentId}`);
                } else {
                   navigate(`/despesas/editar/${id}`);
                }
              }}
              onDelete={(id) => deleteMut.mutate(id)}
              deleteWarning={
                (d.tipo_transacao === "recorrente" || d.tipo_transacao === "parcelada") && !d.transacao_pai_id
                  ? `"${d.descricao}" e todas as ocorrências futuras serão excluídas permanentemente.`
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Despesas <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={d.categoria} type="despesa" size={28} />
                        <span className="font-medium">{d.descricao}</span>
                      </div>
                    </TableCell>
                    <TableCell>{d.categoria ?? "—"}</TableCell>
                    <TableCell>
                      <TransactionTypeBadge
                        tipo={d.tipo_transacao || "unica"}
                        parcela_atual={d.parcela_atual}
                        numero_parcelas={d.numero_parcelas}
                      />
                    </TableCell>
                    <TableCell>
                      {d.isVirtual ? (
                         <div className="flex gap-2 items-center">
                           <StatusBadge status="pendente" type="despesa" />
                           <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => markAsPaidMut.mutate(d.id)}>Pagar</Button>
                         </div>
                      ) : (d.tipo_transacao === "recorrente" || d.tipo_transacao === "parcelada") ? (
                        <Select
                          value={d.status || "pendente"}
                          onValueChange={(v) => {
                             if (v === "pago") markAsPaidMut.mutate(d.id);
                          }}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={d.status || "pago"} type="despesa" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(d.data)}</TableCell>
                    <TableCell className={`text-right font-semibold ${transactionColors.despesa.text}`}>
                      -{formatCurrency(d.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.isVirtual ? (
                        <Button variant="ghost" size="icon" onClick={() => {
                           const parts = d.id.split("-");
                           const parentId = parts.slice(1, 6).join("-");
                           navigate(`/despesas/editar/${parentId}`);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/despesas/editar/${d.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                              {(d.tipo_transacao === "recorrente" || d.tipo_transacao === "parcelada") && !d.transacao_pai_id &&
                                " Todas as ocorrências futuras também serão excluídas."}
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
            </Table>
          </CardContent>
        </Card>
      )}

      {isMobile && (
        <button
          onClick={() => navigate("/despesas/nova")}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
