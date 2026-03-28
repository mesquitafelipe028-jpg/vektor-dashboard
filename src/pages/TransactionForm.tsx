import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, toCategoryMeta } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, AlignLeft, DollarSign, RefreshCw, Calendar, CheckCircle2,
  Building2, ChevronRight, ChevronDown, Users, Tag, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { expenseCategories, revenueCategories, type CategoryMeta } from "@/lib/categories";
import { suggestCategory, getLocalDateString, IS_INVESTMENT_REGEX } from "@/lib/utils";
import { frequenciaLabels, generateInstallments, type TipoTransacao, type Frequencia } from "@/types/transactions";
import { queryKeys } from "@/lib/queryKeys";

type FormType = "receita" | "despesa";

interface FormData {
  descricao: string;
  valor: string;
  data: string;
  tipo_transacao: TipoTransacao;
  frequencia: string;
  data_inicio: string;
  data_fim: string;
  tipo_conta: string;
  conta_id: string;
  efetivada: boolean;
  forma_pagamento?: string;
  cliente_id?: string;
  categoria?: string;
  numero_parcelas?: string;
  parcelamento_tipo?: "total" | "parcela";
  tipo: "expense" | "investment";
}

const receitaSchema = z.object({
  descricao: z.string().trim().min(3, "Descrição muito curta (mín. 3 caracteres)").max(200),
  valor: z.number({ invalid_type_error: "Valor inválido" }).positive("Valor deve ser superior a zero"),
  data: z.string().min(1, "Data é obrigatória"),
  forma_pagamento: z.string().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  conta_id: z.string().min(1, "Selecione uma conta para vincular a transação"),
});

const despesaSchema = z.object({
  descricao: z.string().trim().min(3, "Descrição muito curta (mín. 3 caracteres)").max(200),
  valor: z.number({ invalid_type_error: "Valor inválido" }).positive("Valor deve ser superior a zero"),
  data: z.string().min(1, "Data é obrigatória"),
  categoria: z.string().min(1, "Selecione uma categoria"),
  conta_id: z.string().min(1, "Selecione uma conta para vincular a transação"),
});

const emptyForm: FormData = {
  descricao: "",
  valor: "",
  data: getLocalDateString(),
  tipo_transacao: "unica",
  frequencia: "",
  data_inicio: getLocalDateString(),
  data_fim: "",
  tipo_conta: "mei",
  conta_id: "",
  efetivada: false,
  forma_pagamento: "",
  cliente_id: "",
  categoria: "",
  numero_parcelas: "",
  parcelamento_tipo: "total",
  tipo: "expense",
};

// --- Reusable sub-components ---

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

