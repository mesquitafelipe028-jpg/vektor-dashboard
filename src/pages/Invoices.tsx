import { useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAccounts } from "@/hooks/useAccounts";
import { InvoiceImporter } from "@/components/invoices/InvoiceImporter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Plus, CreditCard, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export default function Invoices() {
  const { invoices, isLoading, payInvoice, isPaying } = useInvoices();
  const { accounts } = useAccounts();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCCId, setSelectedCCId] = useState<string>("");
  const [selectedPayAccount, setSelectedPayAccount] = useState<string>("");

  const creditCards = accounts.filter(a => a.tipo === "cartao");
  const checkingAccounts = accounts.filter(a => a.tipo !== "cartao");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Faturas de Cartão</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e limites</p>
        </div>
        <Button onClick={() => setIsImporting(!isImporting)}>
          {isImporting ? "Voltar à lista" : <><Plus className="h-4 w-4 mr-2" /> Importar Fatura</>}
        </Button>
      </div>

      {isImporting ? (
        <div className="space-y-4 max-w-xl mx-auto mt-8">
          <Card>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base">Passo 1: Selecione o Cartão</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Select value={selectedCCId} onValueChange={setSelectedCCId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Cartão de Crédito..." />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum cartão cadastrado. Vá em Contas.</div>
                  )}
                  {creditCards.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedCCId && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InvoiceImporter 
                accountId={selectedCCId} 
                onImportSuccess={() => setIsImporting(false)} 
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-lg font-semibold text-foreground">Nenhuma Fatura Importada</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Importe o PDF da sua fatura fechada ou em andamento. O sistema fará a leitura mágica.
                </p>
                <Button className="mt-6" onClick={() => setIsImporting(true)}>Importar Primeira Fatura</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices.map(inv => (
                <Card key={inv.id} className="relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${inv.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">{inv.source}</CardTitle>
                        <CardDescription className="font-medium mt-1">Vencimento: {formatDate(inv.due_date)}</CardDescription>
                      </div>
                      <Badge variant={inv.status === 'confirmed' ? 'default' : 'secondary'} className={inv.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'}>
                        {inv.status === 'confirmed' ? 'Paga' : 'Aberta'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Valor Total</p>
                      <p className="font-heading text-2xl font-bold text-foreground mt-0.5">{formatCurrency(inv.total_amount)}</p>
                    </div>
                    
                    {inv.status === 'pending' && (
                      <div className="pt-4 border-t border-border space-y-3">
                        <Select value={selectedPayAccount} onValueChange={setSelectedPayAccount}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Conta para pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {checkingAccounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.nome} (Saldo: {formatCurrency(a.saldo)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button 
                          size="sm" 
                          className="w-full h-8 text-xs bg-primary hover:bg-primary/90" 
                          disabled={!selectedPayAccount || isPaying}
                          onClick={() => {
                            if (!selectedPayAccount) return;
                            payInvoice({ invoiceId: inv.id, sourceAccountId: selectedPayAccount });
                          }}
                        >
                          {isPaying ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-2" />}
                          Marcar como Paga
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
