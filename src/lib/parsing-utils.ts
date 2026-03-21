export interface ImportedTransaction {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria: string;
  selected: boolean;
  confidence: "high" | "medium" | "low";
}

export const WORDS_RECEITA = ["pix recebido", "ted recebido", "ted", "crédito", "pagamento recebido", "remuneração", "salário", "transferência recebida", "boleto recebido", "estorno", "reembolso"];
export const WORDS_DESPESA = ["pix enviado", "transferência enviada", "pagamento", "compra", "débito", "tarifa", "mensalidade", "fatura", "saque", "iof", "anuidade", "seguro"];

export const BLACKLIST_KEYWORDS = [
  "saldo anterior", "saldo atual", "total da fatura", "pagamento efetuado", 
  "pagamento recebido", "total de gastos", "limite disponível", "limite total",
  "encargos", "juros", "multa", "demonstrativo", "vencimento", "fechamento",
  "resumo", "detalhamento", "provisório", "proxima fatura", "melhor dia",
  "banco ", "cnpj", "av. ", "avenida", "cep:", "endereço", "telefone:", "fatura mensal",
  "atendimento", "sac:", "ouvidoria", "total selecionado", "pagamento total",
  "realizados até", "esta é a fatura", "contendo compras", "código de barras", 
  "parcelamento", "histórico de", "período", "pagando o valor", "desta fatura",
  "contratará", "utilizando o", "exato de até", "valor total", "resumo da fatura",
  "total despesas", "total de pagamentos", "consolidado de", "seus limites", "seu limite",
  "pagando o", "utilizando o", "opção!", "saque à crédito", "mínimo", "anuidade", 
  "app way", "orientações", "beneficiária", "exato de", "favor de", "atraso da"
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Moradia/Aluguel": ["aluguel", "condomínio", "iptu", "luz", "energia", "enel", "cpfl", "light", "sabesp", "agua", "gás", "comgas"],
  "Alimentação/Supermercado": ["supermercado", "mercado", "pao de acucar", "carrefour", "extra", "assai", "atacadão", "dia%", "restaurante", "lanchonete", "delivery", "ifood", "uber eats", "rappi", "mcdonalds", "bk ", "burger king", "starbucks", "padaria", "confeitaria", "açougue"],
  "Transporte/Combustível": ["uber", "99", "taxi", "estacionamento", "gasolina", "combustível", "posto ", "shell", "ipiranga", "br ", "petrobras", "pedágio", "sem parar", "veloe", "ônibus", "metrô", "cptm"],
  "Saúde/Academia": ["farmácia", "droga", "raia", "drogasil", "pague menos", "médico", "hospital", "clinica", "unimed", "bradesco saude", "sulamerica", "plano de saúde", "academia", "smart fit", "bluefit", "gympass", "dentista"],
  "Educação/Cursos": ["curso", "escola", "faculdade", "universidade", "livro", "saraiva", "amazon", "udemy", "alura", "hotmart", "coursera"],
  "Lazer/Entretenimento": ["netflix", "spotify", "amazon prime", "disney", "youtube", "hbo", "cinema", "ingresso", "teatro", "show", "viagem", "hotel", "airbnb", "decolar", "booking", "jogos", "steam", "playstation", "xbox"],
  "Marketing/Ads": ["google ads", "facebook ads", "meta ads", "linkedin ads"],
  "Serviços Bancários": ["tarifa", "iof", "anuidade", "juros", "seguro", "mensalidade"],
  "Telefonia/Internet": ["vivo", "claro", "tim", "oi ", "net ", "sky ", "internet", "celular"],
};

export function guessType(descricao: string, valor: number, typeOverride?: "receita" | "despesa"): "receita" | "despesa" {
  if (typeOverride) return typeOverride;
  const lower = descricao.toLowerCase();
  if (valor < 0 || lower.includes("estorno") || lower.includes("reembolso") || lower.includes("pagamento efetuado")) {
    return "receita";
  }
  if (WORDS_RECEITA.some((w) => lower.includes(w))) return "receita";
  if (WORDS_DESPESA.some((w) => lower.includes(w))) return "despesa";
  return "despesa";
}

