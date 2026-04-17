import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, toCategoryMeta } from "@/hooks/useCategories";
import { CalculatorModal } from "@/components/modals/CalculatorModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, AlignLeft, DollarSign, Calendar, 
  CreditCard, ChevronRight, ChevronDown, Tag, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { expenseCategories, type CategoryMeta } from "@/lib/categories";
import { suggestCategory, getLocalDateString } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";

// --- Reusable sub-components (Copy from TransactionForm for consistency) ---

function FormRow({
  icon: Icon, label, children, sublabel, onClick, expandable, expanded,
}: {
  icon: React.ElementType; label: string; children?: React.ReactNode;
  sublabel?: string; onClick?: () => void; expandable?: boolean; expanded?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 w-full ${onClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors" : ""}`}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
      {expandable && (
        expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </Wrapper>
  );
}

function CategoryGrid({ categories, selected, onSelect }: {
  categories: CategoryMeta[]; selected: string; onSelect: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {categories.map((cat) => {
        const isSelected = selected === cat.name;
        const Icon = cat.icon;
        return (
          <button
            key={cat.name}
            type="button"
            onClick={() => onSelect(cat.name)}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
              isSelected ? `ring-2 ring-primary ${cat.bg} scale-[1.02]` : "hover:bg-muted/60"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.bg}`}>
              <Icon className={`h-5 w-5 ${cat.color}`} />
            </div>
            <span className={`text-[10px] leading-tight text-center font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
              {cat.name.length > 10 ? cat.name.split("/")[0].split(" ")[0] : cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function QuickCardExpenseForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data: getLocalDateString(),
    cartao_id: "",
    parcelas: "1",
    categoria: "Lazer/Entretenimento"
  });

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const { categories: dbCategories } = useCategories("despesa");
  const customCategories = useMemo(() => dbCategories.map(toCategoryMeta), [dbCategories]);
  const allCategories = customCategories.length > 0 ? customCategories : expenseCategories;

  // Query credit cards
  const { data: cartoes = [] } = useQuery({
    queryKey: ["cartoes_credito", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartoes_credito").select("*").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Auto-suggest category based on description
  const handleDescriptionChange = (desc: string) => {
    const suggested = suggestCategory(desc);
    if (suggested) {
      setForm(prev => ({ ...prev, descricao: desc, categoria: suggested }));
    } else {
      setForm(prev => ({ ...prev, descricao: desc }));
    }
  };

  const suggestedCat = suggestCategory(form.descricao);

  const saveExpense = useMutation({
    mutationFn: async () => {
      let sanitizedValor = form.valor.trim();
      if (sanitizedValor.includes(".") && sanitizedValor.includes(",")) {
        sanitizedValor = sanitizedValor.replace(/\./g, "").replace(",", ".");
      } else if (sanitizedValor.includes(",")) {
        sanitizedValor = sanitizedValor.replace(",", ".");
      }

      const valorTotal = parseFloat(sanitizedValor);
      const parcelas = parseInt(form.parcelas) || 1;
      
      if (!valorTotal || valorTotal <= 0) throw new Error("Valor inválido");
      if (!form.descricao.trim()) throw new Error("Descrição obrigatória");
      if (!form.cartao_id) throw new Error("Selecione um cartão");

      const valorParcela = valorTotal / parcelas;
      const insertsTransactions: any[] = [];
      const insertsComprasCartao: any[] = [];
      let currentCompra = new Date(form.data + "T12:00:00");

      for (let i = 1; i <= parcelas; i++) {
        let desc = form.descricao.trim();
        if (parcelas > 1) desc = `${desc} (${i}/${parcelas})`;
        
        const payloadCommon = {
          user_id: user!.id,
          description: desc,
          amount: valorParcela,
          date: currentCompra.toISOString().slice(0, 10),
          category: form.categoria || "Outros",
          type: "expense",
          subtype: "credit_card_expense",
          status: "confirmed",
          account_id: form.cartao_id,
          numero_parcelas: parcelas,
          parcela_atual: i
        };

        insertsTransactions.push(payloadCommon);

        insertsComprasCartao.push({
          user_id: user!.id,
          descricao: desc,
          valor: valorParcela,
          data: currentCompra.toISOString().slice(0, 10),
          categoria: form.categoria || "Outros",
          cartao_id: form.cartao_id
        });

        currentCompra.setMonth(currentCompra.getMonth() + 1);
      }

      const { error: tError } = await supabase.from("transactions").insert(insertsTransactions);
      if (tError) throw tError;

      const { error: cError } = await supabase.from("compras_cartao").insert(insertsComprasCartao);
      if (cError) throw cError;
    },
    onSuccess: async () => {
      const userId = user?.id;
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.despesas(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.accounts(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.transactions(userId) }),
        qc.invalidateQueries({ queryKey: ["compras_cartao"] }),
      ]);
      toast.success("Compra no cartão agendada com sucesso!");
      navigate(-1);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar compra no cartão")
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button type="button" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
                Nova Fatura/Compra <Sparkles className="h-3.5 w-3.5 text-primary" />
            </h2>
        </div>
        <Button
          size="sm"
          onClick={() => saveExpense.mutate()}
          disabled={saveExpense.isPending}
          className="bg-primary hover:bg-primary/90 text-white px-5 rounded-full text-sm"
        >
          {saveExpense.isPending ? "..." : "Salvar"}
        </Button>
      </div>

      <div className="max-w-lg mx-auto pb-10">
        {/* Descrição */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <AlignLeft className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Input
              value={form.descricao}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Ex: Netflix, Nubank, Uber..."
              className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0 bg-transparent"
              maxLength={200}
              autoFocus
            />
          </div>
        </div>
        <Separator />

        {/* Valor */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <DollarSign className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs text-muted-foreground">Valor Total (R$)</p>
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
                value={form.valor}
                onChange={(e) => setForm(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0,00"
                className="border-0 p-0 h-auto text-lg font-bold shadow-none focus-visible:ring-0 bg-transparent"
              />
            ) : (
              <div 
                className="border-0 p-0 h-auto text-lg font-bold flex items-center bg-transparent cursor-pointer w-full min-h-[1.75rem]"
                onClick={() => setCalculatorOpen(true)}
              >
                <span className={form.valor ? "text-foreground" : "text-muted-foreground"}>
                  {form.valor ? Number(form.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                </span>
              </div>
            )}
            <CalculatorModal 
              open={calculatorOpen}
              onOpenChange={setCalculatorOpen}
              initialValue={form.valor}
              onConfirm={(val) => setForm(prev => ({ ...prev, valor: val }))}
              accentColor="emerald"
            />
          </div>
        </div>
        <Separator />

        {/* Data */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Data da Compra</p>
            <Input 
                type="date" 
                value={form.data} 
                onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))} 
                className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0 bg-transparent" 
            />
          </div>
        </div>
        <Separator />

        {/* Parcelas */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <span className="h-5 w-5 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border-2 border-muted-foreground/30 rounded-md">
            1/x
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Quantidade de Parcelas</p>
            <Input 
                type="number" 
                min="1" 
                max="72"
                value={form.parcelas} 
                onChange={(e) => setForm(prev => ({ ...prev, parcelas: e.target.value }))} 
                className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0 bg-transparent" 
            />
          </div>
        </div>
        <Separator />

        {/* Cartão */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Qual Cartão?</p>
            <Select value={form.cartao_id} onValueChange={v => setForm(prev => ({ ...prev, cartao_id: v }))}>
              <SelectTrigger className="border-0 p-0 h-auto shadow-none focus:ring-0 text-sm font-medium bg-transparent">
                <SelectValue placeholder="Selecione o Cartão" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.length === 0 && <span className="p-2 text-sm text-muted-foreground">Nenhum cartão cadastrado.</span>}
                {cartoes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />

        {/* Categoria */}
        <FormRow
          icon={Tag}
          label="Categoria"
          sublabel={form.categoria || "Selecionar categoria"}
          onClick={() => setCategoryOpen(!categoryOpen)}
          expandable
          expanded={categoryOpen}
        >
          {suggestedCat && form.categoria === suggestedCat && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Sugerida</Badge>
          )}
        </FormRow>
        <AnimatePresence>
          {categoryOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 pt-2 bg-muted/30">
                <CategoryGrid
                  categories={allCategories}
                  selected={form.categoria || ""}
                  onSelect={(name) => {
                    setForm(prev => ({ ...prev, categoria: name }));
                    setCategoryOpen(false);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Separator />

        <div className="p-6 text-center text-xs text-muted-foreground italic">
            O lançamento será agendado em sua fatura conforme a data selecionada.
        </div>
      </div>
    </div>
  );
}
