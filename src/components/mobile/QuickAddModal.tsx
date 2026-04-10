import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, ChevronDown, CreditCard, Layers } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";
import { expenseCategories, revenueCategories } from "@/lib/utils";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { CalculatorModal } from "@/components/modals/CalculatorModal";

const QUICK_ADD_PREFS_KEY = "quickadd_prefs";

interface QuickAddPrefs {
  lastCategory: { receita: string; despesa: string };
  typeCounts: { receita: number; despesa: number };
}

function getPrefs(): QuickAddPrefs {
  try {
    const raw = localStorage.getItem(QUICK_ADD_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastCategory: { receita: "", despesa: "" }, typeCounts: { receita: 0, despesa: 0 } };
}

function savePrefs(prefs: QuickAddPrefs) {
  localStorage.setItem(QUICK_ADD_PREFS_KEY, JSON.stringify(prefs));
}

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function QuickAddModal({ open, onOpenChange, defaultDate }: QuickAddModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const prefs = getPrefs();
  const defaultType = prefs.typeCounts.despesa > prefs.typeCounts.receita ? "despesa" : "receita";

  const [tipo, setTipo] = useState<"receita" | "despesa" | "cartao" | "assinatura">(defaultType as any);
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState(prefs.lastCategory[defaultType] || "");
  const [showMore, setShowMore] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [data, setData] = useState(defaultDate || getLocalDateString());
  // Novos campos Cartao/Assinatura
  const [cartaoId, setCartaoId] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [diaCobranca, setDiaCobranca] = useState(new Date().getDate().toString());

  // Reset form when opened
  useEffect(() => {
    if (open) {
      const p = getPrefs();
      const dt = p.typeCounts.despesa > p.typeCounts.receita ? "despesa" : "receita";
      setTipo(dt as any);
      setValor("");
      setCategoria(p.lastCategory[dt] || "");
      setShowMore(defaultDate ? true : false);
      setDescricao("");
      setClienteId("");
      setData(defaultDate || getLocalDateString());
    }
  }, [open, defaultDate]);

  // Update category when tipo changes
  useEffect(() => {
    const p = getPrefs();
    if (tipo === "receita" || tipo === "despesa") {
       setCategoria(p.lastCategory[tipo] || "");
    } else {
       setCategoria("");
    }
  }, [tipo]);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: cartoes = [] } = useQuery({
    queryKey: ["cartoes_credito", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartoes_credito").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Pre-select cartao
  useEffect(() => {
     if (tipo === "cartao" && cartoes.length > 0 && !cartaoId) {
        setCartaoId(cartoes[0].id);
     }
  }, [tipo, cartoes, cartaoId]);

  const categories = tipo === "receita" ? revenueCategories : expenseCategories;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const numVal = parseFloat(valor);
      if (!numVal || numVal <= 0) throw new Error("Valor inválido");

      const parsedParcelas = parseInt(parcelas) || 1;
      const parsedDia = parseInt(diaCobranca) || new Date().getDate();

      if (tipo === "assinatura") {
          const payloadAssinatura = {
             user_id: user!.id,
             nome: descricao || "Nova Assinatura",
             valor: numVal,
             categoria: categoria || null,
             dia_cobranca: parsedDia,
             forma_pagamento: "cartao_credito", // fallback
             ativa: true
          };
          const { error } = await supabase.from("radar_assinaturas").insert(payloadAssinatura);
          if (error) throw error;
          return;
      }

      if (tipo === "cartao") {
          if (!cartaoId) throw new Error("Selecione um cartão");
          const inserts: any[] = [];
          const valorParcela = numVal / parsedParcelas;
          let currentCompra = new Date(data + "T12:00:00");
          for (let i = 1; i <= parsedParcelas; i++) {
             let desc = descricao || categoria || "Compra no Cartão";
             if (parsedParcelas > 1) desc += ` (${i}/${parsedParcelas})`;
             inserts.push({
                 user_id: user!.id,
                 cartao_id: cartaoId,
                 descricao: desc,
                 valor: valorParcela,
                 data: currentCompra.toISOString().slice(0, 10),
                 categoria: categoria || null
             });
             currentCompra.setMonth(currentCompra.getMonth() + 1);
          }
          const { error } = await supabase.from("compras_cartao").insert(inserts);
          if (error) throw error;
          return;
      }

      const payload = {
        user_id: user!.id,
        description: descricao || categoria || (tipo === "receita" ? "Receita rápida" : "Despesa rápida"),
        amount: numVal,
        date: data,
        type: tipo === "receita" ? "income" : "expense",
        status: "confirmed", // QuickAdd assumes the money was already moved
        category: categoria || null,
        cliente_id: tipo === "receita" ? (clienteId || null) : null,
      };

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;

      // Save prefs
      const p = getPrefs();
      if (tipo === "receita" || tipo === "despesa") {
         p.lastCategory[tipo] = categoria;
         p.typeCounts[tipo]++;
         savePrefs(p);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
      qc.invalidateQueries({ queryKey: ["radar_assinaturas"] });
      toast.success("Transação registrada com sucesso");
      onOpenChange(false);
    },
    onError: (e) => {
      if (e.message === "Valor inválido") {
        toast.error("Informe um valor válido");
      } else {
        toast.error("Erro ao salvar transação");
      }
    },
  });

  const addQuickValue = (amount: number) => {
    const current = parseFloat(valor) || 0;
    setValor(String(current + amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Registro Rápido</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Type toggle */}
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide">
            <button
              type="button"
              onClick={() => setTipo("receita")}
              className={cn(
                "snap-start shrink-0 min-w-[100px] flex 1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all border",
                tipo === "receita"
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <TrendingUp className="h-4 w-4" /> Receita
            </button>
            <button
              type="button"
              onClick={() => setTipo("despesa")}
              className={cn(
                "snap-start shrink-0 min-w-[100px] flex 1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all border",
                tipo === "despesa"
                  ? "bg-destructive/10 border-destructive text-destructive"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <TrendingDown className="h-4 w-4" /> Despesa
            </button>
            <button
              type="button"
              onClick={() => setTipo("cartao")}
              className={cn(
                "snap-start shrink-0 min-w-[100px] flex 1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all border",
                tipo === "cartao"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <CreditCard className="h-4 w-4" /> Cartão
            </button>
            <button
              type="button"
              onClick={() => setTipo("assinatura")}
              className={cn(
                "snap-start shrink-0 min-w-[100px] flex 1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all border",
                tipo === "assinatura"
                  ? "bg-indigo-500/10 border-indigo-500 text-indigo-600"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <Layers className="h-4 w-4" /> Assina.
            </button>
          </div>

          {/* Value - large input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <button 
                type="button" 
                onClick={() => setManualMode(!manualMode)} 
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Alternar para digitação manual se a calculadora falhar"
              >
                {manualMode ? "Usar Módulo Inteligente" : "Digitar Manualmente"}
              </button>
            </div>
            {manualMode ? (
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
                className="h-16 text-3xl font-bold text-center"
                autoFocus
              />
            ) : (
              <div 
                className="border border-input bg-background flex items-center justify-center cursor-pointer rounded-md h-16 transition-all hover:bg-muted/50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCalculatorOpen(true);
                }}
              >
                <span className={`text-3xl font-bold text-center ${valor ? "text-foreground" : "text-muted-foreground"}`}>
                  {valor ? Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "R$ 0,00"}
                </span>
              </div>
            )}
            <CalculatorModal 
              open={calculatorOpen}
              onOpenChange={setCalculatorOpen}
              initialValue={valor}
              onConfirm={(val) => setValor(val)}
              accentColor={tipo === "receita" ? "emerald" : "red"}
            />
          </div>

          {/* Quick value buttons */}
          <div className="flex gap-2">
            {[50, 100, 200].map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => addQuickValue(amount)}
              >
                +{amount}
              </Button>
            ))}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "cartao" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cartão *</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "assinatura" && (
             <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Dia de Cobrança *</Label>
               <Input 
                 type="number" 
                 min="1" max="31" 
                 value={diaCobranca} 
                 onChange={(e) => setDiaCobranca(e.target.value)} 
                 placeholder="Ex: 10"
               />
             </div>
          )}

          {/* More options */}
          <Collapsible open={showMore} onOpenChange={setShowMore}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
              >
                <span>Mais opções</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição da transação"
                  maxLength={200}
                />
              </div>

              {tipo === "receita" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {tipo === "cartao" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                  />
                </div>
              )}

              {tipo !== "assinatura" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Save button */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !valor}
            className={cn(
              "w-full h-12 text-base font-semibold transition-colors",
              tipo === "despesa" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" :
              tipo === "cartao" ? "bg-emerald-500 hover:bg-emerald-600 text-white" :
              tipo === "assinatura" ? "bg-indigo-500 hover:bg-indigo-600 text-white" :
              ""
            )}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
