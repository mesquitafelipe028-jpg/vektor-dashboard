import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";

export function useMarkAsPaid() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log(`[MarkAsPaid] Executing for ${id}`);
      if (id.startsWith("virtual-")) {
        // Formato esperado: virtual-{uuid}-{YYYY-MM-DD}
        // uuid é sempre o formato do supabase, ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 partes)
        // O id total ao fazer split("-") terá "virtual", 5 partes do uuid e 3 partes da data.
        const parts = id.split("-");
        const parentId = parts.slice(1, 6).join("-");
        const date = parts.slice(6).join("-");
        
        // Fetch parent details
        const { data: parent, error: fetchErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", parentId)
          .single();
          
        if (fetchErr) throw fetchErr;
        
        // Insert child as confirmed
        const { error: insertErr } = await supabase.from("transactions").insert({
          user_id: user!.id,
          description: parent.description,
          amount: parent.amount,
          date: date,
          status: "confirmed",
          type: parent.type,
          account_id: parent.account_id,
          category: parent.category,
          tipo_conta: parent.tipo_conta,
          tipo_transacao: "recorrente",
          frequencia: parent.frequencia,
          transacao_pai_id: parent.id,
          data_inicio: parent.data_inicio,
          data_fim: parent.data_fim,
          forma_pagamento: parent.forma_pagamento,
          cliente_id: parent.cliente_id,
          tipo_despesa: parent.tipo_despesa
        } as any);
        
        if (insertErr) throw insertErr;
      } else {
        // Standard existing update
        const { error } = await supabase
          .from("transactions")
          .update({ status: "confirmed" } as any)
          .eq("id", id);
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions(user?.id) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(user?.id) });
      qc.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      toast.success("Transação marcada como paga!");
    },
    onError: (e: any) => {
      console.error("[MarkAsPaid] Error:", e);
      toast.error("Erro ao marcar como pago.");
    }
  });
}
