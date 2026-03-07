import {
  Utensils, Car, Home, Heart, GraduationCap, Gamepad2,
  Monitor, Banknote, Users, Phone, Megaphone, FileText,
  Receipt, Briefcase, ShoppingBag, Zap, Wifi, Package,
  CreditCard, Repeat, Calendar, ArrowRightLeft, Coins,
  type LucideIcon,
} from "lucide-react";

// ── Category → Icon mapping ──
const expenseCategoryIcons: Record<string, LucideIcon> = {
  "Alimentação": Utensils,
  "Transporte": Car,
  "Aluguel": Home,
  "Moradia": Home,
  "Saúde": Heart,
  "Educação": GraduationCap,
  "Lazer": Gamepad2,
  "Entretenimento": Gamepad2,
  "Tecnologia": Monitor,
  "Software/Assinaturas": Monitor,
  "Internet/Telefone": Wifi,
  "Marketing": Megaphone,
  "Material de Escritório": FileText,
  "Impostos": Receipt,
  "Cartão de Crédito": CreditCard,
  "Outros": Package,
};

const revenueCategoryIcons: Record<string, LucideIcon> = {
  "Prestação de Serviço": Briefcase,
  "Venda de Produto": ShoppingBag,
  "Consultoria": Users,
  "Comissão": Zap,
  "Salário": Banknote,
  "Cliente": Users,
  "Outros": Package,
};

const paymentMethodIcons: Record<string, LucideIcon> = {
  "Pix": Zap,
  "PIX": Zap,
  "pix": Zap,
  "Boleto": FileText,
  "boleto": FileText,
  "Transferência": ArrowRightLeft,
  "transferência": ArrowRightLeft,
  "Dinheiro": Coins,
  "dinheiro": Coins,
  "Cartão": CreditCard,
  "cartão": CreditCard,
  "Cartão de Crédito": CreditCard,
  "Cartão de Débito": CreditCard,
};

export function getExpenseCategoryIcon(category: string | null): LucideIcon {
  return expenseCategoryIcons[category ?? ""] ?? paymentMethodIcons[category ?? ""] ?? Package;
}

export function getRevenueCategoryIcon(category: string | null): LucideIcon {
  return revenueCategoryIcons[category ?? ""] ?? paymentMethodIcons[category ?? ""] ?? Banknote;
}

export function getPaymentMethodIcon(method: string | null): LucideIcon {
  return paymentMethodIcons[method ?? ""] ?? Banknote;
}

// ── Transaction type colors (semantic) ──
export type TransactionType = "receita" | "despesa" | "transferencia" | "cartao" | "recorrente";

export const transactionColors: Record<TransactionType, { text: string; bg: string; border: string }> = {
  receita:       { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
  despesa:       { text: "text-red-600 dark:text-red-400",         bg: "bg-red-500/20",     border: "border-red-500/30" },
  transferencia: { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/20",    border: "border-blue-500/30" },
  cartao:        { text: "text-purple-600 dark:text-purple-400",   bg: "bg-purple-500/20",  border: "border-purple-500/30" },
  recorrente:    { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/20",   border: "border-amber-500/30" },
};

// ── Badge icons ──
export const RecurringIcon = Repeat;
export const InstallmentIcon = Calendar;