function recurrenceLabel(tipo: TipoTransacao, frequencia: string, numero_parcelas?: string): string {
  if (tipo === "recorrente" && frequencia) return frequenciaLabels[frequencia as Frequencia] || "Recorrente";
  if (tipo === "parcelada" && numero_parcelas) return `Parcelada (${numero_parcelas}x)`;
  if (tipo === "recorrente") return "Recorrente";
  if (tipo === "parcelada") return "Parcelada";
  return "Não recorrente";
}

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Determine type from URL path
  const pathname = window.location.pathname;
  const type: FormType = pathname.includes("despesa") ? "despesa" : "receita";
  const isEditing = !!id;

  const [form, setForm] = useState<FormData>(() => {
    const clienteParam = searchParams.get("cliente") || "";
    const descParam = searchParams.get("descricao") || "";
    const valorParam = searchParams.get("valor") || "";
    const catParam = searchParams.get("categoria") || "";
    const contaParam = searchParams.get("tipo_conta") || "mei";
    const tipoParam = (searchParams.get("tipo") as "expense" | "investment") || "expense";
    
    return {
      ...emptyForm,
      cliente_id: clienteParam,
      descricao: descParam,
      valor: valorParam,
      categoria: catParam,
      tipo_conta: contaParam,
      tipo: tipoParam,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const { categories: dbCategories } = useCategories(type);
  const customCategories = useMemo(() => dbCategories.map(toCategoryMeta), [dbCategories]);

  const { accounts, isLoading: loadingAccounts } = useAccounts();

  // Subscription guard
  const { canAddTransaction, isLoading: subLoading } = useSubscription();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Auto-select account if only one exists
  useEffect(() => {
    if (!isEditing && accounts.length === 1 && !form.conta_id) {
      setForm(prev => ({ 
        ...prev, 
        conta_id: accounts[0].id,
        tipo_conta: accounts[0].classificacao // Keep legacy field in sync
      }));
    }
  }, [accounts, isEditing, form.conta_id]);

  // Fetch clientes for receita
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user && type === "receita",
  });

  // Load existing record for editing
  const { data: existing } = useQuery({
    queryKey: ["transactions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("id", id!).single();
      if (error) throw error;
      
      // Mapear para formato esperado pelo form
      return {
        ...data,
        valor: data.amount,
        descricao: data.description,
        data: data.date,
        status: data.type === "income" 
          ? (data.status === "confirmed" ? "recebido" : "pendente")
          : (data.status === "confirmed" ? "pago" : "pendente"),
      };
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (existing && id) {
      const rec = existing as any;
      setForm({
        descricao: rec.descricao,
        valor: String(rec.valor),
        data: rec.data,
        tipo_transacao: rec.tipo_transacao || "unica",
        frequencia: rec.frequencia ?? "",
        data_inicio: rec.data_inicio ?? "",
        data_fim: rec.data_fim ?? "",
        tipo_conta: rec.tipo_conta ?? "mei",
        efetivada: type === "receita" ? rec.status === "recebido" : rec.status === "pago",
        forma_pagamento: rec.forma_pagamento ?? "",
        cliente_id: rec.cliente_id ?? "",
        categoria: rec.categoria ?? rec.category ?? "",
        numero_parcelas: rec.numero_parcelas ? String(rec.numero_parcelas) : "",
        tipo: rec.tipo ?? "expense",
      });
    }
  }, [existing, id, type]);

  const update = (partial: Partial<FormData>) => setForm((prev) => ({ ...prev, ...partial }));

  const handleDescriptionChange = (desc: string) => {
    if (type === "despesa") {
      const updates: Partial<FormData> = { descricao: desc };
      if (!isEditing || !form.categoria) {
        const suggested = suggestCategory(desc);
        if (suggested) updates.categoria = suggested;
      }
      
      // Auto-set type to investment if description matches
      if (IS_INVESTMENT_REGEX.test(desc)) {
        updates.tipo = "investment";
      } else if (!isEditing) {
        // Only revert to expense if we are NOT editing an existing investment
        // or if it was previously auto-detected and now changed
        updates.tipo = "expense";
      }
      
      update(updates);
    } else {
      update({ descricao: desc });
    }
  };

  // Removido: updateAccountBalance (agora gerenciado via Ledger no Banco de Dados)

  const suggestedCat = type === "despesa" ? suggestCategory(form.descricao) : null;

  const backPath = type === "receita" ? "/receitas" : "/despesas";

  const upsert = useMutation({
    mutationFn: async () => {
      try {
        const schema = type === "receita" ? receitaSchema : despesaSchema;
        
        let sanitizedValor = form.valor.trim();
        if (sanitizedValor.includes(".") && sanitizedValor.includes(",")) {
          sanitizedValor = sanitizedValor.replace(/\./g, "").replace(",", ".");
        } else if (sanitizedValor.includes(",")) {
          sanitizedValor = sanitizedValor.replace(",", ".");
        }
        
        const parsed = schema.safeParse({ ...form, valor: parseFloat(sanitizedValor) });
        if (!parsed.success) {
          const fe: Record<string, string> = {};
          parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
          setErrors(fe);
          throw new Error("validation");
        }
        setErrors({});

        const amount = (parsed.data as any).valor;
        const status = form.efetivada ? "confirmed" : "pending";
        const commonPayload = {
          user_id: user!.id,
          description: (parsed.data as any).descricao,
          amount,
          date: (parsed.data as any).data,
          status,
          type: type === "receita" ? "income" : "expense",
          account_id: form.conta_id || null,
          category: form.categoria || null,
          tipo_conta: form.tipo_conta || "pessoal",
          tipo_transacao: form.tipo_transacao,
          forma_pagamento: form.forma_pagamento || null,
          cliente_id: form.cliente_id || null,
          tipo_despesa: form.tipo, // 'expense' ou 'investment'
        };

        if (form.tipo_transacao === "recorrente" && !isEditing) {
          const { error } = await supabase.from("transactions").insert({
            ...commonPayload,
            frequencia: form.frequencia,
            data_inicio: form.data_inicio || (parsed.data as any).data,
            data_fim: form.data_fim || null,
          } as any);
          if (error) throw error;
          return;
        }

        if (form.tipo_transacao === "parcelada" && type === "despesa" && !isEditing) {
          const numParcelas = parseInt(form.numero_parcelas || "1") || 1;
          const valorBase = form.parcelamento_tipo === "parcela" 
            ? amount * numParcelas 
            : amount;
          
          const installments = generateInstallments(valorBase, numParcelas, (parsed.data as any).data);
          
          const { data: parent, error: parentErr } = await supabase.from("transactions").insert({
            ...commonPayload,
            amount: installments[0].valor,
            date: installments[0].data,
            numero_parcelas: numParcelas,
            parcela_atual: 1,
          } as any).select("id").single();
          if (parentErr) throw parentErr;

          if (installments.length > 1) {
            const children = installments.slice(1).map((inst) => ({
              ...commonPayload,
              amount: inst.valor,
              date: inst.data,
              numero_parcelas: numParcelas,
              parcela_atual: inst.parcela,
              transacao_pai_id: parent.id,
              status: "pending", // parcelas futuras sempre pendentes
            } as any));
            const { error } = await supabase.from("transactions").insert(children);
            if (error) throw error;
          }
          return;
        }

        if (isEditing) {
          console.log(`[Mutation] Updating existing transaction ${id}`);
          const { error } = await supabase.from("transactions").update(commonPayload).eq("id", id!);
          if (error) throw error;
        } else {
          console.log("[Mutation] Inserting NEW transaction");
          const { error } = await supabase.from("transactions").insert(commonPayload);
          if (error) throw error;
        }
      } catch (err) {
        setIsSubmittingManual(false);
        throw err;
      }
    },
    onSuccess: async () => {
      const userId = user?.id;
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.receitas(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.despesas(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.accounts(userId) }),
        qc.invalidateQueries({ queryKey: queryKeys.transactions(userId) }),
      ]);
      await qc.refetchQueries({ queryKey: queryKeys.accounts(userId) });
      await qc.refetchQueries({ queryKey: queryKeys.transactions(userId) });

      toast.success(isEditing
        ? `${type === "receita" ? "Receita" : "Despesa"} atualizada!`
        : `${type === "receita" ? "Receita" : "Despesa"} cadastrada!`
      );
      navigate(backPath);
    },
    onError: (e: any) => {
      setIsSubmittingManual(false);
      if (e.message !== "validation") {
        toast.error(`Erro ao salvar ${type}.`, {
          description: e.message || "Erro desconhecido"
        });
      }
    },
  });

  const accentColor = type === "receita"
    ? "text-primary"
    : "text-destructive";
  const accentBg = type === "receita"
    ? "bg-primary hover:bg-primary/90"
    : "bg-destructive hover:bg-destructive/90";
  const title = isEditing
    ? type === "receita" ? "Editar Receita" : (form.tipo === "investment" ? "Editar Investimento" : "Editar Despesa")
    : type === "receita" ? "Nova Receita" : (form.tipo === "investment" ? "Novo Investimento" : "Nova Despesa");

  const allCategories = customCategories.length > 0
    ? customCategories
    : type === "despesa" ? expenseCategories : revenueCategories;

  return (
    <div className="min-h-[100dvh] bg-background">
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        reason="transaction"
      />
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button type="button" onClick={() => navigate(backPath)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button
          size="sm"
          onClick={() => {
            if (!isEditing && !canAddTransaction) {
              setUpgradeModalOpen(true);
              return;
            }
            upsert.mutate();
          }}
          disabled={upsert.isPending || isSubmittingManual || subLoading}
          className={`${accentBg} text-white px-5 rounded-full text-sm`}
        >
          {upsert.isPending || isSubmittingManual ? "..." : "Salvar"}
        </Button>
      </div>

      {/* Form body — native scroll */}
      <div className="max-w-lg mx-auto">
        {/* Descrição */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <AlignLeft className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Input
              value={form.descricao}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={type === "receita" ? "Descrição da receita" : "Ex: Uber, Netflix, iFood..."}
              className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0 bg-transparent"
              maxLength={200}
              autoFocus
            />
            {errors.descricao && <p className="text-xs text-destructive mt-1">{errors.descricao}</p>}
          </div>
        </div>
        <Separator />

        {/* Valor */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <DollarSign className={`h-5 w-5 shrink-0 ${accentColor}`} />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">
              {form.tipo_transacao === "parcelada" 
                ? (form.parcelamento_tipo === "total" ? "Valor Total (R$)" : "Valor por Parcela (R$)") 
                : "Valor (R$)"
              }
            </p>
            <Input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => update({ valor: e.target.value })}
              placeholder="0,00"
              className="border-0 p-0 h-auto text-lg font-bold shadow-none focus-visible:ring-0 bg-transparent"
            />
            {errors.valor && <p className="text-xs text-destructive mt-1">{errors.valor}</p>}
          </div>
        </div>
        <Separator />

        {/* Recorrência */}
        {!isEditing && (
          <>
            <FormRow
              icon={RefreshCw}
              label={recurrenceLabel(form.tipo_transacao, form.frequencia, form.numero_parcelas)}
              sublabel={form.tipo_transacao === "unica" ? "Transação avulsa" : undefined}
              onClick={() => setRecurrenceOpen(!recurrenceOpen)}
              expandable
              expanded={recurrenceOpen}
            />
            <AnimatePresence>
              {recurrenceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-3 bg-muted/30">
                    <div className={`grid ${type === "despesa" ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-2`}>
                      {([
                        { value: "unica" as const, label: "Única" },
                        { value: "recorrente" as const, label: "Recorrente" },
                        ...(type === "despesa" ? [{ value: "parcelada" as const, label: "Parcelada" }] : []),
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ tipo_transacao: opt.value as TipoTransacao })}
                          className={`rounded-lg border-2 py-2 px-3 text-xs font-medium text-center transition-all ${
                            form.tipo_transacao === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-muted-foreground/30"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.tipo_transacao === "recorrente" && (
                      <div className="space-y-2">
                        <Select value={form.frequencia} onValueChange={(v) => update({ frequencia: v })}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Frequência" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quinzenal">Quinzenal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Início</p>
                            <Input type="date" value={form.data_inicio} onChange={(e) => update({ data_inicio: e.target.value })} className="h-9 text-xs" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Fim (opcional)</p>
                            <Input type="date" value={form.data_fim} onChange={(e) => update({ data_fim: e.target.value })} className="h-9 text-xs" />
                          </div>
                        </div>
                      </div>
                    )}
                    {form.tipo_transacao === "parcelada" && type === "despesa" && (
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Como deseja informar o valor?</p>
                          <div className="grid grid-cols-2 gap-2">
                             <button
                                type="button"
                                onClick={() => update({ parcelamento_tipo: "total" })}
                                className={`rounded-lg border py-2 px-2 text-[10px] font-medium text-center transition-all ${
                                  form.parcelamento_tipo === "total"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted/50"
                                }`}
                             >
                               Valor Total
                             </button>
                             <button
                                type="button"
                                onClick={() => update({ parcelamento_tipo: "parcela" })}
                                className={`rounded-lg border py-2 px-2 text-[10px] font-medium text-center transition-all ${
                                  form.parcelamento_tipo === "parcela"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted/50"
                                }`}
                             >
                               Valor da Parcela
                             </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Número de Parcelas</p>
                          <Input type="number" min="2" max="72" value={form.numero_parcelas || ""} onChange={(e) => update({ numero_parcelas: e.target.value })} placeholder="Ex: 12" className="h-9 text-xs" />
                        </div>
                        {form.valor && form.numero_parcelas && parseInt(form.numero_parcelas) > 1 && (
                          <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                            {form.parcelamento_tipo === "total" ? (
                              <p className="text-[11px] text-muted-foreground font-medium">
                                → Serão geradas <span className="text-foreground">{form.numero_parcelas}x</span> de <span className="text-foreground font-bold">R$ {(parseFloat(form.valor) / parseInt(form.numero_parcelas)).toFixed(2)}</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground font-medium">
                                → Total da compra: <span className="text-foreground font-bold">R$ {(parseFloat(form.valor) * parseInt(form.numero_parcelas)).toFixed(2)}</span> em {form.numero_parcelas} parcelas.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Separator />
          </>
        )}

        {/* Data */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">
              {form.tipo_transacao === "parcelada" ? "Data da 1ª Parcela" : "Data de Vencimento"}
            </p>
            <Input type="date" value={form.data} onChange={(e) => update({ data: e.target.value })} className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0 bg-transparent" />
            {errors.data && <p className="text-xs text-destructive mt-1">{errors.data}</p>}
          </div>
        </div>
        <Separator />

        {/* Efetivada */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <CheckCircle2 className={`h-5 w-5 shrink-0 ${form.efetivada ? accentColor : "text-muted-foreground"}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">Situação do Pagamento</p>
            <p className="text-xs font-semibold">
              {type === "receita" ? (form.efetivada ? <span className="text-primary">Pago (Recebido)</span> : <span className="text-amber-600 dark:text-amber-400">Pendente</span>) : (form.efetivada ? <span className="text-primary">Pago</span> : <span className="text-amber-600 dark:text-amber-400">Pendente</span>)}
            </p>
          </div>
          <Switch checked={form.efetivada} onCheckedChange={(v) => update({ efetivada: v })} />
        </div>
        <Separator />

        {/* Cliente (receita only) */}
        {type === "receita" && (
          <>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
                <Select value={form.cliente_id || ""} onValueChange={(v) => update({ cliente_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="border-0 p-0 h-auto shadow-none focus:ring-0 text-sm font-medium bg-transparent">
                    <SelectValue placeholder="Selecionar cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Forma de Pagamento (receita only) */}
        {type === "receita" && (
          <>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Forma de Pagamento</p>
                <Select value={form.forma_pagamento || ""} onValueChange={(v) => update({ forma_pagamento: v })}>
                  <SelectTrigger className="border-0 p-0 h-auto shadow-none focus:ring-0 text-sm font-medium bg-transparent">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
          </>
        )}

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
                  onSelect={(name) => update({ categoria: name })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {errors.categoria && <p className="text-xs text-destructive px-4 mt-1">{errors.categoria}</p>}
        <Separator />

        {/* Conta Financeira */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Conta / Origem</p>
            <Select 
              value={form.conta_id} 
              onValueChange={(v) => {
                const acc = accounts.find(a => a.id === v);
                update({ conta_id: v, tipo_conta: acc?.classificacao || "pessoal" });
              }}
            >
              <SelectTrigger className="border-0 p-0 h-auto shadow-none focus:ring-0 text-sm font-medium bg-transparent">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.nome} {acc.classificacao === "mei" ? "(MEI)" : "(Pessoal)"}
                  </SelectItem>
                ))}
                {accounts.length === 0 && (
                  <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        {errors.conta_id && <p className="text-xs text-destructive px-4 mt-1">{errors.conta_id}</p>}

        <div className="pb-8" />
      </div>
    </div>
  );
}
