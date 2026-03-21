import { describe, it, expect } from "vitest";
import { processPDFLines, parseAmount, guessType, guessCategory } from "../lib/parsing-utils";

describe("statement-parser", () => {
  describe("parseAmount", () => {
    it("should parse Brazilian format 1.234,56", () => {
      expect(parseAmount("1.234,56")).toBe(1234.56);
      expect(parseAmount("R$ 1.234,56")).toBe(1234.56);
    });

    it("should parse negative values in different formats", () => {
      expect(parseAmount("-150,00")).toBe(-150);
      expect(parseAmount("(150,00)")).toBe(-150);
      expect(parseAmount("150,00D")).toBe(-150);
    });

    it("should ignore years like 2024 if no decimal separators", () => {
      expect(parseAmount("2024")).toBe(null);
    });
  });

  describe("guessType", () => {
    it("should identify revenue correctly", () => {
      expect(guessType("PIX RECEBIDO JOAO", 100)).toBe("receita");
      expect(guessType("ESTORNO COMPRA", 50)).toBe("receita");
    });

    it("should identify expense correctly", () => {
      expect(guessType("UBER TRIP", 25)).toBe("despesa");
      expect(guessType("MERCADO EXTRA", 150)).toBe("despesa");
    });
  });

  describe("processPDFLines", () => {
    it("should extract a simple transaction", () => {
      const lines = ["15/03/2024 UBER TRIP 25,50"];
      const result = processPDFLines(lines);
      expect(result).toHaveLength(1);
      expect(result[0].descricao).toBe("UBER TRIP");
      expect(result[0].valor).toBe(25.50);
      expect(result[0].data).toBe("2024-03-15");
    });

    it("should ignore blacklisted lines", () => {
      const lines = [
        "15/03/2024 UBER TRIP 25,50",
        "16/03/2024 SALDO ANTERIOR 1.000,00",
        "SALDO ATUAL 974,50"
      ];
      const result = processPDFLines(lines);
      expect(result).toHaveLength(1);
      expect(result[0].descricao).toBe("UBER TRIP");
    });

    it("should handle multi-line descriptions", () => {
      const lines = [
        "15/03/2024 RESTAURANTE",
        "SABOR DO SUL 45,00",
        "16/03/2024 O Boticario 120,00"
      ];
      const result = processPDFLines(lines);
      expect(result).toHaveLength(2);
      expect(result[0].descricao).toBe("RESTAURANTE SABOR DO SUL");
      expect(result[0].valor).toBe(45);
    });

    it("should handle DD/MM format", () => {
      const currentYear = new Date().getFullYear();
      const lines = ["20/03 IFOOD 89,90"];
      const result = processPDFLines(lines);
      expect(result).toHaveLength(1);
      expect(result[0].data).toBe(`${currentYear}-03-20`);
    });

    it("should categorize correctly with new keywords", () => {
      const lines = ["10/03/2024 VIVO MOVEL 150,00"];
      const result = processPDFLines(lines);
      expect(result[0].categoria).toBe("Telefonia/Internet");
    });
  });
});
