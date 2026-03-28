import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Plus, DollarSign, TrendingDown, Building2, FileText, Trash2, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ReceitaExtended, DespesaExtended } from "@/types/transactions";

interface DayTransactionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: Date | null;
  monthStr?: string | null;
  categoryStr?: string | null;
  receitas: ReceitaExtended[];
  despesas: DespesaExtended[];
  onAddTransaction: (date: string) => void;
}

export function DayTransactionsDrawer({ 
  open, 
  onOpenChange, 
  date, 
  monthStr,
  categoryStr,
  receitas, 
  despesas,
  onAddTransaction
}: DayTransactionsDrawerProps) {
  
  const transactions = useMemo(() => {
    if (!date && !monthStr) return [];

    let rFiltradas: any[] = receitas;
    let dFiltradas: any[] = despesas;

    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      rFiltradas = rFiltradas.filter(r => r.data === dateStr);
      dFiltradas = dFiltradas.filter(d => d.data === dateStr);
    } else if (monthStr) {
      rFiltradas = rFiltradas.filter(r => r.data.startsWith(monthStr));
      dFiltradas = dFiltradas.filter(d => d.data.startsWith(monthStr));
      
      if (categoryStr) {
        dFiltradas = dFiltradas.filter(d => d.categoria === categoryStr);
        rFiltradas = []; // Categoria chart only shows expenses.
      }
    }

    rFiltradas = rFiltradas.map(r => ({
      ...r,
      kind: 'receita' as const,
      isPending: r.status !== 'recebido',
      icon: (r.forma_pagamento?.toLowerCase().includes("transferência") || r.categoria?.toLowerCase().includes("transferência")) ? Building2 : DollarSign,
      colorClass: r.status !== 'recebido' ? "text-amber-500" : "text-primary",
      bgClass: r.status !== 'recebido' ? "bg-amber-500/10" : "bg-primary/10",
    }));

    dFiltradas = dFiltradas.map(d => ({
      ...d,
      kind: 'despesa' as const,
      isPending: d.status !== 'pago',
      icon: d.categoria?.toLowerCase().includes("transferência") ? Building2 : TrendingDown,
      colorClass: d.status !== 'pago' ? "text-amber-500" : "text-destructive",
      bgClass: d.status !== 'pago' ? "bg-amber-500/10" : "bg-destructive/10",
    }));

    return [...rFiltradas, ...dFiltradas].sort((a, b) => b.valor - a.valor);
  }, [date, monthStr, categoryStr, receitas, despesas]);

  let dateLabel = "";
  if (date) dateLabel = format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
  else if (categoryStr && monthStr) {
    const [year, month] = monthStr.split('-');
    const m = new Date(parseInt(year), parseInt(month) - 1, 1);
    dateLabel = `${categoryStr} (${format(m, "MMMM/yy", { locale: ptBR })})`;
  } else if (monthStr) {
    const [year, month] = monthStr.split('-');
    const m = new Date(parseInt(year), parseInt(month) - 1, 1);
    dateLabel = `Resumo de ${format(m, "MMMM, yyyy", { locale: ptBR })}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-[425px] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading capitalize text-xl">{dateLabel}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 opacity-20" />
              <p className="text-sm">Nenhuma movimentação neste dia.</p>
            </div>
          ) : (
            <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto overflow-x-hidden pr-2">
              <div className="space-y-3">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
                    <div className={`h-10 w-10 flex-[0_0_auto] rounded-full flex items-center justify-center ${t.bgClass}`}>
                      <t.icon className={`h-5 w-5 ${t.colorClass}`} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold truncate leading-tight">
                          {t.descricao || 'Sem descrição'}
                        </p>
                        <span className={`text-sm font-bold whitespace-nowrap flex-[0_0_auto] ${t.kind === 'receita' ? 'text-primary' : 'text-destructive'} ${t.isPending ? 'opacity-70' : ''}`}>
                          {t.kind === 'receita' ? '+' : '-'}{formatCurrency(t.valor)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium truncate">
                            {t.categoria || 'Outros'}
                        </span>
                        {t.isPending && (
                           <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded flex-[0_0_auto]">
                             Pendente
                           </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button 
            className="w-full" 
            onClick={() => {
              if (date) onAddTransaction(format(date, "yyyy-MM-dd"));
              else if (monthStr) onAddTransaction(`${monthStr}-01`);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar ao Dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
