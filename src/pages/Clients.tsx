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
import { Plus, Pencil, Trash2, Users, Search, Trophy, Eye, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/mockData";

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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
        .from("receitas")
        .select("id, valor, data, cliente_id")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
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
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente excluído!");
    },
    onError: () => toast.error("Erro ao excluir cliente."),
  });

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

  const clientRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    receitas.forEach((r) => {
      if (r.cliente_id) map[r.cliente_id] = (map[r.cliente_id] || 0) + r.valor;
    });
    return map;
  }, [receitas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus clientes e acompanhe o faturamento
          </p>
        </div>
        <Button onClick={() => navigate("/clientes/novo")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

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
              <Button onClick={() => navigate("/clientes/novo")}>
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
                          onClick={(e) => { e.stopPropagation(); navigate(`/clientes/editar/${c.id}`); }}
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
    </div>
  );
}
