import * as XLSX from "xlsx";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
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

  return processPDFLines(lines);
}

