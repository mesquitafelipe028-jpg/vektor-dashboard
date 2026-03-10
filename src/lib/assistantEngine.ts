import { formatCurrency } from "./mockData";

export type AssistantIntent = 
  | "UNKNOWN"
  | "GastoMes"
  | "ReceitaMes"
  | "SaldoAtual"
  | "MaiorDespesa";

export interface Transaction {
  id: string;
  valor: number;
  data: string;
  categoria?: string | null;
  descricao: string;
}

export interface AssistantData {
  receitas: Transaction[];
  despesas: Transaction[];
}

export function identifyIntent(message: string): AssistantIntent {
  const normalized = message.toLowerCase().trim();
  
  // 1. "quanto gastei este mês" / "gasto mensal" / "despesas do mes"
  if (
    normalized.includes("gastei") || 
    normalized.includes("gasto") || 
    normalized.includes("despesa") || 
    normalized.includes("saiu") ||
    normalized.includes("paguei")
  ) {
    if (normalized.includes("maior") || normalized.includes("principal") || normalized.includes("mais")) {
      return "MaiorDespesa";
    }
    return "GastoMes";
  }

  // 2. "quanto recebi este mês" / "receitas" / "ganhei" / "entrou"
  if (
    normalized.includes("recebi") || 
    normalized.includes("receita") || 
    normalized.includes("ganhei") || 
    normalized.includes("entrou") ||
    normalized.includes("faturamento")
  ) {
    return "ReceitaMes";
  }

  // 3. "qual meu saldo atual" / "saldo" / "quanto tenho" / "sobrou"
  if (
    normalized.includes("saldo") || 
    normalized.includes("sobrou") || 
    normalized.includes("tenho") ||
    normalized.includes("caixa")
  ) {
    return "SaldoAtual";
  }

  // 4. "qual minha maior despesa"
  if (normalized.includes("maior") && (normalized.includes("despesa") || normalized.includes("gasto"))) {
    return "MaiorDespesa";
  }

  return "UNKNOWN";
}

function getCurrentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function generateAssistantResponse(message: string, data: AssistantData): string {
  const intent = identifyIntent(message);
  const currentMonth = getCurrentMonthPrefix();

  switch (intent) {
    case "GastoMes": {
      const despesasMes = data.despesas.filter(d => d.data.startsWith(currentMonth));
      const totalGasto = despesasMes.reduce((acc, curr) => acc + curr.valor, 0);
      return `Você gastou ${formatCurrency(totalGasto)} neste mês.`;
    }
    
    case "ReceitaMes": {
      const receitasMes = data.receitas.filter(r => r.data.startsWith(currentMonth));
      const totalRecebido = receitasMes.reduce((acc, curr) => acc + curr.valor, 0);
      return `Você recebeu ${formatCurrency(totalRecebido)} neste mês.`;
    }

    case "SaldoAtual": {
      const despesasMes = data.despesas.filter(d => d.data.startsWith(currentMonth));
      const receitasMes = data.receitas.filter(r => r.data.startsWith(currentMonth));
      const totalGasto = despesasMes.reduce((acc, curr) => acc + curr.valor, 0);
      const totalRecebido = receitasMes.reduce((acc, curr) => acc + curr.valor, 0);
      const saldo = totalRecebido - totalGasto;
      
      return `Seu saldo atual deste mês é de ${formatCurrency(saldo)}.`;
    }

    case "MaiorDespesa": {
      const despesasMes = data.despesas.filter(d => d.data.startsWith(currentMonth));
      if (despesasMes.length === 0) {
        return "Você não tem despesas registradas neste mês.";
      }

      // Agrupar por categoria para encontrar a maior categoria
      const categorias: Record<string, number> = {};
      let maiorDespesaUnica = despesasMes[0];

      despesasMes.forEach(d => {
        const cat = d.categoria || "Outras";
        categorias[cat] = (categorias[cat] || 0) + d.valor;
        
        if (d.valor > maiorDespesaUnica.valor) {
          maiorDespesaUnica = d;
        }
      });

      let maiorCat = "";
      let maiorValorCat = 0;

      for (const [cat, valor] of Object.entries(categorias)) {
        if (valor > maiorValorCat) {
          maiorValorCat = valor;
          maiorCat = cat;
        }
      }

      // Se a pergunta foi mais genérica e a categoria é significativa, mostramos as duas frases do exemplo
      return `Sua maior categoria de gasto foi ${maiorCat.toLowerCase()} (${formatCurrency(maiorValorCat)}). A maior despesa individual foi "${maiorDespesaUnica.descricao}" (${formatCurrency(maiorDespesaUnica.valor)}).`;
    }

    case "UNKNOWN":
    default:
      return "Desculpe, eu ainda sou um assistente em treinamento. Pode me perguntar sobre seus gastos do mês, receitas, saldo atual ou sua maior despesa!";
  }
}
