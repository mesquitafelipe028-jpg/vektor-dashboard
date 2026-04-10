import { UnifiedTransaction, FinancialView } from "@/types/transactions";
import { ContaFinanceira } from "@/types/accounts";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export interface FinancialStats {
  saldoTotal: number;
  faturamentoMes: number;
  despesasMesTotal: number;
  saldoMes: number;
  totalInvestido: number;
  aportesMes: number;
  faturamentoAnual: number;
  taxaPoupanca: number;
  orphanedBalance: number;
  orphanedCount: number;
}

export interface MonthlyData {
  month: string;
  rawKey: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoryData {
  name: string;
  value: number;
  fill?: string;
}

export interface DRELine {
  label: string;
  value: number | null;
  indent?: boolean;
  bold?: boolean;
  primary?: boolean;
  subtext?: boolean;
  highlight?: boolean;
}

export interface DREData {
  rec: number;
  impostos: number;
  recLiquida: number;
  custosVariaveis: number;
  margem: number;
  despesasFixas: number;
  ebitda: number;
  outras: number;
  lucroLiquido: number;
}


export class FinanceService {
  /**
   * Filters transactions by view (pessoal, mei, tudo)
   */
  static filterByView<T extends { tipo_conta?: string | null }>(
    data: T[],
    view: string
  ): T[] {
    if (view === "tudo") return data;
    return data.filter((item) => item.tipo_conta === view || !item.tipo_conta);
  }

  /**
   * Filters transactions by period (YYYY-MM)
   */
  static filterByMonth<T extends { date: string }>(
    data: T[],
    monthKey: string
  ): T[] {
    return data.filter((item) => item.date.startsWith(monthKey));
  }

  /**
   * Calculates financial stats for a given view and month
   */
  static calculateStats(
    transactions: UnifiedTransaction[],
    accounts: ContaFinanceira[],
    view: string,
    currentMonth: string,
    currentYear: string
  ): FinancialStats {
    const filtered = this.filterByView(transactions, view);

    // STRICT LOGIC: Only confirmed (settled) items
    const todayStr = new Date().toISOString().substring(0, 10);
    const settledTransactions = filtered.filter((t) => t.status === "confirmed" && t.date <= todayStr);
    
    // Ignore internal transfers to avoid double counting gross values (Net is zero anyway)
    // Now also ignore our new subtype!
    const validTransactions = settledTransactions.filter(t => 
      t.category !== "Transferência/Pagamento Fatura" && 
      t.subtype !== "credit_card_expense"
    );

    const settledReceitas = validTransactions.filter((t) => t.type === "income");
    const settledDespesas = validTransactions.filter((t) => t.type === "expense");
    const settledInvestments = settledDespesas.filter((d) => d.tipo_despesa === "investment");

    // Orphaned Balance (Confirmed but not linked to any account)
    const orphans = settledTransactions.filter((t) => !t.account_id);
    const orphanedBalance = orphans.reduce((s, t) => 
      s + (t.type === "income" ? t.amount : -t.amount), 0);

    // Accounts Balance
    const accountsBalance = accounts
      .filter((a) => view === "tudo" || a.classificacao === view)
      .reduce((s, a) => s + (a.saldo || 0), 0);

    const saldoTotal = Number(accountsBalance) + Number(orphanedBalance);

    // Monthly stats
    const receitasMes = settledReceitas.filter((r) => r.date.startsWith(currentMonth));
    const despesasMes = settledDespesas.filter((d) => d.date.startsWith(currentMonth));
    const faturamentoMes = receitasMes.reduce((s, r) => s + r.amount, 0);
    const despesasMesTotal = despesasMes.reduce((s, d) => s + d.amount, 0);
    const saldoMes = faturamentoMes - despesasMesTotal;

    // Investment stats
    const totalInvestido = settledInvestments.reduce((s, i) => s + i.amount, 0);
    const aportesMes = settledInvestments
      .filter((i) => i.date.startsWith(currentMonth))
      .reduce((s, i) => s + i.amount, 0);

    // Annual stats
    const faturamentoAnual = settledReceitas
      .filter((r) => r.date.startsWith(currentYear))
      .reduce((s, r) => s + r.amount, 0);

    // Savings Rate (Pessoal)
    const rendaPessoalMes = settledReceitas
      .filter((r) => r.tipo_conta === "pessoal" && r.date.startsWith(currentMonth))
      .reduce((s, r) => s + r.amount, 0);
    const despPessoalMes = settledDespesas
      .filter((d) => d.tipo_conta === "pessoal" && d.date.startsWith(currentMonth))
      .reduce((s, d) => s + d.amount, 0);
    const taxaPoupanca =
      rendaPessoalMes > 0 ? ((rendaPessoalMes - despPessoalMes) / rendaPessoalMes) * 100 : 0;

    return {
      saldoTotal,
      faturamentoMes,
      despesasMesTotal,
      saldoMes,
      totalInvestido,
      aportesMes,
      faturamentoAnual,
      taxaPoupanca,
      orphanedBalance,
      orphanedCount: orphans.length,
    };
  }