export function parseAmount(str: string): number | null {
  if (!str) return null;
  let cleaned = str.replace(/R\$|USD|EUR/gi, "").trim();
  let sign = 1;
  if (cleaned.includes("-") || cleaned.includes("(") || /D$/i.test(cleaned)) sign = -1;
  if (cleaned.includes("+") || /C$/i.test(cleaned)) sign = 1;
  cleaned = cleaned.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let finalVal: number;
  if (lastComma > lastDot && lastComma !== -1) {
    finalVal = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  } else if (lastDot > lastComma && lastDot !== -1) {
    finalVal = parseFloat(cleaned.replace(/,/g, ""));
  } else {
    finalVal = parseFloat(cleaned.replace(",", "."));
  }
  if (isNaN(finalVal)) return null;
  if (finalVal >= 1900 && finalVal <= 2100 && !str.includes(",") && !str.includes(".")) return null;
  return finalVal * sign;
}

export function guessCategory(descricao: string): string {
  const lower = descricao.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Compras Variadas";
}

export function confidenceLevel(descricao: string): "high" | "medium" | "low" {
  const lower = descricao.toLowerCase();
  const allKeywords = Object.values(CATEGORY_KEYWORDS).flat();
  if (allKeywords.some((kw) => lower.includes(kw))) return "high";
  if (WORDS_RECEITA.some((w) => lower.includes(w)) || WORDS_DESPESA.some((w) => lower.includes(w))) return "medium";
  return "low";
}

