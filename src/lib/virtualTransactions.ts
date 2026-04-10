import { type UnifiedTransaction, type Frequencia } from "@/types/transactions";
import { getLocalDateString } from "@/lib/utils";

function getNextDate(currentDate: string, freq: Frequencia): string {
  const d = new Date(currentDate + "T12:00:00");
  switch (freq) {
    case "semanal": d.setDate(d.getDate() + 7); break;
    case "quinzenal": d.setDate(d.getDate() + 15); break;
    case "mensal": d.setMonth(d.getMonth() + 1); break;
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return getLocalDateString(d);
}

export type ExtendedUnifiedTransaction = UnifiedTransaction & { isVirtual?: boolean };

/**
 * Injects future recurrent transactions up to X months purely in memory.
 */
export function generateVirtualTransactions(transactions: UnifiedTransaction[], monthsToProject = 6): ExtendedUnifiedTransaction[] {
  const virtuals: ExtendedUnifiedTransaction[] = [];
  
  // Find all parent recurring transactions
  const parents = transactions.filter(t => t.tipo_transacao === "recorrente" && !t.transacao_pai_id);
  
  if (parents.length === 0) return transactions;
  
  const today = new Date();
  // Set limit to end of the Nth month
  const limitDate = new Date(today.getFullYear(), today.getMonth() + monthsToProject + 1, 0); 
  const limitDateStr = getLocalDateString(limitDate);

  for (const parent of parents) {
    const freq = parent.frequencia as Frequencia;
    if (!freq) continue;

    const finalDate = parent.data_fim && parent.data_fim < limitDateStr ? parent.data_fim : limitDateStr;
    
    // Find latest instantiated occurrence date
    const children = transactions.filter(t => t.transacao_pai_id === parent.id);
    let latestDate = parent.date;
    for (const child of children) {
      if (child.date > latestDate) {
        latestDate = child.date;
      }
    }
    
    let nextDate = getNextDate(latestDate, freq);
    
    while (nextDate <= finalDate) {
      virtuals.push({
        ...parent,
        id: `virtual-${parent.id}-${nextDate}`, // Unique ID for keying
        date: nextDate,
        status: "pending",
        transacao_pai_id: parent.id,
        isVirtual: true,
      });
      
      nextDate = getNextDate(nextDate, freq);
    }
  }

  return [...transactions, ...virtuals];
}
