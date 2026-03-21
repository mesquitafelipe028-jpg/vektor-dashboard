import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, Landmark, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface FinancialStatsProps {
  isLoading: boolean;
  saldoTotal: number;
  faturamentoMes: number;
  despesasMesTotal: number;
  totalInvestido: number;
  saldoMes: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export function FinancialStats({
  isLoading,
  saldoTotal,
  faturamentoMes,
  despesasMesTotal,
  totalInvestido,
  saldoMes
}: FinancialStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-300 bg-card overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5 flex items-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground/80 mb-0.5">Saldo Total</p>
            <h3 className={`text-2xl font-bold tracking-tight truncate leading-none ${saldoTotal < 0 ? "text-destructive" : "text-foreground"}`}>
              {formatCurrency(saldoTotal)}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/5 shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-300">
        <CardContent className="p-5 flex items-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground/80 mb-0.5">Entradas (Mês)</p>
            <h3 className="text-xl font-bold tracking-tight text-primary truncate leading-none">{formatCurrency(faturamentoMes)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/10 shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-300">
        <CardContent className="p-5 flex items-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 shrink-0 border border-destructive/20">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground/80 mb-0.5">Saídas (Mês)</p>
            <h3 className="text-xl font-bold tracking-tight text-destructive truncate leading-none">{formatCurrency(despesasMesTotal)}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/5 shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5 duration-300">
        <CardContent className="p-5 flex items-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0 border border-primary/20">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground/80 mb-0.5">Investimentos</p>
            <h3 className="text-xl font-bold tracking-tight text-primary truncate leading-none">{formatCurrency(totalInvestido)}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
