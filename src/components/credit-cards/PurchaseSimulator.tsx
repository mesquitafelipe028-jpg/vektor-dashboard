import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatCurrency, getLocalDateString } from "@/lib/utils";
import { Calculator } from "lucide-react";
import { CalculatorModal } from "@/components/modals/CalculatorModal";

interface SimulatorProps {
  cartaoDiaFechamento: number;
}

export function PurchaseSimulator({ cartaoDiaFechamento }: SimulatorProps) {
  const [valorTotal, setValorTotal] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [dataCompra, setDataCompra] = useState(getLocalDateString());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const simulacao = useMemo(() => {
    const valorNum = parseFloat(valorTotal);
    const parcelasNum = parseInt(parcelas, 10);
    
    if (!valorNum || !parcelasNum || parcelasNum < 1 || !dataCompra) return null;

    const valorParcela = valorNum / parcelasNum;
    const resultado = [];

    let currentCompra = new Date(dataCompra + "T12:00:00");

    for (let i = 1; i <= parcelasNum; i++) {
        const dia = currentCompra.getDate();
        let refY = currentCompra.getFullYear();
        let refM = currentCompra.getMonth(); // 0-11
        
        // Se a compra caiu depois do fechamento, a fatura é a do próximo mês
        if (dia >= cartaoDiaFechamento) {
            refM += 1;
            if (refM > 11) {
                refM = 0;
                refY += 1;
            }
        }
        
        const mesRefStr = `${refY}-${String(refM + 1).padStart(2, "0")}`;
        
        // Formatar o rotulo do mes
        const dFormat = new Date(refY, refM);
        const label = dFormat.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        const finalLabel = label.charAt(0).toUpperCase() + label.slice(1);

        resultado.push({
            parcela: i,
            mesRef: mesRefStr,
            label: finalLabel,
            valor: valorParcela
        });

        // Avancar 1 mes exato para a proxima compra/parcela
        currentCompra.setMonth(currentCompra.getMonth() + 1);
    }
    return resultado;

  }, [valorTotal, parcelas, dataCompra, cartaoDiaFechamento]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Calculator className="mr-2 h-4 w-4" />
          Simular Compra
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Simulador de Compras</SheetTitle>
          <SheetDescription>
            Veja como uma compra parcelada impactará suas próximas faturas.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Valor Total (R$)</Label>
                <button 
                  type="button" 
                  onClick={() => setManualMode(!manualMode)} 
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Alternar para digitação manual se a calculadora falhar"
                >
                  {manualMode ? "Usar Módulo Inteligente" : "Digitar Manualmente"}
                </button>
              </div>
              {manualMode ? (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  placeholder="0.00"
                  className="h-10 text-sm"
                  autoFocus
                />
              ) : (
                <div 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer items-center transition-colors hover:bg-muted/50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCalculatorOpen(true);
                  }}
                >
                  <span className={valorTotal ? "text-foreground" : "text-muted-foreground"}>
                    {valorTotal ? Number(valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Ex: 1.500,00"}
                  </span>
                </div>
              )}
              <CalculatorModal 
                open={calculatorOpen}
                onOpenChange={setCalculatorOpen}
                initialValue={valorTotal}
                onConfirm={(val) => setValorTotal(val)}
                accentColor="primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="72"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                placeholder="Ex: 12"
              />
            </div>
            <div className="space-y-2">
              <Label>Previsão de Data da Compra</Label>
              <Input
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
              Este cartão fecha dia <strong>{cartaoDiaFechamento}</strong>. Compras feitas nesta data ou depois entram na fatura do mês seguinte.
            </p>
          </div>

          {simulacao && simulacao.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-heading font-semibold text-sm">Projeção por Fatura</h3>
              <div className="space-y-2">
                {simulacao.map((item) => (
                  <div key={item.parcela} className="flex justify-between items-center text-sm p-2 rounded bg-card border">
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.mesRef}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-bold">{formatCurrency(item.valor)}</span>
                        <span className="text-xs text-muted-foreground">Parcela {item.parcela}/{simulacao.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
