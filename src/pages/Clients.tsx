import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Search, Trophy, Eye, UserPlus, MoreVertical, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("nome-asc");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", user?.id],
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

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, date, cliente_id, status")
        .eq("type", "income")
        .order("date", { ascending: false });
      if (error) throw error;
      
      // Mapeamento para compatibilidade legada
      return (data ?? []).map(t => ({
        ...t,
        valor: t.amount,
        data: t.date,
        status: t.status === "confirmed" ? "recebido" : t.status
      }));
    },
    enabled: !!user,
  });

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes", user?.id] });
      toast.success("Cliente excluído!");
    },
    onError: () => toast.error("Erro ao excluir cliente."),
  });

  // clientRevenue must be declared BEFORE filtered to avoid temporal dead zone
  const clientRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      if (r.cliente_id && r.status === "recebido") {
        map[r.cliente_id] = (map[r.cliente_id] || 0) + r.valor;
      }
    });
    return map;
  }, [receitas]);

  const clientPending = useMemo(() => {
    const map: Record<string, boolean> = {};
    receitas.forEach((r) => {
      if (r.cliente_id && (r.status === "pendente" || r.status === "atrasado")) {
        map[r.cliente_id] = true;
      }
    });
    return map;
  }, [receitas]);

  const filtered = useMemo(() => {
    const base = search.trim()
      ? clientes.filter((c) => {
          const q = search.toLowerCase().trim();
          return (
            c.nome.toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.telefone ?? "").toLowerCase().includes(q)
          );
        })
      : clientes;

    return [...base].sort((a, b) => {
      if (sortBy === "nome-asc") return a.nome.localeCompare(b.nome);
      if (sortBy === "nome-desc") return b.nome.localeCompare(a.nome);
      if (sortBy === "faturamento-desc") return (clientRevenue[b.id] || 0) - (clientRevenue[a.id] || 0);
      if (sortBy === "faturamento-asc") return (clientRevenue[a.id] || 0) - (clientRevenue[b.id] || 0);
      return 0;
    });
  }, [clientes, search, sortBy, clientRevenue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!isMobile && (
          <Button onClick={() => navigate("/clientes/novo")}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        )}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-56 bg-muted/30 h-10 border-border">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome-asc">🔤 Nome (A-Z)</SelectItem>
                <SelectItem value="nome-desc">🔤 Nome (Z-A)</SelectItem>
                <SelectItem value="faturamento-desc">💰 Faturamento (Maior)</SelectItem>
                <SelectItem value="faturamento-asc">💰 Faturamento (Menor)</SelectItem>
              </SelectContent>
           </Select>
           {(search || sortBy !== "nome-asc") && (
             <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setSortBy("nome-asc"); }} className="shrink-0 h-10 w-10">
               <X className="h-4 w-4" />
             </Button>
           )}
        </div>
      </div>

      {topClients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" />
              Top 5 por Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {topClients.map((tc, i) => (
                <motion.div
                  key={tc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="cursor-pointer rounded-lg border border-border p-2.5 text-center hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/clientes/${tc.id}`)}
                >
                  <p className="text-[10px] text-muted-foreground">#{i + 1}</p>
                  <p className="text-xs font-semibold truncate">{tc.nome}</p>
                  <p className="font-heading font-bold text-primary text-xs mt-0.5">
                    {formatCurrency(tc.total)}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Carregando...</p>
      ) : clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">
              Você ainda não possui clientes cadastrados
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Cadastre seu primeiro cliente para começar a registrar receitas.
            </p>
            <Button onClick={() => navigate("/clientes/novo")}>
              <Plus className="mr-2 h-4 w-4" /> Cadastrar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Nenhum cliente encontrado para "{search}".
        </p>
      ) : isMobile ? (
        /* ── Mobile: Card list ── */
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/clientes/${c.id}`)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{c.nome}</p>
                  {clientPending[c.id] && (
                    <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Possui cobranças pendentes" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {c.email || c.telefone || "Sem contato"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading font-bold text-sm text-primary">
                  {formatCurrency(clientRevenue[c.id] ?? 0)}
                </p>
              </div>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}>
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clientes/editar/${c.id}`); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            </motion.div>
          ))}
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Todos os Clientes</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell className="font-medium text-left">
                      <div className="flex items-center gap-2">
                        {c.nome}
                        {clientPending[c.id] && (
                          <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Possui cobranças pendentes" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-left">{c.telefone ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(clientRevenue[c.id] ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/clientes/editar/${c.id}`); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
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
          </CardContent>
        </Card>
      )}

      {/* FAB for mobile */}
      {isMobile && (
        <button
          onClick={() => navigate("/clientes/novo")}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
