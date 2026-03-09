import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories, toCategoryMeta } from "@/hooks/useCategories";
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
import { suggestCategory } from "@/lib/mockData";
import { toast } from "sonner";
import { z } from "zod";
import type { TipoTransacao, Frequencia, ReceitaExtended, DespesaExtended } from "@/types/transactions";
import { frequenciaLabels, generateInstallments } from "@/types/transactions";

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
  efetivada: boolean;
  forma_pagamento?: string;
  cliente_id?: string;
  categoria?: string;
  numero_parcelas?: string;
}

const receitaSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(200),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data obrigatória"),
  forma_pagamento: z.string().optional(),
  cliente_id: z.string().optional(),
});

const despesaSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(200),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data obrigatória"),
  categoria: z.string().optional(),
});

const emptyForm: FormData = {
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  tipo_transacao: "unica",
  frequencia: "",
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: "",
  tipo_conta: "mei",
  efetivada: false,
  forma_pagamento: "",
  cliente_id: "",
  categoria: "",
  numero_parcelas: "",
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
    return { ...emptyForm, cliente_id: clienteParam };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const { categories: dbCategories } = useCategories(type);
  const customCategories = useMemo(() => dbCategories.map(toCategoryMeta), [dbCategories]);

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
  const table = type === "receita" ? "receitas" : "despesas";
  const { data: existing } = useQuery({
    queryKey: [table, id],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
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
        categoria: rec.categoria ?? "",
        numero_parcelas: rec.numero_parcelas ? String(rec.numero_parcelas) : "",
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
      setForm((prev) => ({ ...prev, ...updates }));
    } else {
      update({ descricao: desc });
    }
  };

  const suggestedCat = type === "despesa" ? suggestCategory(form.descricao) : null;

  const backPath = type === "receita" ? "/receitas" : "/despesas";

  const upsert = useMutation({
    mutationFn: async () => {
      const schema = type === "receita" ? receitaSchema : despesaSchema;
      const parsed = schema.safeParse({ ...form, valor: parseFloat(form.valor) });
      if (!parsed.success) {
        const fe: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
        setErrors(fe);
        throw new Error("validation");
      }
      setErrors({});

      const tipoTransacao = form.tipo_transacao;

      if (type === "receita") {
        const status = form.efetivada ? "recebido" : "pendente";
        if (tipoTransacao === "recorrente" && !isEditing) {
          const freq = form.frequencia as Frequencia;
          const { error } = await supabase.from("receitas").insert({
            descricao: (parsed.data as any).descricao,
            valor: (parsed.data as any).valor,
            data: form.data_inicio || (parsed.data as any).data,
            forma_pagamento: (parsed.data as any).forma_pagamento || null,
            cliente_id: (parsed.data as any).cliente_id || null,
            categoria: form.categoria || null,
            tipo_conta: form.tipo_conta || "mei",
            user_id: user!.id,
            tipo_transacao: "recorrente",
            frequencia: freq,
            data_inicio: form.data_inicio || (parsed.data as any).data,
            data_fim: form.data_fim || null,
            status,
          } as any);
          if (error) throw error;
          return;
        }
        const payload: any = {
          descricao: (parsed.data as any).descricao,
          valor: (parsed.data as any).valor,
          data: (parsed.data as any).data,
          forma_pagamento: (parsed.data as any).forma_pagamento || null,
          cliente_id: (parsed.data as any).cliente_id || null,
          categoria: form.categoria || null,
          tipo_conta: form.tipo_conta || "mei",
          user_id: user!.id,
          tipo_transacao: tipoTransacao,
          status,
        };
        if (isEditing) {
          const { error } = await supabase.from("receitas").update(payload).eq("id", id!);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("receitas").insert(payload);
          if (error) throw error;
        }
      } else {
        // Despesa
        const status = form.efetivada ? "pago" : "pendente";
        if (tipoTransacao === "parcelada" && !isEditing) {
          const numParcelas = parseInt(form.numero_parcelas || "1") || 1;
          const installments = generateInstallments((parsed.data as any).valor, numParcelas, (parsed.data as any).data);
          const { data: parent, error: parentErr } = await supabase.from("despesas").insert({
            descricao: (parsed.data as any).descricao,
            valor: installments[0].valor,
            data: installments[0].data,
            categoria: (parsed.data as any).categoria || null,
            tipo_conta: form.tipo_conta || "mei",
            user_id: user!.id,
            tipo_transacao: "parcelada",
            numero_parcelas: numParcelas,
            parcela_atual: 1,
            status: "pendente",
          } as any).select("id").single();
          if (parentErr) throw parentErr;
          if (installments.length > 1) {
            const children = installments.slice(1).map((inst) => ({
              descricao: (parsed.data as any).descricao,
              valor: inst.valor,
              data: inst.data,
              categoria: (parsed.data as any).categoria || null,
              tipo_conta: form.tipo_conta || "mei",
              user_id: user!.id,
              tipo_transacao: "parcelada",
              numero_parcelas: numParcelas,
              parcela_atual: inst.parcela,
              transacao_pai_id: parent.id,
              status: "pendente",
            } as any));
            const { error } = await supabase.from("despesas").insert(children);
            if (error) throw error;
          }
          return;
        }
        if (tipoTransacao === "recorrente" && !isEditing) {
          const freq = form.frequencia as Frequencia;
          const { error } = await supabase.from("despesas").insert({
            descricao: (parsed.data as any).descricao,
            valor: (parsed.data as any).valor,
            data: form.data_inicio || (parsed.data as any).data,
            categoria: (parsed.data as any).categoria || null,
            tipo_conta: form.tipo_conta || "mei",
            user_id: user!.id,
            tipo_transacao: "recorrente",
            frequencia: freq,
            data_inicio: form.data_inicio || (parsed.data as any).data,
            data_fim: form.data_fim || null,
            status,
          } as any);
          if (error) throw error;
          return;
        }
        const payload: any = {
          descricao: (parsed.data as any).descricao,
          valor: (parsed.data as any).valor,
          data: (parsed.data as any).data,
          categoria: (parsed.data as any).categoria || null,
          tipo_conta: form.tipo_conta || "mei",
          user_id: user!.id,
          tipo_transacao: tipoTransacao,
          status,
        };
        if (isEditing) {
          const { error } = await supabase.from("despesas").update(payload).eq("id", id!);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("despesas").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      if (type === "receita") qc.invalidateQueries({ queryKey: ["receitas"] });
      else qc.invalidateQueries({ queryKey: ["despesas"] });
      toast.success(isEditing
        ? `${type === "receita" ? "Receita" : "Despesa"} atualizada!`
        : `${type === "receita" ? "Receita" : "Despesa"} cadastrada!`
      );
      navigate(backPath);
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error(`Erro ao salvar ${type}.`);
    },
  });

  const accentColor = type === "receita"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  const accentBg = type === "receita"
    ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
    : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";
  const title = isEditing
    ? type === "receita" ? "Editar Receita" : "Editar Despesa"
    : type === "receita" ? "Nova Receita" : "Nova Despesa";

  const allCategories = customCategories.length > 0
    ? customCategories
    : type === "despesa" ? expenseCategories : revenueCategories;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button type="button" onClick={() => navigate(backPath)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button
          size="sm"
          onClick={() => upsert.mutate()}
          disabled={upsert.isPending}
          className={`${accentBg} text-white px-5 rounded-full text-sm`}
        >
          {upsert.isPending ? "..." : "Salvar"}
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
              {form.tipo_transacao === "parcelada" ? "Valor Total (R$)" : "Valor (R$)"}
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
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Número de Parcelas</p>
                          <Input type="number" min="2" max="72" value={form.numero_parcelas || ""} onChange={(e) => update({ numero_parcelas: e.target.value })} placeholder="Ex: 12" className="h-9 text-xs" />
                        </div>
                        {form.valor && form.numero_parcelas && parseInt(form.numero_parcelas) > 1 && (
                          <p className="text-xs text-muted-foreground">
                            → {form.numero_parcelas}x de R$ {(parseFloat(form.valor) / parseInt(form.numero_parcelas)).toFixed(2)}
                          </p>
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
            <p className="text-sm font-medium">Efetivada</p>
            <p className="text-xs text-muted-foreground">
              {type === "receita" ? (form.efetivada ? "Recebido" : "Pendente") : (form.efetivada ? "Pago" : "Pendente")}
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
        <Separator />

        {/* Tipo de Conta */}
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Tipo de Conta</p>
            <Select value={form.tipo_conta} onValueChange={(v) => update({ tipo_conta: v })}>
              <SelectTrigger className="border-0 p-0 h-auto shadow-none focus:ring-0 text-sm font-medium bg-transparent">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mei">MEI</SelectItem>
                <SelectItem value="pessoal">Pessoal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
