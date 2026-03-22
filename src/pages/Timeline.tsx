import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, CreditCard, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: "receita" | "despesa" | "cartao";
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  clientName?: string | null;
  status?: string;
}

const PAGE_SIZE = 30;

const typeConfig = {
  receita: { icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Receita" },
  despesa: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10", label: "Despesa" },
  cartao: { icon: CreditCard, color: "text-chart-1", bg: "bg-chart-1/10", label: "Cartão" },
};

export default function Timeline() {
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState("data-desc");

  const { data: transactions = [] } = useQuery({
    queryKey: ["timeline_transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, amount, date, category, status, clientes(nome)")
        .order("date", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data as any[]).map((t) => ({
        id: t.id,
        type: t.type === "income" ? ("receita" as const) : ("despesa" as const),
        description: t.description,
        amount: t.amount,
        date: t.date,
        category: t.category,
        clientName: t.clientes?.nome,
        status: t.status === "confirmed" ? (t.type === "income" ? "recebido" : "pago") : "pendente",
      }));
    },
    enabled: !!user,
  });

  const receitas = useMemo(() => transactions.filter(e => e.type === "receita"), [transactions]);
  const despesas = useMemo(() => transactions.filter(e => e.type === "despesa"), [transactions]);

  const { data: compras = [] } = useQuery({
    queryKey: ["timeline_compras_cartao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_cartao" as any)
        .select("id, descricao, valor, data, categoria")
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]).map((c) => ({
        id: c.id,
        type: "cartao" as const,
        description: c.descricao,
        amount: c.valor,
        date: c.data,
        category: c.categoria,
      }));
    },
    enabled: !!user,
  });

  const allEvents = useMemo(() => {
    const list = [...receitas, ...despesas, ...compras];
    
    return list.sort((a, b) => {
      if (sortBy === "data-desc") return b.date.localeCompare(a.date);
      if (sortBy === "data-asc") return a.date.localeCompare(b.date);
      if (sortBy === "valor-desc") return b.amount - a.amount;
      if (sortBy === "valor-asc") return a.amount - b.amount;
      return 0;
    });
  }, [receitas, despesas, compras, sortBy]);

  const renderTimeline = (events: TimelineEvent[]) => {
    const visible = events.slice(0, visibleCount);
    const grouped: Record<string, TimelineEvent[]> = {};

    for (const e of visible) {
      const key = e.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }

    const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (dateKeys.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma movimentação encontrada.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {dateKeys.map((dateKey) => {
          const parsed = parseISO(dateKey);
          const dateLabel = isValid(parsed)
            ? format(parsed, "dd MMM yyyy", { locale: ptBR })
            : dateKey;

          return (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateLabel}
                </span>
              </div>

              <div className="space-y-2 pl-3 border-l-2 border-border ml-1">
                {grouped[dateKey].map((event, i) => {
                  const config = typeConfig[event.type];
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={`${event.type}-${event.id}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 ml-3 relative"
                    >
                      {/* Connector dot */}
                      <div className="absolute -left-[1.15rem] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-background bg-border" />

                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${config.bg} shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[config.label, event.category, event.clientName].filter(Boolean).join(" • ")}
                        </p>
                      </div>

                      <span
                        className={`font-heading font-bold text-sm shrink-0 ${
                          event.type === "receita"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {event.type === "receita" ? "+" : "-"}{formatCurrency(event.amount)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {events.length > visibleCount && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Carregar mais
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Timeline Financeira</h1>
          <p className="text-sm text-muted-foreground">Todas as movimentações em ordem cronológica</p>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden lg:inline">Ordenação:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="data-desc">Mais recentes</option>
                <option value="data-asc">Mais antigos</option>
                <option value="valor-desc">Maior valor</option>
                <option value="valor-asc">Menor valor</option>
              </select>
           </div>
        </div>
      </div>

      <Tabs defaultValue="tudo" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="tudo" className="flex-1">Tudo</TabsTrigger>
          <TabsTrigger value="receitas" className="flex-1">Receitas</TabsTrigger>
          <TabsTrigger value="despesas" className="flex-1">Despesas</TabsTrigger>
          <TabsTrigger value="cartao" className="flex-1">Cartão</TabsTrigger>
        </TabsList>

        <TabsContent value="tudo">{renderTimeline(allEvents)}</TabsContent>
        <TabsContent value="receitas">{renderTimeline(receitas)}</TabsContent>
        <TabsContent value="despesas">{renderTimeline(despesas)}</TabsContent>
        <TabsContent value="cartao">{renderTimeline(compras)}</TabsContent>
      </Tabs>
    </div>
  );
}
