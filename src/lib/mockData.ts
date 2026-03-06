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
