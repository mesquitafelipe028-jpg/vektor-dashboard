export interface ImportedTransaction {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria: string;
  selected: boolean;
  confidence: "high" | "medium" | "low";
  numero_parcelas?: number;
  parcela_atual?: number;
  isDuplicate?: boolean;
}

export interface InvoiceParseResult {
  invoice?: {
    source: string;
    total_amount: number;
    due_date: string;
    minimum_payment?: number;
  };
  transactions: ImportedTransaction[];
}

export const WORDS_RECEITA = ["pix recebido", "ted recebido", "ted", "crédito", "pagamento recebido", "remuneração", "salário", "transferência recebida", "boleto recebido", "estorno", "reembolso"];
export const WORDS_DESPESA = ["pix enviado", "transferência enviada", "pagamento", "compra", "débito", "tarifa", "mensalidade", "fatura", "saque", "iof", "anuidade", "seguro"];

export const BLACKLIST_KEYWORDS = [
  "saldo anterior", "saldo atual", "total da fatura", "pagamento efetuado", 
  "pagamento recebido", "total de gastos", "limite disponível", "limite total",
  "encargos", "juros", "multa", "demonstrativo", "vencimento", "fechamento", "fechada", "fechamento de fatura",
  "resumo", "detalhamento", "provisório", "proxima fatura", "melhor dia",
  "banco ", "cnpj", "av. ", "avenida", "cep:", "endereço", "telefone:", "fatura mensal",
  "atendimento", "sac:", "ouvidoria", "total selecionado", "pagamento total", "pagar fatura",
  "realizados até", "esta é a fatura", "esta fatura", "contendo compras", "código de barras", 
  "parcelamento", "histórico de", "período", "pagando o valor", "desta fatura",
  "contratará", "utilizando o", "exato de até", "valor total", "resumo da fatura",
  "total despesas", "total de pagamentos", "consolidado de", "seus limites", "seu limite",
  "pagando o", "utilizando o", "opção!", "saque à crédito", "mínimo", "anuidade", 
  "app way", "orientações", "beneficiária", "exato de", "favor de", "atraso da", 
  "fatura aberta", "abertura de fatura", "abr."
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Moradia/Aluguel": ["aluguel", "condomínio", "iptu", "luz", "energia", "enel", "cpfl", "light", "sabesp", "agua", "gás", "comgas"],
  "Alimentação/Supermercado": ["supermercado", "mercado", "pao de acucar", "carrefour", "extra", "assai", "atacadão", "dia%", "restaurante", "lanchonete", "delivery", "ifood", "uber eats", "rappi", "mcdonalds", "bk ", "burger king", "starbucks", "padaria", "confeitaria", "açougue"],
  "Transporte/Combustível": ["uber", "99", "taxi", "estacionamento", "gasolina", "combustível", "posto ", "shell", "ipiranga", "br ", "petrobras", "pedágio", "sem parar", "veloe", "ônibus", "metrô", "cptm"],
  "Saúde/Academia": ["farmácia", "droga", "raia", "drogasil", "pague menos", "médico", "hospital", "clinica", "unimed", "bradesco saude", "sulamerica", "plano de saúde", "academia", "smart fit", "bluefit", "gympass", "dentista"],
  "Educação/Cursos": ["curso", "escola", "faculdade", "universidade", "livro", "saraiva", "amazon", "udemy", "alura", "hotmart", "coursera", "kiwify", "uniasselvi", "objetivo"],
  "Lazer/Entretenimento": ["netflix", "spotify", "amazon prime", "disney", "youtube", "hbo", "cinema", "ingresso", "teatro", "show", "viagem", "hotel", "airbnb", "decolar", "booking", "jogos", "steam", "playstation", "xbox"],
  "Assinaturas/Software": ["apple", "google", "microsoft", "adobe", "canva", "github", "aws", "vercel", "digitalocean"],
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

export function extractParcelInfo(descricao: string): { cleanDesc: string; parcela_atual?: number; numero_parcelas?: number } {
  // Matches "01/10", "1/5", "Parc 3/12", "03/12", "03/ 12"
  const match = descricao.match(/(?:parc\w*\s*)?(\d{1,2})\s*\/\s*(\d{1,2})/i);
  if (match) {
    const parcela_atual = parseInt(match[1], 10);
    const numero_parcelas = parseInt(match[2], 10);
    // Only accept if sensible percentages/fractions are not mistaken for parcels
    if (parcela_atual > 0 && numero_parcelas > 0 && parcela_atual <= numero_parcelas && numero_parcelas <= 120) {
      const cleanDesc = descricao.replace(match[0], "").replace(/\s+/g, " ").trim();
      return { cleanDesc: cleanDesc || descricao, parcela_atual, numero_parcelas };
    }
  }
  return { cleanDesc: descricao };
}

export function processPDFLines(lines: string[]): ImportedTransaction[] {
  console.log("[PDF Parser] Total lines to process:", lines.length);

  const transactions: ImportedTransaction[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    
    // Ignorar cabeçalhos e ruídos explícitos
    if (BLACKLIST_KEYWORDS.some(kw => lowerLine.includes(kw))) continue;

    // Buscadores tolerantes que permitem espaços anômalos inseridos pelo OCR, 
    // como "- 318,79" ou "05 / 02" ou ".99"
    const dateRegexGlob = /\b(\d{2}\s*\/\s*\d{2}(?:\s*\/\s*\d{2,4})?)\b/;
    // Aceita valores com ou sem sinal negativo prévio, com espaços antes da vírgula
    const currencyRegexGlob = /(-\s*)?(\d{1,3}(?:\.\d{3})*\s*[.,]\s*\d{2})\b/g;

    const currencyMatches = line.match(currencyRegexGlob) || [];
    
    // Rejeita a linha se tiver muitos valores (provavelmente é o cabeçalho descritivo da tabela)
    if (currencyMatches.length > 2) continue;

    const dateMatch = line.match(dateRegexGlob);

    if (dateMatch && currencyMatches.length > 0) {
      // Pega o último valor encontrado na linha (comumente o valor R$ pulando a coluna Parcela se houver um número lá, mas parcelas não tem vírgula)
      const rawValueMatch = currencyMatches[currencyMatches.length - 1];
      const rawDateStr = dateMatch[0];
      const rawDate = dateMatch[1].replace(/\s+/g, ""); // Tira espacos vazios "05 / 02" -> "05/02"

      // A descrição é todo o resto da linha tirando a data e o valor
      let desc = line
        .replace(rawDateStr, "")
        .replace(rawValueMatch, "")
        .replace(/R\$\s*/gi, "") // remove R$ seOCR leu
        .replace(/^[^\w\s]+/, "") // Tira simbolos do começo da descricao ex "@ "
        .trim();

      // REGRA CRÍTICA: Se não restar nome do estabelecimento (somos tolerantes a pelo menos 3 chars que não sejam só números)
      if (desc.replace(/[^a-zA-Z]/g, '').length < 3) continue;

      // Descarta linhas soltas ou fragmentadas sem sentido na fátura
      if (BLACKLIST_KEYWORDS.some(kw => desc.toLowerCase().includes(kw))) continue;

      if (desc.length > 2) {
        // Tratar a conversão da data corretamente para nosso sistema
        const parts = rawDate.split("/");
        let formattedDate = `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (parts.length === 3) {
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          formattedDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }

        // Tratar o valor monetário com espacamento ou ponto "19 . 90" -> "19.90"
        const cleanValueStr = rawValueMatch.replace(/\s+/g, "");
        const valor = parseAmount(cleanValueStr);

        if (valor && Math.abs(valor) > 0.01) {
          const { cleanDesc, parcela_atual, numero_parcelas } = extractParcelInfo(desc.replace(/\s+/g, " "));
          
          transactions.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            data: formattedDate,
            descricao: cleanDesc.trim(),
            valor: Math.abs(valor),
            tipo: guessType(desc, valor),
            categoria: guessCategory(cleanDesc.trim()),
            selected: true,
            confidence: currencyMatches.length === 1 ? "high" : "medium",
            parcela_atual,
            numero_parcelas,
            isDuplicate: false
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

      const baseDesc = (descricao || "Transação Importada").replace(/\+/g, " ").replace(/\s+/g, " ").trim();
      const { cleanDesc, parcela_atual, numero_parcelas } = extractParcelInfo(baseDesc);

      transactions.push({
        id: crypto.randomUUID(),
        data,
        descricao: cleanDesc,
        valor: Math.abs(valor),
        tipo: guessType(baseDesc, valor, typeOverride),
        categoria: guessCategory(baseDesc),
        selected: true,
        confidence: confidenceLevel(baseDesc),
        parcela_atual,
        numero_parcelas,
        isDuplicate: false
      });
      continue;
    }
  }
  return transactions;
}
