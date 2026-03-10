// Standalone test script

function parseInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return { isValid: false, rawText: trimmed, type: "despesa", valor: 0, descricao: "", categoria: null };

  const receitaKeywords = ["recebi", "ganhei", "vendi", "pagou"];
  const lowerInput = trimmed.toLowerCase();
  const isReceita = receitaKeywords.some((kw) => lowerInput.includes(kw));
  const type = isReceita ? "receita" : "despesa";

  const valueMatch = trimmed.match(/(?:R\$)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  let valor = 0;
  let descriptionText = trimmed;
  
  if (valueMatch && valueMatch[1]) {
    const valueStr = valueMatch[1];
    const cleanValueStr = valueStr.replace(/[^\d.,]/g, "");
    let numericStr = cleanValueStr;
    if (cleanValueStr.includes(".") && cleanValueStr.includes(",")) {
      numericStr = cleanValueStr.replace(/\./g, "").replace(",", ".");
    } else if (cleanValueStr.includes(",")) {
      numericStr = cleanValueStr.replace(",", ".");
    }
    valor = parseFloat(numericStr);
    
    descriptionText = trimmed.replace(valueMatch[0], "").trim();
  }

  descriptionText = descriptionText
    .replace(/^(de|do|da|por)\s+/i, "")
    .replace(/\s+(de|do|da|por)$/i, "")
    .trim();

  // Mocking suggestCategory for now to prevent import errors in pure node script without ts-node/vite setup
  let categoria = "Outros";
  if (type === "despesa") {
    if (descriptionText.toLowerCase().includes("uber")) categoria = "Transporte";
    else categoria = "Outras Despesas";
  }

  return {
    isValid: valor > 0 && descriptionText.length > 0,
    rawText: trimmed,
    type,
    valor,
    descricao: descriptionText,
    categoria,
  };
}

const tests = [
  "uber 23",
  "almoço 40.50",
  "recebi personal 300",
  "vendi bicicleta por R$ 500,00",
  "pagou a conta 1.250,55"
];

tests.forEach(t => {
  console.log(`Input: "${t}"`);
  console.log(parseInput(t));
  console.log("-------------------");
});
