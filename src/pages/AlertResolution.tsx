import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { getLocalDateString, formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Check, Trash2, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export default function AlertResolution() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const typeParam = params.get("type") || "receitas"; // "receitas" ou "despesas"
  
  const { raw, loading } = useFinancialData();
  const qc = useQueryClient();
  const todayStr = getLocalDateString();
  const currentMonth = todayStr.slice(0, 7);

  const isReceitas = typeParam === "receitas";
  
  const items = useMemo(() => {
    if (!raw) return [];
    if (isReceitas) {
      return (raw.receitas || [])
        .filter((r) => r.status === "pending" && r.date.startsWith(currentMonth) && r.date <= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      return (raw.despesas || [])
        .filter((d) => d.status === "pending" && d.date.startsWith(currentMonth) && d.date < todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [raw, isReceitas, todayStr, currentMonth]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "recebido" | "pago" }) => {
      // In the Unified Ledger, updates should go to "transactions"
      const { error } = await supabase
        .from("transactions")
        .update({ status: "confirmed" }) // confirmed maps to recebido/pago
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isReceitas ? "Receita confirmada com sucesso!" : "Despesa paga com sucesso!");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
    onError: (e: any) => toast.error(`Erro ao confirmar: ${e.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido permanentemente.");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
    },
    onError: (e: any) => toast.error(`Erro ao excluir: ${e.message}`)
  });

  if (loading) {
    return (
       <div className="flex items-center justify-center h-[50vh]">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
       </div>
    );
  }

  const PageTitle = isReceitas ? "Cobranças Pendentes" : "Despesas Vencidas";
  const PageDesc = isReceitas ? 
    "Receitas que passaram da data esperada e ainda não constam como recebidas em conta." : 
    "Contas a pagar que já passaram do dia do vencimento previsto.";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 mt-1" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            Central de Pendências
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Visualize, deduza ou declare como pago os registros antigos do seu sistema financeiro.
          </p>
        </div>
      </div>

      <Card className="border-t-4 border-t-amber-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-bold font-heading">{PageTitle}</h2>
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 text-xs">
              {items.length} itens travados
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {PageDesc} Você pode excluir registros passados (caso tenham sido testes ou cancelados) ou confirmar seus pagamentos reais para alinhar seu saldo virtual.
          </p>

          <Separator className="mb-6" />

          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
               <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto opacity-70" />
               <p className="font-heading text-lg font-bold">Nenhuma pendência encontrada</p>
               <p className="text-sm text-muted-foreground">Sua contabilidade está reluzindo de limpa!</p>
               <Button onClick={() => navigate("/dashboard")} variant="outline" className="mt-4">
                 Voltar ao Dashboard
               </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                 const isOverdueHeavy = false; // Add heavy overdue logic if needed
                 return (
                   <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-muted/10 transition-colors">
                     
                     <div className="flex items-center gap-4 min-w-0">
                       <CategoryIcon category={item.category || item.categoria} type={isReceitas ? "receita" : "despesa"} size={36} />
                       <div className="overflow-hidden">
                         <h3 className="font-semibold text-sm truncate">{item.description || item.descricao}</h3>
                         <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">{item.category || item.categoria || "Outros"}</span>
                            <span className="text-muted-foreground/30 text-xs">•</span>
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive`}>
                              Vencido em {formatDate(item.date || item.data)}
                            </span>
                         </div>
                       </div>
                     </div>

                     <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 sm:pl-4 sm:border-l">
                       <span className={`font-heading font-bold text-lg ${isReceitas ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {isReceitas ? "+" : "-"}{formatCurrency(item.amount || item.valor)}
                       </span>
                       
                       <div className="flex gap-2">
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="h-8 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                           onClick={() => toggleStatusMutation.mutate({ id: item.id, newStatus: isReceitas ? "recebido" : "pago" })}
                           disabled={toggleStatusMutation.isPending}
                         >
                           <Check className="h-3.5 w-3.5 mr-1" />
                           Baixar as {isReceitas ? "Recebido" : "Pago"}
                         </Button>

                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Excluir e Ignorar Definitivamente?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Este registro vai sumir do seu sistema. Use isso se essa pendência foi um lançamento cancelado ou um teste que ficou poluindo o seu dashboard.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Voltar</AlertDialogCancel>
                               <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive hover:bg-destructive/90">
                                 Sim, Excluir Descartar
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                     </div>

                   </div>
                 )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
