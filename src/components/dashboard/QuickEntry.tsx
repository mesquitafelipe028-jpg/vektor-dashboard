import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap, Banknote, Tag, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { suggestCategory, formatCurrency } from "@/lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User as UserIcon } from "lucide-react";

type ParsedData = {
  isValid: boolean;
  rawText: string;
  type: "receita" | "despesa";
  valor: number;
  descricao: string;
  categoria: string | null;
};

export function QuickEntry({ financialView }: { financialView: "tudo" | "pessoal" | "mei" }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<"mei" | "pessoal">(financialView === "pessoal" ? "pessoal" : "mei");
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const parseInput = useCallback((input: string): ParsedData => {
    const trimmed = input.trim();
    if (!trimmed) return { isValid: false, rawText: trimmed, type: "despesa", valor: 0, descricao: "", categoria: null };

    // 1. Identify type
    const receitaKeywords = ["recebi", "ganhei", "vendi", "pagou"];
    const lowerInput = trimmed.toLowerCase();
    const isReceita = receitaKeywords.some((kw) => lowerInput.includes(kw));
    const type = isReceita ? "receita" : "despesa";

    // 2. Extract value
    // Match numbers like 23, 23.50, 23,50, 1.250,00
    // Simplified regex: optional R$, matches digits, spaces, dots, commas
    const valueMatch = trimmed.match(/(?:R\$)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
    let valor = 0;
    let descriptionText = trimmed;
    
    if (valueMatch && valueMatch[1]) {
      const valueStr = valueMatch[1];
      // remove currency symbols/spaces from matched value string
      const cleanValueStr = valueStr.replace(/[^\d.,]/g, "");
      // if it has both dots and commas, assume comma is decimal (Brazilian format: 1.250,00)
      let numericStr = cleanValueStr;
      if (cleanValueStr.includes(".") && cleanValueStr.includes(",")) {
        numericStr = cleanValueStr.replace(/\./g, "").replace(",", ".");
      } else if (cleanValueStr.includes(",")) {
        numericStr = cleanValueStr.replace(",", ".");
      }
      valor = parseFloat(numericStr);
      
      // Remove the value from the description
      descriptionText = trimmed.replace(valueMatch[0], "").trim();
    }

    // Optional: cleanup common connecting words ("uber de 23", "recebi 300 do joão")
    descriptionText = descriptionText
      .replace(/^(de|do|da|por)\s+/i, "")
      .replace(/\s+(de|do|da|por)$/i, "")
      .trim();

    // 3. Category
    const categoria = suggestCategory(descriptionText) || (type === "receita" ? "Outros" : "Outras Despesas");

    return {
      isValid: valor > 0 && descriptionText.length > 0,
      rawText: trimmed,
      type,
      valor,
      descricao: descriptionText,
      categoria,
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const result = parseInput(text);
    setParsed(result);
    setSelectedConta(financialView === "pessoal" ? "pessoal" : "mei");

    if (result.isValid) {
      setIsDialogOpen(true);
    } else {
      toast.error("Não consegui entender.", { description: "Tente: 'uber 23' ou 'recebi do João 150'" });
      // Bring back focus so user can try again
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const insertData = useMutation({
    mutationFn: async (data: ParsedData) => {
      const table = data.type === "receita" ? "receitas" : "despesas";

      const payload = {
        descricao: data.descricao,
        valor: data.valor,
        data: new Date().toISOString().slice(0, 10),
        tipo_transacao: "unica",
        status: data.type === "receita" ? "recebido" : "pago",
        tipo_conta: selectedConta,
        user_id: user?.id,
        ...(data.type === "despesa" && { categoria: data.categoria }), // Despesas use category field primarily
      };

      const { error } = await supabase.from(table).insert([payload]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [variables.type === "receita" ? "receitas" : "despesas"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${variables.type === "receita" ? "Receita" : "Despesa"} registrada com sucesso!`);
      setText("");
      setIsDialogOpen(false);
    },
    onError: (e) => {
      toast.error("Erro ao registrar transação.", { description: e.message });
    }
  });

  const handleConfirm = () => {
    if (parsed && parsed.isValid) {
      insertData.mutate(parsed);
    }
  };

  const handleEdit = () => {
    if (!parsed) return;
    setIsDialogOpen(false);
    const path = parsed.type === "receita" ? "/receitas/nova" : "/despesas/nova";
    const params = new URLSearchParams({
      descricao: parsed.descricao,
      valor: String(parsed.valor),
      tipo_conta: selectedConta,
      ...(parsed.categoria ? { categoria: parsed.categoria } : {})
    });
    navigate(`${path}?${params.toString()}`); 
  };

  // Listen for Enter key if we decouple form submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Registro Rápido: Ex: 'uber 23' ou 'recebi 300'"
          className="pl-9 pr-12 h-10 border-dashed border-2 focus-visible:border-solid bg-muted/20"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={() => handleSubmit()}
            disabled={!text.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {parsed?.type === "receita" ? (
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-2.5 py-1">
                  Receita Detectada
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 px-2.5 py-1">
                  Despesa Detectada
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Confirme os dados extraídos ou edite-os.
            </DialogDescription>
          </DialogHeader>

          {parsed && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
               <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Valor</p>
                  <p className={`text-3xl font-bold font-heading ${parsed.type === "receita" ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(parsed.valor)}
                  </p>
               </div>
               
               <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground leading-none mb-1 text-left">Descrição & Categoria</p>
                      <p className="text-sm font-medium capitalize text-left">{parsed.descricao} <span className="mx-1 text-muted-foreground font-normal">•</span> {parsed.categoria}</p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1">
               <p className="text-xs text-muted-foreground mb-1">Destino do Registro</p>
               <Select value={selectedConta} onValueChange={(v: "mei" | "pessoal") => setSelectedConta(v)}>
                 <SelectTrigger className="h-9">
                   <SelectValue placeholder="Selecionar conta..." />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="mei">
                     <div className="flex items-center gap-2">
                       <Building2 className="h-4 w-4 text-muted-foreground" /> <span>Conta MEI</span>
                     </div>
                   </SelectItem>
                   <SelectItem value="pessoal">
                     <div className="flex items-center gap-2">
                       <UserIcon className="h-4 w-4 text-muted-foreground" /> <span>Conta Pessoal</span>
                     </div>
                   </SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row sm:justify-between items-center gap-2">
            <Button variant="outline" onClick={handleEdit} className="w-full sm:w-auto">
              Editar Dados
            </Button>
            <Button 
                onClick={handleConfirm} 
                disabled={insertData.isPending}
                className={`w-full sm:w-auto text-white shadow-md ${parsed?.type === "receita" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {insertData.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
