import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { getLocalDateString } from "@/lib/utils";
import type { Frequencia } from "@/types/transactions";

/**
 * Hook that auto-generates the next occurrence of recurring transactions
 * when a new period arrives. Runs once per session on mount.
 */
export function useRecurringGenerator(userId: string | undefined) {
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (!userId || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        await generateNext(userId);
        qc.invalidateQueries({ queryKey: queryKeys.transactions(userId) });
        qc.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      } catch (e) {
        console.error("[RecurringGenerator]", e);
      }
    })();
  }, [userId, qc]);
}

function getNextDate(currentDate: string, freq: Frequencia): string {
  const d = new Date(currentDate + "T12:00:00");
  switch (freq) {
    case "semanal": d.setDate(d.getDate() + 7); break;
    case "quinzenal": d.setDate(d.getDate() + 15); break;
    case "mensal": d.setMonth(d.getMonth() + 1); break;
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return getLocalDateString(d);
}

async function generateNext(userId: string) {
  // Get all recurring parent transactions in the unified table
  const { data: parents, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("tipo_transacao", "recorrente" as any)
    .is("transacao_pai_id", null);

  if (error || !parents?.length) return;

  const today = getLocalDateString();

  for (const parent of parents) {
    const p = parent as any;
    const freq = p.frequencia as Frequencia;
    if (!freq) continue;

    // Check data_fim
    if (p.data_fim && p.data_fim < today) continue;

    // Find the latest child (or parent itself)
    const { data: children } = await supabase
      .from("transactions")
      .select("date")
      .eq("transacao_pai_id", p.id)
      .order("date", { ascending: false })
      .limit(1);

    const latestDate = children?.length ? children[0].date : p.date;
    let nextDate = getNextDate(latestDate!, freq);

    // Generate all missing occurrences up to today
    while (nextDate <= today) {
      if (p.data_fim && nextDate > p.data_fim) break;

      // Check if already exists for this date
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("transacao_pai_id", p.id)
        .eq("date", nextDate)
        .limit(1);

      if (!existing?.length) {
        const newRecord: any = {
          description: p.description,
          amount: p.amount,
          date: nextDate,
          user_id: userId,
          tipo_transacao: "recorrente",
          frequencia: freq,
          transacao_pai_id: p.id,
          data_inicio: p.data_inicio,
          data_fim: p.data_fim,
          status: "pending", // Occurrences start as pending
          tipo_conta: p.tipo_conta || "mei",
          type: p.type,
          account_id: p.account_id,
          category: p.category,
          forma_pagamento: p.forma_pagamento,
          cliente_id: p.cliente_id,
          tipo_despesa: p.tipo_despesa
        };

        await supabase.from("transactions").insert(newRecord);
      }

      nextDate = getNextDate(nextDate, freq);
    }
  }
}