  /**
   * Generates monthly series for charts
   */
  static getMonthlySeries(
    transactions: UnifiedTransaction[],
    view: string,
    count = 6,
    incluirPrevisao = false
  ): MonthlyData[] {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const safeTransactions = transactions || [];
    const vFiltered = this.filterByView(safeTransactions, view).filter((t) => {
      // Ignore transfers and double-counted credit cards
      if (t.category === "Transferência/Pagamento Fatura" || t.subtype === "credit_card_expense") return false;
      
      if (incluirPrevisao) {
         // Keep everything: confirmed, past pending, future pending
         return true;
      } else {
         // Strict to confirmed & past up to today
         return t.status === "confirmed" && t.date <= todayStr;
      }
    });

    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
      const key = formatInTimeZone(d, "America/Sao_Paulo", "yyyy-MM");
      const labelRaw = formatInTimeZone(d, "America/Sao_Paulo", "MMM", { locale: ptBR });
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1).replace(".", "");

      const monthTrans = vFiltered.filter((t) => t.date.startsWith(key));
      const rec = monthTrans.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const desp = monthTrans.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      return {
        month: label,
        rawKey: key,
        receitas: rec,
        despesas: desp,
        saldo: rec - desp,
      };
    });
  }

  /**
   * Generates category breakdown for pie charts
   */
  static getCategoryBreakdown(
    transactions: UnifiedTransaction[],
    view: FinancialView,
    monthKey?: string
  ): CategoryData[] {
    let tFiltered = this.filterByView(transactions, view).filter((t) => t.status === "confirmed");
    if (monthKey) {
      tFiltered = this.filterByMonth(tFiltered, monthKey);
    }

    const map: Record<string, number> = {};
    tFiltered.forEach((t) => {
      const cat = t.category || "Outros";
      map[cat] = (map[cat] || 0) + t.amount;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculates DRE (Demonstrativo de Resultado do Exercício)
   */
  static getDRE(
    transactions: UnifiedTransaction[],
    view: string,
    monthKey: string
  ): DREData {
    const todayStr = new Date().toISOString().substring(0, 10);
    const vFiltered = this.filterByMonth(this.filterByView(transactions, view), monthKey).filter(
      (t) => t.status === "confirmed" && 
        t.date <= todayStr && 
        t.category !== "Transferência/Pagamento Fatura" &&
        t.subtype !== "credit_card_expense"
    );

    const rMes = vFiltered.filter(t => t.type === "income");
    const dMes = vFiltered.filter(t => t.type === "expense");

    const faturamento = rMes.reduce((s, r) => s + r.amount, 0);
    const categories = this.getCategoryBreakdown(dMes, view as FinancialView);

    const impostos = categories.find((c) => c.name === "Impostos")?.value || 0;
    const recLiquida = faturamento - impostos;

    const variaveisTags = ["Marketing", "Transporte", "Material de Escritório", "Serviços Bancários"];
    const fixasTags = ["Aluguel", "Internet/Telefone", "Software/Assinaturas"];

    const custosVariaveis = categories
      .filter((c) => variaveisTags.includes(c.name))
      .reduce((sum, c) => sum + c.value, 0);

    const margem = recLiquida - custosVariaveis;

    const despesasFixas = categories
      .filter((c) => fixasTags.includes(c.name))
      .reduce((sum, c) => sum + c.value, 0);

    const outras = categories
      .filter(
        (c) => !variaveisTags.includes(c.name) && !fixasTags.includes(c.name) && c.name !== "Impostos"
      )
      .reduce((sum, c) => sum + c.value, 0);

    const ebitda = margem - despesasFixas;
    const lucroLiquido = ebitda - outras;

    return {
      rec: faturamento,
      impostos,
      recLiquida,
      custosVariaveis,
      margem,
      despesasFixas,
      ebitda,
      outras,
      lucroLiquido,
    };
  }

  /**
   * Calculates health indicators based on last X months
   */
  static getHealthIndicators(
    transactions: UnifiedTransaction[],
    view: string,
    count = 6,
    incluirPrevisao = false
  ) {
    const months = this.getMonthlySeries(transactions, view, count, incluirPrevisao);
    const monthsWithData = months.filter((m) => m.receitas > 0 || m.despesas > 0);
    const activeCount = monthsWithData.length || 1;

    const totalRec = monthsWithData.reduce((s, m) => s + m.receitas, 0);
    const totalDesp = monthsWithData.reduce((s, m) => s + m.despesas, 0);

    const lucroMedioMensal = (totalRec - totalDesp) / activeCount;
    const despesaPercentMedia = totalRec > 0 ? (totalDesp / totalRec) * 100 : 0;

    // Growth: compare last 3 months with previous 3 months
    const recent3 = months.slice(-3);
    const prev3 = months.slice(-6, -3);

    const avgRecent = recent3.reduce((s, m) => s + m.receitas, 0) / (recent3.length || 1);
    const avgPrev = prev3.reduce((s, m) => s + m.receitas, 0) / (prev3.length || 1);
    const crescimento = avgPrev > 0 ? ((avgRecent - avgPrev) / avgPrev) * 100 : 0;

    return {
      lucroMedioMensal,
      despesaPercentMedia,
      crescimento,
      saldoMedioMensal: lucroMedioMensal,
    };
  }
}
