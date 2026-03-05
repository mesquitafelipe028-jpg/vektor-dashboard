import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, Check } from "lucide-react";
import { formatCurrency, totalReceitas } from "@/lib/mockData";

const dasValue = 71.60;
const limiteMEI = 81000;
const faturamentoAnual = totalReceitas * 4; // simulated annual

const dasMonths = [
  { month: "Janeiro", status: "pago" },
  { month: "Fevereiro", status: "pago" },
  { month: "Março", status: "pendente" },
  { month: "Abril", status: "futuro" },
  { month: "Maio", status: "futuro" },
  { month: "Junho", status: "futuro" },
];

export default function Taxes() {
  const percentLimit = Math.min((faturamentoAnual / limiteMEI) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Impostos MEI</h1>
        <p className="text-muted-foreground text-sm">Controle do DAS e limite de faturamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">DAS Mensal</p>
                <p className="text-2xl font-bold font-heading">{formatCurrency(dasValue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Valor fixo mensal para MEI (Comércio e Serviços)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`h-6 w-6 ${percentLimit > 80 ? "text-destructive" : "text-accent"}`} />
              <div>
                <p className="text-sm text-muted-foreground">Limite Anual MEI</p>
                <p className="text-2xl font-bold font-heading">{formatCurrency(faturamentoAnual)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(limiteMEI)}</span></p>
              </div>
            </div>
            <Progress value={percentLimit} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{percentLimit.toFixed(1)}% do limite utilizado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Controle do DAS</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dasMonths.map((m) => (
              <div key={m.month} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="font-medium">{m.month}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{formatCurrency(dasValue)}</span>
                  <Badge variant={m.status === "pago" ? "default" : m.status === "pendente" ? "secondary" : "outline"}>
                    {m.status === "pago" && <Check className="mr-1 h-3 w-3" />}
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
