import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import { 
  type ImportedTransaction,
  type InvoiceParseResult,
  processPDFLines, 
  parseRows 
} from "./parsing-utils";

export { type ImportedTransaction, type InvoiceParseResult };

// PDF.js worker configuration
// @ts-ignore
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parseSpreadsheet(file: File): Promise<InvoiceParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        resolve({ transactions: parseRows(rows) });
      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function parsePDF(file: File): Promise<InvoiceParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group items by their vertical position (y-coordinate)
    const items = textContent.items as any[];
    const rows: Record<number, any[]> = {};
    
    items.forEach(item => {
      const y = Math.round(item.transform[5]); // y-coordinate is the 6th element in transform matrix
      if (!rows[y]) rows[y] = [];
      rows[y].push(item);
    });

    // Sort y-coordinates descending (top to bottom)
    const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
    
    sortedY.forEach(y => {
      // Sort items in this row by x-coordinate
      const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const rowText = rowItems.map(item => item.str).join(" ");
      if (rowText.trim()) lines.push(rowText);
    });
  }

  if (lines.length === 0) {
    throw new Error("Nenhum texto encontrado no PDF. Se a fatura for apenas uma imagem, faça um print e envie o arquivo de imagem diretamente.");
  }

  return analyzeLinesForInvoice(lines);
}

export async function parseImage(file: File): Promise<InvoiceParseResult> {
  try {
    // 1. Ampliar a imagem (Upscale) com Canvas para aumentar incrivelmente a chance do Tesseract enxergar vírgulas
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgUrl;
    });

    const canvas = document.createElement("canvas");
    const scale = 2.5; // Escala mágica para Tesseract ler faturas e cupons
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Falha ao inicializar Canvas");
    
    // Suavização apropriada para textos upscale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Converte o canvas para Blob para o Tesseract
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    URL.revokeObjectURL(imgUrl);

    // 2. Chamar o Tesseract na Imagem melhorada
    const { data: { text } } = await Tesseract.recognize(blob, 'por', {
      logger: (m) => console.log("[OCR Progress]", m)
    });
    
    const lines = text.split(/\n/g)
      .map(l => l.trim().replace(/\s{2,}/g, " "))
      .filter(l => l.length > 5);
      
    if (lines.length === 0) {
      throw new Error("Nenhum texto identificado. Tente uma imagem com mais foco ou fundo liso.");
    }
    
    return analyzeLinesForInvoice(lines);
  } catch (err) {
    console.error("OCR Error:", err);
    throw new Error("Falha ao processar o extrato da imagem. Tente melhorar o corte.");
  }
}

function analyzeLinesForInvoice(lines: string[]): InvoiceParseResult {
  const transactions = processPDFLines(lines);
  const fullText = lines.join(" ").toLowerCase();
  
  // Basic heuristic to identify if it is an invoice and not just a bank statement
  if (fullText.includes("fatura") || fullText.includes("cartão de crédito") || fullText.includes("vencimento")) {
    let source = "Cartão de Crédito";
    if (fullText.includes("nubank")) source = "Nubank";
    else if (fullText.includes("itaú") || fullText.includes("itau")) source = "Itaú";
    else if (fullText.includes("santander")) source = "Santander";
    else if (fullText.includes("bradesco")) source = "Bradesco";
    else if (fullText.includes("inter")) source = "Banco Inter";
    else if (fullText.includes("c6")) source = "C6 Bank";

    let total_amount = 0;
    let due_date = new Date().toISOString().split("T")[0]; // Fallback today
    let minimum_payment = 0;

    // Search for Vencimento using RegEx
    // typical formats: "Vencimento 10/12/2026", "Vencimento: 10/12", "Vencido em 10/12/2026"
    const dueMatch = fullText.match(/(?:vencimento|venc\.|pague até)[\s:]*(\d{2}\/\d{2}(?:\/\d{2,4})?)/);
    if (dueMatch) {
      const parts = dueMatch[1].split("/");
      due_date = parts.length === 3 
        ? `${parts[2].length === 2 ? '20'+parts[2] : parts[2]}-${parts[1]}-${parts[0]}`
        : `${new Date().getFullYear()}-${parts[1]}-${parts[0]}`;
    }

    // Search for Total Amount
    const totalMatch = fullText.match(/(?:total da fatura|valor total|total a pagar)[\sR$]*([\d.,]+)/);
    if (totalMatch) {
      total_amount = parseFloat(totalMatch[1].replace(/\./g, "").replace(",", "."));
    } else {
      // Fallback: sum of all found transactions
      total_amount = transactions.reduce((acc, t) => acc + t.valor, 0);
    }

    // Search for Minimum Payment
    const minMatch = fullText.match(/m[ií]nimo[\sR$]*([\d.,]+)/);
    if (minMatch) {
      minimum_payment = parseFloat(minMatch[1].replace(/\./g, "").replace(",", "."));
    }

    if (total_amount && !Number.isNaN(total_amount)) {
      return {
        invoice: { source, total_amount, due_date, minimum_payment },
        transactions
      };
    }
  }

  // Not an invoice, just return transactions
  return { transactions };
}
