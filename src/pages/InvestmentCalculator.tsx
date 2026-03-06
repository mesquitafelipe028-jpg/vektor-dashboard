import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const PRESET_RATES = [
  { label: "6% ao ano", value: 6 },
  { label: "10% ao ano", value: 10 },
  { label: "14% ao ano", value: 14 },
];

function calcCompoundInterest(
  initial: number,
  monthly: number,
  annualRate: number,
  years: number,
) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const chartData: { ano: number; acumulado: number; investido: number }[] = [];

  let balance = initial;
  let totalInvested = initial;

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    totalInvested += monthly;

    if (m % 12 === 0) {
      chartData.push({
        ano: m / 12,
        acumulado: Math.round(balance * 100) / 100,
        investido: Math.round(totalInvested * 100) / 100,
      });
    }
  }

  // push last point if period not divisible by 12
  if (months % 12 !== 0) {
    chartData.push({
      ano: Math.round((months / 12) * 10) / 10,
      acumulado: Math.round(balance * 100) / 100,
      investido: Math.round(totalInvested * 100) / 100,
    });
  }

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    finalValue: Math.round(balance * 100) / 100,
    profit: Math.round((balance - totalInvested) * 100) / 100,
    chartData,
  };
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function InvestmentCalculator() {
  const [initial, setInitial] = useState("");
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [calculated, setCalculated] = useState(false);

  const result = useMemo(() => {
    if (!calculated) return null;
    const i = parseFloat(initial) || 0;
    const m = parseFloat(monthly) || 0;
    const r = parseFloat(rate) || 0;
    const y = parseFloat(years) || 0;
    if (y <= 0) return null;
    return calcCompoundInterest(i, m, r, y);
  }, [calculated, initial, monthly, rate, years]);

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          Calculadora de Investimentos
        </h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Simulação de Juros Compostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor inicial (R$)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0,00"
                value={initial}
                onChange={(e) => { setInitial(e.target.value); setCalculated(false); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Investimento mensal (R$)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0,00"
                value={monthly}
                onChange={(e) => { setMonthly(e.target.value); setCalculated(false); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de rendimento anual (%)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="10"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setCalculated(false); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Período de investimento (anos)</Label>
              <Input
                type="number" min="1" step="1" placeholder="5"
                value={years}
                onChange={(e) => { setYears(e.target.value); setCalculated(false); }}
              />
            </div>
          </div>

          {/* Preset rates */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-1">Taxas rápidas:</span>
            {PRESET_RATES.map((p) => (
              <Button
                key={p.value}
                variant={rate === String(p.value) ? "default" : "outline"}
                size="sm"
                onClick={() => { setRate(String(p.value)); setCalculated(false); }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <Button className="w-full sm:w-auto" onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" /> Calcular
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 shrink-0">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Investido</p>
                  <p className="text-lg font-bold text-foreground">{fmt(result.totalInvested)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-chart-2/10 shrink-0">
                  <PiggyBank className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Final</p>
                  <p className="text-lg font-bold text-foreground">{fmt(result.finalValue)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-chart-1/10 shrink-0">
                  <TrendingUp className="h-6 w-6 text-chart-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Obtido</p>
                  <p className="text-lg font-bold text-foreground">{fmt(result.profit)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução do Patrimônio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="gradAccum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="ano"
                      tickFormatter={(v) => `${v}a`}
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      className="text-xs fill-muted-foreground"
                      width={60}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        fmt(v),
                        name === "acumulado" ? "Acumulado" : "Investido",
                      ]}
                      labelFormatter={(l) => `Ano ${l}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone" dataKey="investido" name="investido"
                      stroke="hsl(var(--primary))" fill="url(#gradInv)" strokeWidth={2}
                    />
                    <Area
                      type="monotone" dataKey="acumulado" name="acumulado"
                      stroke="hsl(var(--chart-2))" fill="url(#gradAccum)" strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
