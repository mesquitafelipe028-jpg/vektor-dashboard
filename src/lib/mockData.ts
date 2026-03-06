export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  category: string;
  date: string;
  status: "pago" | "pendente" | "atrasado";
}

export interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR").format(new Date(date));

export const revenueCategories = [
  "Prestação de Serviço",
  "Venda de Produto",
  "Consultoria",
  "Comissão",
  "Outros",
];

export const expenseCategories = [
  "Aluguel",
  "Internet/Telefone",
  "Material de Escritório",
  "Transporte",
  "Alimentação",
  "Marketing",
  "Software/Assinaturas",
  "Impostos",
  "Outros",
];

export const mockTransactions: Transaction[] = [
  { id: "1", description: "Projeto website cliente A", amount: 3500, type: "receita", category: "Prestação de Serviço", date: "2026-03-01", status: "pago" },
  { id: "2", description: "Aluguel escritório", amount: 1200, type: "despesa", category: "Aluguel", date: "2026-03-05", status: "pago" },
  { id: "3", description: "Consultoria financeira", amount: 2800, type: "receita", category: "Consultoria", date: "2026-03-08", status: "pago" },
  { id: "4", description: "Assinatura Figma", amount: 75, type: "despesa", category: "Software/Assinaturas", date: "2026-03-10", status: "pago" },
  { id: "5", description: "Desenvolvimento app mobile", amount: 8000, type: "receita", category: "Prestação de Serviço", date: "2026-03-12", status: "pendente" },
  { id: "6", description: "Internet fibra", amount: 150, type: "despesa", category: "Internet/Telefone", date: "2026-03-15", status: "pago" },
  { id: "7", description: "Design de logo", amount: 1500, type: "receita", category: "Prestação de Serviço", date: "2026-02-20", status: "pago" },
  { id: "8", description: "Google Ads", amount: 500, type: "despesa", category: "Marketing", date: "2026-02-22", status: "pago" },
  { id: "9", description: "Manutenção sistema", amount: 2000, type: "receita", category: "Prestação de Serviço", date: "2026-02-25", status: "pago" },
  { id: "10", description: "Material escritório", amount: 280, type: "despesa", category: "Material de Escritório", date: "2026-02-28", status: "pago" },
  { id: "11", description: "Hospedagem servidor", amount: 89, type: "despesa", category: "Software/Assinaturas", date: "2026-01-10", status: "pago" },
  { id: "12", description: "Projeto e-commerce", amount: 6500, type: "receita", category: "Prestação de Serviço", date: "2026-01-15", status: "pago" },
  { id: "13", description: "DAS MEI Janeiro", amount: 71.60, type: "despesa", category: "Impostos", date: "2026-01-20", status: "pago" },
  { id: "14", description: "Comissão vendas", amount: 1200, type: "receita", category: "Comissão", date: "2026-01-25", status: "atrasado" },
];

export const mockMonthlyData: MonthlyData[] = [
  { month: "Out", receitas: 9200, despesas: 3100, saldo: 6100 },
  { month: "Nov", receitas: 11500, despesas: 4200, saldo: 7300 },
  { month: "Dez", receitas: 8800, despesas: 3800, saldo: 5000 },
  { month: "Jan", receitas: 7700, despesas: 2460, saldo: 5240 },
  { month: "Fev", receitas: 3500, despesas: 780, saldo: 2720 },
  { month: "Mar", receitas: 14300, despesas: 1425, saldo: 12875 },
];

export const totalReceitas = mockTransactions.filter(t => t.type === "receita").reduce((s, t) => s + t.amount, 0);
export const totalDespesas = mockTransactions.filter(t => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
export const saldo = totalReceitas - totalDespesas;

// Monthly helpers
export const getMonthTransactions = (type: "receita" | "despesa", month = "2026-03") =>
  mockTransactions.filter(t => t.type === type && t.date.startsWith(month));

export const faturamentoMes = getMonthTransactions("receita").reduce((s, t) => s + t.amount, 0);
export const despesasMes = getMonthTransactions("despesa").reduce((s, t) => s + t.amount, 0);
export const lucroLiquido = faturamentoMes - despesasMes;

// Pending DAS
export interface ImpostoMEI {
  competencia: string;
  valor: number;
  vencimento: string;
  status: "pago" | "pendente" | "atrasado";
}

export const impostosMEI: ImpostoMEI[] = [
  { competencia: "Janeiro/2026", valor: 71.60, vencimento: "2026-02-20", status: "pago" },
  { competencia: "Fevereiro/2026", valor: 71.60, vencimento: "2026-03-20", status: "pago" },
  { competencia: "Março/2026", valor: 71.60, vencimento: "2026-04-20", status: "pendente" },
];

export const impostoPendente = impostosMEI.find(i => i.status === "pendente");
