import { useState } from "react";
import { parsePDF, parseImage, type InvoiceParseResult } from "@/lib/statement-parser";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Loader2, CheckCircle2, ChevronRight, AlertCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateInstallments } from "@/types/transactions";

export function InvoiceImporter({ onImportSuccess, accountId }: { onImportSuccess: () => void, accountId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<InvoiceParseResult | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setParsedData(null);
    try {
      let result: InvoiceParseResult;
      
      if (file.type === "application/pdf") {
        result = await parsePDF(file);
      } else if (file.type.startsWith("image/")) {
        result = await parseImage(file);
      } else {
        throw new Error("Formato não suportado. Use PDF ou Imagem.");
      }
      
      if (!result.invoice) {
        throw new Error("Não foi possível identificar o formato como uma fatura de cartão de crédito. Encontramos apenas as transações.");
      }

      setParsedData(result);
      toast.success(`Fatura identificada! ${result.transactions.length} compras lidas.`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao ler o arquivo");
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async () => {
    if (!parsedData || !parsedData.invoice) return;
    setLoading(true);

    try {
      // 1. Create invoice header
      const invMonth = parseInt(parsedData.invoice.due_date.split('-')[1]);
      const invYear = parseInt(parsedData.invoice.due_date.split('-')[0]);

      const { data: invoiceRecord, error: invError } = await supabase.from("credit_card_invoices").insert({
        user_id: user!.id,
        account_id: accountId,
        source: parsedData.invoice.source,
        total_amount: parsedData.invoice.total_amount,
        due_date: parsedData.invoice.due_date,
        month: invMonth,
        year: invYear,
        minimum_payment: parsedData.invoice.minimum_payment || null,
        status: "open"
      }).select("id").single();

      if (invError) throw invError;
      const invoiceId = invoiceRecord.id;

      // 2. Prepare transactions
      // For each transaction, if it's an installment, we generate future installments
      const transactionsToInsert: any[] = [];
      const parentMap: Record<string, string> = {};

      for (const t of parsedData.transactions) {
        if (!t.selected) continue;

        if (t.numero_parcelas && t.numero_parcelas > 1) {
          // It's an installment. If it's already the 1/12, we can optionally project
          // The user specified: "criar transações parceladas corretamente - projeção futura (pending)"
          
          // Original transaction (this month's bill)
          const baseId = crypto.randomUUID();
          transactionsToInsert.push({
            id: baseId,
            user_id: user!.id,
            account_id: accountId,
            invoice_id: invoiceId,
            type: "expense",
            subtype: "credit_card_expense",
            amount: t.valor,
            date: t.data,
            description: t.descricao,
            category: t.categoria,
            status: "confirmed", // Current statement items are confirmed
            tipo_conta: "pessoal",
            tipo_transacao: "parcelada",
            parcela_atual: t.parcela_atual || 1,
            numero_parcelas: t.numero_parcelas,
          });

          // Create future projections if it's the FIRST parcel or if we want to fill the rest
          // To keep it simple, we just generate the remaining.
          if (t.parcela_atual && t.parcela_atual < t.numero_parcelas!) {
            let nextDate = new Date(t.data + "T12:00:00");
            let remaining = t.numero_parcelas! - t.parcela_atual;
            let startParcel = t.parcela_atual + 1;
            
            for (let i = 0; i < remaining; i++) {
              nextDate.setMonth(nextDate.getMonth() + 1);
              transactionsToInsert.push({
                user_id: user!.id,
                account_id: accountId,
                type: "expense",
                subtype: "credit_card_expense",
                amount: t.valor,
                date: nextDate.toISOString().split("T")[0],
                description: t.descricao,
                category: t.categoria,
                status: "pending", // Future!
                tipo_conta: "pessoal",
                tipo_transacao: "parcelada",
                transacao_pai_id: baseId,
                parcela_atual: startParcel + i,
                numero_parcelas: t.numero_parcelas,
              });
            }
          }
        } else {
          // Standard transaction
          transactionsToInsert.push({
            user_id: user!.id,
            account_id: accountId,
            invoice_id: invoiceId,
            type: "expense",
            subtype: "credit_card_expense",
            amount: t.valor,
            date: t.data,
            description: t.descricao,
            category: t.categoria,
            status: "confirmed", // Individual items are confirmed expenses for this month
            tipo_conta: "pessoal",
            tipo_transacao: "unica"
          });
        }
      }

      // Chunk inserts due to limits
      const chunkSize = 100;
      for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
        const chunk = transactionsToInsert.slice(i, i + chunkSize);
        const { error: txError } = await supabase.from("transactions").insert(chunk);
        if (txError) throw txError;
      }

      toast.success("Fatura importada com sucesso!");
      setParsedData(null);
      onImportSuccess();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar a fatura.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Importar Fatura (PDF / Imagem)</CardTitle>
        <CardDescription>Envie o PDF ou um print da sua fatura do cartão</CardDescription>
      </CardHeader>
      <CardContent>
        {!parsedData ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20 border-muted-foreground/20 hover:bg-muted/40 transition-colors">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Lendo fatura com IA...</p>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-4 cursor-pointer w-full h-full">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Clique ou arraste a fatura</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (máx 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                />
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{parsedData.invoice!.source}</h3>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
                    <p className="text-lg font-bold text-destructive">{formatCurrency(parsedData.invoice!.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Vencimento</p>
                    <p className="text-lg font-bold">{formatDate(parsedData.invoice!.due_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileUp className="h-4 w-4" /> Compras Lidas ({parsedData.transactions.length})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {parsedData.transactions.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded bg-muted/30 border border-border/50 text-sm">
                    <div className="truncate pr-4 flex-1">
                      <p className="font-medium truncate">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">{t.data} {t.numero_parcelas ? `• Parc. ${t.parcela_atual}/${t.numero_parcelas}` : ''}</p>
                    </div>
                    <span className="font-semibold text-destructive shrink-0">{formatCurrency(t.valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setParsedData(null)} disabled={loading}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={saveInvoice} disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Confirmar e Salvar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
