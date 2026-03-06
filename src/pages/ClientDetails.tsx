import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Plus, DollarSign, Hash, Calendar, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/mockData";

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

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
      return data;
    },
    enabled: !!user && !!id,
  });

  const stats = useMemo(() => {
    const totalFaturado = receitas.reduce((s, r) => s + r.valor, 0);
    const totalServicos = receitas.length;
    const ultimaTransacao = receitas.length > 0 ? receitas[0].data : null;
    return { totalFaturado, totalServicos, ultimaTransacao };
  }, [receitas]);

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

  const statCards = [
    {
      label: "Total Faturado",
      value: formatCurrency(stats.totalFaturado),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      label: "Serviços Realizados",
      value: String(stats.totalServicos),
      icon: Hash,
      color: "text-chart-3",
    },
    {
      label: "Última Transação",
      value: stats.ultimaTransacao ? formatDate(stats.ultimaTransacao) : "—",
      icon: Calendar,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">{cliente.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {[cliente.email, cliente.telefone].filter(Boolean).join(" • ") || "Sem contato cadastrado"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/receitas")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar Receita
        </Button>
      </div>

      {/* Client Info Card */}
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="font-heading text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue History */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Histórico de Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReceitas ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : receitas.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma receita vinculada a este cliente.
              </p>
              <Button variant="outline" onClick={() => navigate("/receitas")}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar Receita
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Data</TableHead>
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
                      <TableCell className="font-medium">{r.descricao}</TableCell>
                      <TableCell>{r.forma_pagamento ?? "—"}</TableCell>
                      <TableCell>{formatDate(r.data)}</TableCell>
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
    </div>
  );
}
