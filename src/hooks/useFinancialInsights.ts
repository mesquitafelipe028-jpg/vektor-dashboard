import { useMemo } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ShieldAlert, ThumbsUp } from "lucide-react";

type InsightType = "warning" | "danger" | "info" | "success";

export interface FinancialInsight {
  type: InsightType;
  title: string;
  description: string;
  icon: typeof TrendingDown;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumByMonth(items: { data: string; valor: number }[], key: string) {
  return items.filter((i) => i.data.startsWith(key)).reduce((s, i) => s + i.valor, 0);
}

export function useFinancialInsights(
  receitas: { data: string; valor: number }[],
  despesas: { data: string; valor: number }[]
): FinancialInsight[] {
  return useMemo(() => {
    const insights: FinancialInsight[] = [];
    const now = new Date();
    const curKey = getMonthKey(now);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = getMonthKey(prevDate);

    const recCur = sumByMonth(receitas, curKey);
    const recPrev = sumByMonth(receitas, prevKey);
    const despCur = sumByMonth(despesas, curKey);
    const despPrev = sumByMonth(despesas, prevKey);
    const lucroCur = recCur - despCur;

    // 1. Aumento de despesas > 20%
    if (despPrev > 0 && (despCur - despPrev) / despPrev > 0.2) {
      const pct = Math.round(((despCur - despPrev) / despPrev) * 100);
      insights.push({
        type: "warning",
        title: "Aumento de despesas",
        description: `Suas despesas subiram ${pct}% em relação ao mês anterior.`,
        icon: TrendingUp,
      });
    }

    // 2. Queda de faturamento > 15%
    if (recPrev > 0 && (recPrev - recCur) / recPrev > 0.15) {
      const pct = Math.round(((recPrev - recCur) / recPrev) * 100);
      insights.push({
        type: "danger",
        title: "Queda de faturamento",
        description: `Seu faturamento caiu ${pct}% em relação ao mês anterior.`,
        icon: TrendingDown,
      });
    }

    // 3. Lucro abaixo da média (últimos 6 meses)
    const lucros: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = getMonthKey(d);
      lucros.push(sumByMonth(receitas, k) - sumByMonth(despesas, k));
    }
    const avgLucro = lucros.reduce((a, b) => a + b, 0) / (lucros.length || 1);

    if (avgLucro > 0 && lucroCur < avgLucro * 0.7) {
      insights.push({
        type: "warning",
        title: "Lucro abaixo da média",
        description: `Seu lucro este mês está abaixo de 70% da média dos últimos 6 meses.`,
        icon: AlertTriangle,
      });
    }

    // 4. Previsão de déficit
    if (despCur > recCur && recCur > 0) {
      insights.push({
        type: "danger",
        title: "Previsão de déficit",
        description: `Suas despesas superam o faturamento neste mês. Atenção ao fluxo de caixa.`,
        icon: ShieldAlert,
      });
    }

    // 5. Mês positivo
    if (avgLucro > 0 && lucroCur > avgLucro) {
      insights.push({
        type: "success",
        title: "Mês positivo!",
        description: `Seu lucro está acima da média dos últimos 6 meses. Continue assim!`,
        icon: ThumbsUp,
      });
    }

    return insights;
  }, [receitas, despesas]);
}
