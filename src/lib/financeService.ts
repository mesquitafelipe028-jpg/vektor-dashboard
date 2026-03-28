import { DespesaExtended, ReceitaExtended } from "@/types/transactions";
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

export type FinancialView = "pessoal" | "mei" | "tudo";

export class FinanceService {
  /**
   * Filters transactions by view (pessoal, mei, tudo)
   */
  static filterByView<T extends { tipo_conta?: string | null }>(
    data: T[],
    view: FinancialView
  ): T[] {
    if (view === "tudo") return data;
    return data.filter((item) => item.tipo_conta === view || !item.tipo_conta);
  }

  /**
   * Filters transactions by period (YYYY-MM)
   */
  static filterByMonth<T extends { data: string }>(
    data: T[],
    monthKey: string
  ): T[] {
    return data.filter((item) => item.data.startsWith(monthKey));
  }

  /**
   * Calculates financial stats for a given view and month
   */
  static calculateStats(
    receitas: ReceitaExtended[],
    despesas: DespesaExtended[],
    accounts: ContaFinanceira[],
    view: FinancialView,
    currentMonth: string,
    currentYear: string
  ): FinancialStats {
    const rFiltered = this.filterByView(receitas, view);
    const dFiltered = this.filterByView(despesas, view);

    // STRICT LOGIC: Only settled items
    const settledReceitas = rFiltered.filter((r) => r.status === "recebido");
    const settledDespesas = dFiltered.filter((d) => d.status === "pago");
    const settledInvestments = settledDespesas.filter((d) => d.tipo === "investment");

    // Orphaned Balance (Settled but not linked to any account)
    const orphanRecs = settledReceitas.filter((r) => !r.conta_id);
    const orphanDesps = settledDespesas.filter((d) => !d.conta_id);
    const orphanedBalance =
      orphanRecs.reduce((s, r) => s + r.valor, 0) -
      orphanDesps.reduce((s, d) => s + d.valor, 0);

    // Accounts Balance
    const accountsBalance = accounts
      .filter((a) => view === "tudo" || a.classificacao === view)
      .reduce((s, a) => s + (a.saldo || 0), 0);

    const saldoTotal = Number(accountsBalance) + Number(orphanedBalance);

    // Monthly stats
    const receitasMes = settledReceitas.filter((r) => r.data.startsWith(currentMonth));
    const despesasMes = settledDespesas.filter((d) => d.data.startsWith(currentMonth));
    const faturamentoMes = receitasMes.reduce((s, r) => s + r.valor, 0);
    const despesasMesTotal = despesasMes.reduce((s, d) => s + d.valor, 0);
    const saldoMes = faturamentoMes - despesasMesTotal;

    // Investment stats
    const totalInvestido = settledInvestments.reduce((s, i) => s + i.valor, 0);
    const aportesMes = settledInvestments
      .filter((i) => i.data.startsWith(currentMonth))
      .reduce((s, i) => s + i.valor, 0);

    // Annual stats
    const faturamentoAnual = settledReceitas
      .filter((r) => r.data.startsWith(currentYear))
      .reduce((s, r) => s + r.valor, 0);

    // Savings Rate (Pessoal)
    const rendaPessoalMes = settledReceitas
      .filter((r) => r.tipo_conta === "pessoal" && r.data.startsWith(currentMonth))
      .reduce((s, r) => s + r.valor, 0);
    const despPessoalMes = settledDespesas
      .filter((d) => d.tipo_conta === "pessoal" && d.data.startsWith(currentMonth))
      .reduce((s, d) => s + d.valor, 0);
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
      orphanedCount: orphanRecs.length + orphanDesps.length,
    };
  }

  /**
   * Generates monthly series for charts
   */
  static getMonthlySeries(
    receitas: ReceitaExtended[],
    despesas: DespesaExtended[],
    view: FinancialView,
    count = 6
  ): MonthlyData[] {
    const today = new Date(); // browser local is fine for relative month calc
    const rFiltered = this.filterByView(receitas, view).filter((r) => r.status === "recebido");
    const dFiltered = this.filterByView(despesas, view).filter((d) => d.status === "pago");

    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
      const key = formatInTimeZone(d, "America/Sao_Paulo", "yyyy-MM");
      const labelRaw = formatInTimeZone(d, "America/Sao_Paulo", "MMM", { locale: ptBR });
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1).replace(".", "");

      const rec = rFiltered.filter((r) => r.data.startsWith(key)).reduce((s, r) => s + r.valor, 0);
      const desp = dFiltered.filter((d) => d.data.startsWith(key)).reduce((s, d) => s + d.valor, 0);

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
    despesas: DespesaExtended[],
    view: FinancialView,
    monthKey?: string
  ): CategoryData[] {
    let dFiltered = this.filterByView(despesas, view).filter((d) => d.status === "pago");
    if (monthKey) {
      dFiltered = this.filterByMonth(dFiltered, monthKey);
    }

    const map: Record<string, number> = {};
    dFiltered.forEach((d) => {
      const cat = d.categoria || "Outros";
      map[cat] = (map[cat] || 0) + d.valor;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculates DRE (Demonstrativo de Resultado do Exercício)
   */
  static getDRE(
    receitas: ReceitaExtended[],
    despesas: DespesaExtended[],
    view: FinancialView,
    monthKey: string
  ): DREData {
    const rMes = this.filterByMonth(this.filterByView(receitas, view), monthKey).filter(
      (r) => r.status === "recebido"
    );
    const dMes = this.filterByMonth(this.filterByView(despesas, view), monthKey).filter(
      (d) => d.status === "pago"
    );

    const faturamento = rMes.reduce((s, r) => s + r.valor, 0);
    const categories = this.getCategoryBreakdown(dMes, view);

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
    receitas: ReceitaExtended[],
    despesas: DespesaExtended[],
    view: FinancialView,
    count = 6
  ) {
    const months = this.getMonthlySeries(receitas, despesas, view, count);
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
