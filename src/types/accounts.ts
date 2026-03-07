export type AccountType = "banco" | "digital" | "carteira" | "cartao" | "investimento";
export type AccountClassification = "pessoal" | "mei";

export interface ContaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  tipo: AccountType;
  banco_id: string | null;
  saldo: number;
  cor: string;
  icone: string;
  classificacao: AccountClassification;
  created_at: string;
}

export interface ContaFinanceiraInsert {
  user_id: string;
  nome: string;
  tipo: AccountType;
  banco_id?: string | null;
  saldo?: number;
  cor?: string;
  icone?: string;
  classificacao?: AccountClassification;
}
