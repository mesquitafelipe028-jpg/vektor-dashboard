import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingUp, Wallet, PiggyBank, Lightbulb, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const PRESET_RATES = [
  { label: "6%", value: 6 },
  { label: "10%", value: 10 },
  { label: "14%", value: 14 },
];

function calcCompoundInterest(
  initial: number,
  monthly: number,
  annualRate: number,
  totalMonths: number,
  inflationRate: number,
) {
  const realAnnualRate = inflationRate > 0
    ? ((1 + annualRate / 100) / (1 + inflationRate / 100) - 1)
    : annualRate / 100;
  const monthlyRate = Math.pow(1 + realAnnualRate, 1 / 12) - 1;
  const chartData: { ano: number; acumulado: number; investido: number }[] = [];

  let balance = initial;
  let totalInvested = initial;

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    totalInvested += monthly;

    if (m % 12 === 0 || m === totalMonths) {
      chartData.push({
        ano: Math.round((m / 12) * 10) / 10,
        acumulado: Math.round(balance * 100) / 100,
        investido: Math.round(totalInvested * 100) / 100,
      });
    }
  }

  const passiveIncome = balance * 0.006;

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    finalValue: Math.round(balance * 100) / 100,
    profit: Math.round((balance - totalInvested) * 100) / 100,
    passiveIncome: Math.round(passiveIncome * 100) / 100,
    chartData,
  };
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyInput(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export default function InvestmentCalculator() {
  const [initialDisplay, setInitialDisplay] = useState("");
  const [monthlyDisplay, setMonthlyDisplay] = useState("");
  const [rate, setRate] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<"anos" | "meses">("anos");
  const [inflation, setInflation] = useState("");
  const [calculated, setCalculated] = useState(false);

  const handleCurrencyChange = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(formatCurrencyInput(e.target.value));
      setCalculated(false);
    },
    [],
  );

  const totalMonths = useMemo(() => {
    const v = parseFloat(timeValue) || 0;
    return timeUnit === "anos" ? v * 12 : v;
  }, [timeValue, timeUnit]);

  const result = useMemo(() => {
    if (!calculated) return null;
    const i = parseCurrencyInput(initialDisplay);
    const m = parseCurrencyInput(monthlyDisplay);
    const r = parseFloat(rate) || 0;
    const inf = parseFloat(inflation) || 0;
    if (totalMonths <= 0) return null;
    return calcCompoundInterest(i, m, r, totalMonths, inf);
  }, [calculated, initialDisplay, monthlyDisplay, rate, totalMonths, inflation]);

  const insightText = useMemo(() => {
    if (!result) return "";
    const m = parseCurrencyInput(monthlyDisplay);
    const yrs = totalMonths / 12;
    const r = parseFloat(rate) || 0;
    return `Investindo ${fmt(m)} por mês durante ${yrs.toFixed(1).replace(".0", "")} ${yrs === 1 ? "ano" : "anos"} a ${r}% a.a., seu patrimônio pode chegar a ${fmt(result.finalValue)}, gerando uma renda passiva estimada de ${fmt(result.passiveIncome)}/mês.`;
  }, [result, monthlyDisplay, totalMonths, rate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Simulador de Investimentos</h1>
      </div>

      {/* Card 1 — Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Simulação de investimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Currency fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quanto você possui?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  className="pl-9"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={initialDisplay}
                  onChange={handleCurrencyChange(setInitialDisplay)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quanto pode poupar por mês?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  className="pl-9"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={monthlyDisplay}
                  onChange={handleCurrencyChange(setMonthlyDisplay)}
                />
              </div>
            </div>
          </div>

          {/* Rate + presets */}
          <div className="space-y-2">
            <Label>Taxa de rendimento anual (%)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="number" min="0" step="0.01" placeholder="10"
                className="w-24"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setCalculated(false); }}
              />
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
          </div>

          {/* Time: number + unit selector */}
          <div className="space-y-2">
            <Label>Tempo de investimento</Label>
            <div className="flex gap-2">
              <Input
                type="number" min="1" step="1" placeholder="10"
                className="w-24"
                value={timeValue}
                onChange={(e) => { setTimeValue(e.target.value); setCalculated(false); }}
              />
              <Select
                value={timeUnit}
                onValueChange={(v) => { setTimeUnit(v as "anos" | "meses"); setCalculated(false); }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anos">Anos</SelectItem>
                  <SelectItem value="meses">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inflation */}
          <div className="space-y-1">
            <Label>Inflação anual (%) <span className="text-muted-foreground font-normal">— opcional</span></Label>
            <Input
              type="number" min="0" step="0.1" placeholder="4"
              className="w-24"
              value={inflation}
              onChange={(e) => { setInflation(e.target.value); setCalculated(false); }}
            />
            <p className="text-xs text-muted-foreground">Use 4% ao ano como média de inflação no Brasil (opcional)</p>
          </div>

          <Button className="w-full" size="lg" onClick={() => setCalculated(true)}>
            <Calculator className="h-4 w-4 mr-2" /> Simular investimento
          </Button>
        </CardContent>
      </Card>

      {/* Card 2 — Results */}
      {result && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultado da simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main highlight */}
              <div className="flex flex-col items-center text-center py-2">
                <p className="text-sm text-muted-foreground mb-1">Patrimônio acumulado</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-chart-2">{fmt(result.finalValue)}</p>
              </div>

              {/* Grid of stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total investido</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.totalInvested)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-chart-2/15 shrink-0">
                    <TrendingUp className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Juros acumulados</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.profit)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/15 shrink-0">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Renda passiva estimada</p>
                    <p className="text-base font-bold text-foreground">{fmt(result.passiveIncome)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução do seu investimento</CardTitle>
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
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `R$${(v / 1_000_000).toFixed(1)}M`
                          : `R$${(v / 1000).toFixed(0)}k`
                      }
                      className="text-xs fill-muted-foreground"
                      width={65}
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

          {/* Insight */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-5 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-chart-2 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{insightText}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
