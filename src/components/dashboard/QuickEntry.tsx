import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap, Banknote, Tag, ArrowRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { suggestCategory, formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User as UserIcon } from "lucide-react";
import { queryKeys } from "@/lib/queryKeys";

type ParsedData = {
  isValid: boolean;
  rawText: string;
  type: "receita" | "despesa";
  valor: number;
  descricao: string;
  categoria: string | null;
  status: "pago" | "recebido" | "pendente";
};

export function QuickEntry({ financialView }: { financialView: "tudo" | "pessoal" | "mei" }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContaId, setSelectedContaId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Auto-select first account if only one exists
  useEffect(() => {
    if (isDialogOpen && !selectedContaId && accounts.length > 0) {
      setSelectedContaId(accounts[0].id);
    }
  }, [isDialogOpen, selectedContaId, accounts]);

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

    // 4. Status
    let status: "pago" | "recebido" | "pendente" = type === "receita" ? "recebido" : "pendente";
    const paidKeywords = ["pago", "paguei", "débito", "debito", "pix", "dinheiro", "efetivado"];
    if (type === "despesa" && paidKeywords.some(kw => lowerInput.includes(kw))) {
      status = "pago";
    }

    return {
      isValid: valor > 0 && descriptionText.length > 0,
      rawText: trimmed,
      type,
      valor,
      descricao: descriptionText,
      categoria,
      status,
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const result = parseInput(text);
    setParsed(result);
    // Logic to select default account will happen in useEffect above
    
    if (result.isValid) {
      setIsDialogOpen(true);
    } else {
      toast.error("Não consegui entender.", { description: "Tente: 'uber 23' ou 'recebi do João 150'" });
      // Bring back focus so user can try again
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const insertData = useMutation({
    mutationFn: async (data: ParsedData) => {
      if (isSubmittingManual) return;
      setIsSubmittingManual(true);
      console.log(`[QuickEntry] Starting ${data.type} insertion`);

      try {
        const table = data.type === "receita" ? "receitas" : "despesas";
        const todayStr = new Date().toISOString().slice(0, 10);

        const payload = {
          descricao: data.descricao,
          valor: data.valor,
          data: todayStr,
          tipo_transacao: "unica",
          status: data.status,
          tipo_conta: accounts.find(a => a.id === selectedContaId)?.classificacao || (financialView === "tudo" ? "mei" : financialView),
          conta_id: selectedContaId || null,
          user_id: user?.id,
          ...(data.type === "despesa" && { categoria: data.categoria }),
        };

        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;

        // Balance Sync
        const isSettled = data.status === "recebido" || data.status === "pago";
        if (isSettled && selectedContaId) {
          console.log(`[QuickEntry] Syncing balance for account ${selectedContaId}`);
          const { data: acc } = await supabase.from("contas_financeiras").select("saldo").eq("id", selectedContaId).single();
          if (acc) {
            const delta = data.type === "receita" ? data.valor : -data.valor;
            const newSaldo = (acc.saldo || 0) + delta;
            await supabase.from("contas_financeiras").update({ saldo: newSaldo } as any).eq("id", selectedContaId);
            console.log(`[QuickEntry] Balance updated to ${newSaldo}`);
          }
        }
      } catch (err) {
        setIsSubmittingManual(false);
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      console.log("[QuickEntry] Success! Invalidating queries...");
      qc.invalidateQueries({ queryKey: queryKeys.receitas() });
      qc.invalidateQueries({ queryKey: queryKeys.despesas() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      qc.invalidateQueries({ queryKey: queryKeys.accounts() });
      
      toast.success(`${variables.type === "receita" ? "Receita" : "Despesa"} registrada com sucesso!`);
      setText("");
      setIsDialogOpen(false);
      setIsSubmittingManual(false);
    },
    onError: (e: any) => {
      setIsSubmittingManual(false);
      toast.error("Erro ao registrar transação.", { description: e.message });
      console.error("[QuickEntry] Error:", e);
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
      conta_id: selectedContaId,
      tipo_conta: accounts.find(a => a.id === selectedContaId)?.classificacao || "",
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
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Registro Rápido: Ex: 'uber 23' ou 'recebi 300'"
          className="pl-10 pr-12 h-11 border border-border/50 bg-muted/30 focus-visible:ring-primary/20 focus-visible:border-primary/30 rounded-xl transition-all shadow-inner"
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10 mr-1"
            onClick={() => navigate("/despesas/nova?tipo=investment")}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + Investimento
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {parsed?.type === "receita" ? (
                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1">
                  Receita Detectada
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-2.5 py-1">
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
                  <p className={`text-3xl font-bold font-heading ${parsed.type === "receita" ? "text-primary" : "text-destructive"}`}>
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

            <div className="flex-1">
               <p className="text-xs text-muted-foreground mb-1">Destino do Registro</p>
               <Select value={selectedContaId} onValueChange={(v) => setSelectedContaId(v)}>
                 <SelectTrigger className="h-9">
                   <SelectValue placeholder="Selecionar conta..." />
                 </SelectTrigger>
                 <SelectContent>
                   {accounts.map((acc) => (
                     <SelectItem key={acc.id} value={acc.id}>
                       <div className="flex items-center gap-2">
                         {acc.classificacao === "mei" ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                         <span>{acc.nome}</span>
                       </div>
                     </SelectItem>
                   ))}
                   {accounts.length === 0 && (
                     <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                   )}
                 </SelectContent>
               </Select>
            </div>

          <DialogFooter className="mt-4 flex flex-row sm:justify-between items-center gap-2">
            <Button variant="outline" onClick={handleEdit} className="w-full sm:w-auto">
              Editar Dados
            </Button>
            <Button 
                onClick={handleConfirm} 
                disabled={insertData.isPending || isSubmittingManual}
                className={`w-full sm:w-auto text-white shadow-md ${parsed?.type === "receita" ? "bg-primary hover:bg-primary/90" : "bg-destructive hover:bg-destructive/90"}`}
            >
              {insertData.isPending || isSubmittingManual ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
