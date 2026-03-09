import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle, CalendarCheck, CalendarClock, Clock, CheckCircle,
  MessageSquare, DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { StatusBadge } from "@/components/transaction/TransactionBadge";
import { BillingReminderSheet } from "@/components/billing/BillingReminderSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { ReceitaExtended } from "@/types/transactions";

interface ReceivableWithClient extends ReceitaExtended {
  cliente_nome?: string;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
}

export default function Receivables() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [reminderData, setReminderData] = useState<ReceivableWithClient | null>(null);

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*, clientes(nome, telefone, email)")
        .in("status", ["pendente", "atrasado"] as any)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((r) => ({
        ...r,
        cliente_nome: r.clientes?.nome,
        cliente_telefone: r.clientes?.telefone,
        cliente_email: r.clientes?.email,
      })) as ReceivableWithClient[];
    },
    enabled: !!user,
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("receitas")
        .update({ status: "recebido" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Pagamento registrado!");
    },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const fimSemana = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const groups = useMemo(() => {
    const atrasados = receivables.filter((r) => r.data < hoje && r.status !== "recebido");
    const hojeList = receivables.filter((r) => r.data === hoje);
    const semana = receivables.filter((r) => r.data > hoje && r.data <= fimSemana);
    const futuras = receivables.filter((r) => r.data > fimSemana);
    return { atrasados, hoje: hojeList, semana, futuras };
  }, [receivables, hoje, fimSemana]);

  const kpis = [
    {
      label: "Atrasados",
      value: formatCurrency(groups.atrasados.reduce((s, r) => s + r.valor, 0)),
      count: groups.atrasados.length,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Hoje",
      value: formatCurrency(groups.hoje.reduce((s, r) => s + r.valor, 0)),
      count: groups.hoje.length,
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Esta Semana",
      value: formatCurrency(groups.semana.reduce((s, r) => s + r.valor, 0)),
      count: groups.semana.length,
      icon: CalendarClock,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ];

  const renderCard = (r: ReceivableWithClient, i: number) => (
    <motion.div
      key={r.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="rounded-lg border border-border p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{r.descricao}</p>
          {r.cliente_nome && (
            <p className="text-xs text-muted-foreground mt-0.5">{r.cliente_nome}</p>
          )}
        </div>
        <span className="font-heading font-bold text-base shrink-0">
          {formatCurrency(r.valor)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(r.data)}</span>
          <StatusBadge status={r.data < hoje ? "atrasado" : (r.status || "pendente")} type="receita" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setReminderData(r)}
          >
            <MessageSquare className="h-3 w-3" />
            {!isMobile && "Cobrar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => markPaid.mutate(r.id)}
            disabled={markPaid.isPending}
          >
            <CheckCircle className="h-3 w-3" />
            {!isMobile && "Recebido"}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderSection = (title: string, items: ReceivableWithClient[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="space-y-2">
          {items.map((r, i) => renderCard(r, i))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Central de Cobranças</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas contas a receber</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${k.bg} mb-2`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <p className="font-heading text-lg font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">
                  {k.count} {k.label.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {receivables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma cobrança pendente. Tudo em dia! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="todos" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="todos" className="flex-1">Todos</TabsTrigger>
            <TabsTrigger value="atrasados" className="flex-1">Atrasados</TabsTrigger>
            <TabsTrigger value="hoje" className="flex-1">Hoje</TabsTrigger>
            <TabsTrigger value="semana" className="flex-1">Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-6">
            {renderSection("Atrasados", groups.atrasados, <AlertTriangle className="h-4 w-4 text-destructive" />)}
            {renderSection("Hoje", groups.hoje, <CalendarCheck className="h-4 w-4 text-primary" />)}
            {renderSection("Esta Semana", groups.semana, <CalendarClock className="h-4 w-4 text-chart-2" />)}
            {renderSection("Futuras", groups.futuras, <Clock className="h-4 w-4 text-muted-foreground" />)}
          </TabsContent>

          <TabsContent value="atrasados" className="space-y-2">
            {groups.atrasados.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma cobrança atrasada</p>
            ) : groups.atrasados.map((r, i) => renderCard(r, i))}
          </TabsContent>

          <TabsContent value="hoje" className="space-y-2">
            {groups.hoje.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma cobrança para hoje</p>
            ) : groups.hoje.map((r, i) => renderCard(r, i))}
          </TabsContent>

          <TabsContent value="semana" className="space-y-2">
            {groups.semana.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma cobrança esta semana</p>
            ) : groups.semana.map((r, i) => renderCard(r, i))}
          </TabsContent>
        </Tabs>
      )}

      {/* Billing Reminder Sheet */}
      {reminderData && (
        <BillingReminderSheet
          open={!!reminderData}
          onOpenChange={(open) => !open && setReminderData(null)}
          clientName={reminderData.cliente_nome || "Cliente"}
          clientPhone={reminderData.cliente_telefone}
          clientEmail={reminderData.cliente_email}
          description={reminderData.descricao}
          amount={reminderData.valor}
          dueDate={reminderData.data}
        />
      )}
    </div>
  );
}
