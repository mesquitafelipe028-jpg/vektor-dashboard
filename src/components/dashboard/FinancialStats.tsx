import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, Landmark, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";

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
}: FinancialStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Total */}
      <Card className="group relative overflow-hidden border-none bg-emerald-500/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider">Saldo Total</p>
            <h3 className={`text-2xl font-bold tracking-tight ${saldoTotal < 0 ? "text-destructive" : "text-foreground"}`}>
              {formatCurrency(saldoTotal)}
            </h3>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-emerald-600/60 font-medium">
            <ShieldCheck className="h-3 w-3" />
            Sincronizado
          </div>
        </CardContent>
      </Card>

      {/* Entradas */}
      <Card className="group relative overflow-hidden border-none bg-primary/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Entradas (Mês)</p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(faturamentoMes)}</h3>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-primary font-bold">
            <ArrowUpRight className="h-3 w-3" />
            Receitas do período
          </div>
        </CardContent>
      </Card>

      {/* Saídas */}
      <Card className="group relative overflow-hidden border-none bg-rose-500/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent opacity-50" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/20 text-rose-500 group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-rose-600/80 uppercase tracking-wider">Saídas (Mês)</p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(despesasMesTotal)}</h3>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-rose-500 font-bold">
            <ArrowDownRight className="h-3 w-3" />
            Despesas do período
          </div>
        </CardContent>
      </Card>

      {/* Investimentos */}
      <Card className="group relative overflow-hidden border-none bg-blue-500/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-50" />
        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform duration-300">
              <Landmark className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-600/80 uppercase tracking-wider">Investimentos</p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalInvestido)}</h3>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-blue-600/60 font-medium">
            <Landmark className="h-3 w-3" />
            Patrimônio investido
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