export function processPDFLines(lines: string[]): ImportedTransaction[] {
  console.log("[PDF Parser] Total lines to process:", lines.length);

  const transactions: ImportedTransaction[] = [];
  const currentYear = new Date().getFullYear();

  // Pattern: [Optional Number] [Date DD/MM] [Description] [Value]
  // Based on: " 05/02 APPLECOMBILL 19,90"
  // And "2 18/07 KIWIFY *TREINODEFO 08/10 11,51"
  const transactionRegex = /^(\d\s)?(\d{2}\/\d{2})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?!.*[\d,])/;
  
  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).substring(2, 15);
  };

  const currencyRegex = /(-?\d{1,3}(?:\.\d{3})*,\d{2})(?!.*[\d,])/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    
    // 1. Filter structural noise
    if (BLACKLIST_KEYWORDS.some(kw => lowerLine.includes(kw))) continue;

    // 2. Reject lines with multiple monetary values (likely text/instructions)
    const currencyMatches = line.match(currencyRegex) || [];
    if (currencyMatches.length > 1) {
      console.log("[PDF Parser] Multi-value line rejected:", line);
      continue;
    }

    // 3. Try strict pattern matching
    const match = line.match(transactionRegex);
    if (match) {
      const rawDate = match[2];
      const description = match[3].trim();
      const rawValue = match[4];

      // Clean description from common residue
      if (description.length < 3 || /^[^\w\s]+$/.test(description)) continue;
      if (description.includes("R$")) continue; // Description leaking values = noise

      // Handle Date conversion (DD/MM -> YYYY-MM-DD)
      const [day, month] = rawDate.split("/");
      const formattedDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const valor = parseAmount(rawValue);
      if (valor === null || Math.abs(valor) < 0.01) continue;

      transactions.push({
        id: generateId(),
        data: formattedDate,
        descricao: description.replace(/\s+/g, " "),
        valor: Math.abs(valor),
        tipo: guessType(description, valor),
        categoria: guessCategory(description),
        selected: true,
        confidence: "high"
      });
      continue;
    }

    // 4. Fallback for lines where date/value might be slightly separated
    const dateRegex = /^(\d{2}\/\d{2}\/\d{2,4})|(\d{2}\/\d{2}\s)/; // Date MUST be at the start
    const dateMatch = line.match(dateRegex);
    const valueMatch = line.match(/(-?\d{1,3}(?:\.\d{3})*,\d{2})(?!.*[\d,])/);

    if (dateMatch && valueMatch) {
      const rawDate = dateMatch[0].trim();
      const rawValue = valueMatch[0];
      
      let desc = line.replace(rawDate, "").replace(rawValue, "").trim();
      if (desc.length > 3 && !BLACKLIST_KEYWORDS.some(kw => desc.toLowerCase().includes(kw)) && !desc.includes("R$")) {
        const parts = rawDate.split("/");
        let formattedDate = "";
        if (parts.length === 2) {
          formattedDate = `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts.length === 3) {
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          formattedDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }

        const valor = parseAmount(rawValue);
        if (valor && Math.abs(valor) > 0.01) {
          transactions.push({
            id: generateId(),
            data: formattedDate,
            descricao: desc.replace(/\s+/g, " "),
            valor: Math.abs(valor),
            tipo: guessType(desc, valor),
            categoria: guessCategory(desc),
            selected: true,
            confidence: "medium"
          });
        }
      }
    }
  }

  console.log("[PDF Parser] Total valid transactions found:", transactions.length);
  return transactions;
}

export function parseRows(rows: any[][]): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  let mapping: any = null;
  const currentYear = new Date().getFullYear();
  
  for (const row of rows) {
    const cells = row.map((c) => (c !== undefined && c !== null ? String(c).trim() : ""));
    const rowText = cells.join(" ").toLowerCase();
    
    if (!mapping && (rowText.includes("data") || rowText.includes("date")) && (rowText.includes("valor") || rowText.includes("saldo") || rowText.includes("débito"))) {
      mapping = { date: -1, desc: -1, val: -1, credit: -1, debit: -1, balance: -1 };
      cells.forEach((c, i) => {
        const cell = c.toLowerCase();
        if (cell.includes("data") || cell.includes("date")) mapping.date = i;
        if (cell.includes("descri") || cell.includes("histór") || cell.includes("lança")) mapping.desc = i;
        if (cell.includes("valor") || (cell.includes("quantia") && !cell.includes("bloqu"))) mapping.val = i;
        if (cell.includes("crédit") || (cell.includes("entrada") && !cell.includes("saída"))) mapping.credit = i;
        if (cell.includes("débit") || cell.includes("saída")) mapping.debit = i;
        if (cell.includes("saldo") || cell.includes("balance")) mapping.balance = i;
      });
      continue;
    }

    let data = "";
    let descricao = "";
    let valor = 0;

    if (mapping && mapping.date !== -1) {
      data = cells[mapping.date] || "";
      const dateMatch = data.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2})/);
      if (!dateMatch) continue;
      
      if (dateMatch[1]) data = dateMatch[1].split("/").reverse().join("-");
      else if (dateMatch[2]) data = dateMatch[2];
      else if (dateMatch[3]) {
        const [d, m] = dateMatch[3].split("/");
        data = `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      descricao = mapping.desc !== -1 ? cells[mapping.desc] : "";
      
      let foundVal = false;
      let typeOverride: "receita" | "despesa" | undefined = undefined;

      if (mapping.debit !== -1) {
        const v = parseAmount(cells[mapping.debit]);
        if (v !== null && Math.abs(v) > 0.01) { valor = v; foundVal = true; typeOverride = "despesa"; }
      }
      if (!foundVal && mapping.credit !== -1) {
        const v = parseAmount(cells[mapping.credit]);
        if (v !== null && Math.abs(v) > 0.01) { valor = v; foundVal = true; typeOverride = "receita"; }
      }
      if (!foundVal && mapping.val !== -1) {
        const v = parseAmount(cells[mapping.val]);
        if (v !== null && Math.abs(v) > 0.01) { 
          valor = v; foundVal = true;
        }
      }
      
      if (!data || !foundVal) continue;
      if (BLACKLIST_KEYWORDS.some(kw => descricao.toLowerCase().includes(kw))) continue;

      transactions.push({
        id: crypto.randomUUID(),
        data,
        descricao: (descricao || "Transação Importada").replace(/\+/g, " ").replace(/\s+/g, " ").trim(),
        valor: Math.abs(valor),
        tipo: guessType(descricao, valor, typeOverride),
        categoria: guessCategory(descricao),
        selected: true,
        confidence: confidenceLevel(descricao),
      });
      continue;
    }
  }
  return transactions;
}
