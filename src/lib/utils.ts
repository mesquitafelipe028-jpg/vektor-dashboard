import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Financial Formatters
export const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
};

export const TIMEZONE = "America/Sao_Paulo";

export const formatDate = (date: string) => {
  if (!date) return "—";
  try {
    const d = date.includes("T") ? parseISO(date) : parseISO(`${date}T12:00:00`);
    if (isNaN(d.getTime())) return "—";
    return formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy");
  } catch {
    return "—";
  }
};

/**
 * Returns the local date string in YYYY-MM-DD format, 
 * strictly respecting the America/Sao_Paulo timezone.
 */
export function getLocalDateString(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}

// Financial Categories
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
  "Entretenimento",
  "Impostos",
  "Outros",
];

// Auto-categorization keywords map
const categoryKeywords: Record<string, string[]> = {
  "Transporte": ["uber", "99", "cabify", "combustível", "gasolina", "estacionamento", "pedágio", "ônibus", "metrô", "táxi", "posto"],
  "Alimentação": ["ifood", "rappi", "restaurante", "lanchonete", "mercado", "supermercado", "padaria", "café", "almoço", "jantar", "comida"],
  "Software/Assinaturas": ["adobe", "google", "microsoft", "aws", "heroku", "vercel", "github", "notion", "slack", "zoom", "canva", "figma", "chatgpt", "openai", "saas", "assinatura", "licença"],
  "Entretenimento": ["netflix", "spotify", "disney", "hbo", "amazon prime", "youtube", "cinema", "show", "ingresso", "streaming", "xbox", "playstation", "steam"],
  "Internet/Telefone": ["claro", "vivo", "tim", "oi", "internet", "telefone", "celular", "fibra"],
  "Aluguel": ["aluguel", "condomínio", "iptu"],
  "Marketing": ["google ads", "facebook ads", "meta ads", "instagram", "marketing", "anúncio", "campanha", "publicidade"],
  "Material de Escritório": ["papelaria", "impressora", "toner", "papel", "caneta", "escritório"],
  "Impostos": ["imposto", "das", "simples nacional", "inss", "irpf", "iss", "icms"],
  "Investimentos": ["cdb", "rdb", "aplicação", "aporte", "investimento", "bolsa", "ações", "tesouro", "fii"],
};

export const IS_INVESTMENT_REGEX = /cdb|rdb|aplicação|aporte|investimento|bolsa|ações|tesouro|fii/i;
export const IS_INTERNAL_TRANSFER_REGEX = /pagamento cartao|fatura cartao|liquidacao fatura|pagamento de fatura/i;

export function suggestCategory(description: string): string | null {
  const lower = description.toLowerCase().trim();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return null;
}
