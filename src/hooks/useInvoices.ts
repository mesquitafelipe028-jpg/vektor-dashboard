import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { Invoice } from "@/types/transactions";

export function useInvoices() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ["credit_card_invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_card_invoices")
        .select("*")
        .order("due_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching invoices:", error);
        throw error;
      }
      return data as Invoice[];
    },
    enabled: !!user,
  });

  const payInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, sourceAccountId }: { invoiceId: string; sourceAccountId: string }) => {
      // 1. Get the invoice to know the amount and destination card account
      const { data: invoice, error: fetchError } = await supabase
        .from("credit_card_invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!invoice) throw new Error("Fatura não encontrada");
      if (!invoice.account_id) throw new Error("Fatura não possui cartão vinculado (account_id)");

      const amountToPay = invoice.total_amount;
      const today = new Date().toISOString().split("T")[0];

      // 2. Create the payment transaction (Saída da conta corrente)
      const { error: trError } = await supabase.from("transactions").insert({
        user_id: user!.id,
        account_id: sourceAccountId,
        type: "expense",
        subtype: "credit_card_payment",
        amount: amountToPay,
        date: today,
        description: `Pagamento Fatura ${invoice.source}`,
        category: "Transferência/Pagamento Fatura", 
        status: "confirmed",
        tipo_conta: "pessoal" 
      } as any);

      if (trError) throw trError;

      // 3. Update Invoice Status
      const { error: upError } = await supabase
        .from("credit_card_invoices")
        .update({ status: "paid" })
        .eq("id", invoiceId);
        
      if (upError) throw upError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_card_invoices", user?.id] });
      qc.invalidateQueries({ queryKey: ["transactions", user?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      toast.success("Fatura paga com sucesso!");
    },
    onError: (e: any) => {
      console.error("Error paying invoice:", e);
      toast.error(e.message || "Erro ao pagar fatura.");
    }
  });

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    payInvoice: payInvoiceMutation.mutate,
    isPaying: payInvoiceMutation.isPending
  };
}
