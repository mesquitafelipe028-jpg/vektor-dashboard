import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import { 
  type ImportedTransaction, 
  processPDFLines, 
  parseRows 
} from "./parsing-utils";

export { type ImportedTransaction };

// PDF.js worker configuration
// @ts-ignore
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function parseSpreadsheet(file: File): Promise<ImportedTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        resolve(parseRows(rows));
      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function parsePDF(file: File): Promise<ImportedTransaction[]> {
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

  return processPDFLines(lines);
}

export async function parseImage(file: File): Promise<ImportedTransaction[]> {
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
    
    return processPDFLines(lines);
  } catch (err) {
    console.error("OCR Error:", err);
    throw new Error("Falha ao processar o extrato da imagem. Tente melhorar o corte.");
  }
}

