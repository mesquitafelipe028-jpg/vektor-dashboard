import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, CreditCard, Receipt, Pencil, Trash2, Upload, FileText,
  RefreshCw, TrendingDown, AlertTriangle, Sparkles, FileDown, CheckCircle,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency, getLocalDateString, expenseCategories } from "@/lib/utils";
import { InvoiceTimeline } from "@/components/credit-cards/InvoiceTimeline";
import { getBankById } from "@/lib/banks";
import { parsePDF, parseImage, type ImportedTransaction } from "@/lib/statement-parser";
import { Checkbox } from "@/components/ui/checkbox";

type Cartao = Tables<"cartoes_credito">;
type Compra = Tables<"compras_cartao">;
type Fatura = Tables<"faturas_cartao">;

type CompraForm = {
  descricao: string;
  valor: string;
  data: string;
  categoria: string;
  parcelas: string;
};

const emptyCompraForm: CompraForm = {
  descricao: "",
  valor: "",
  data: getLocalDateString(),
  categoria: "",
  parcelas: "1",
};

function formatMonthLabel(mesRef: string) {
  if (!mesRef || !mesRef.includes("-")) return "Mês";
  const [y, m] = mesRef.split("-").map(Number);
  const d = new Date(y, m - 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getPurchaseInvoicePeriod(purchaseDate: string, diaFechamento: number) {
  if (!purchaseDate) return "0000-00";
  const d = new Date(purchaseDate + "T12:00:00");
  const day = d.getDate();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (day >= diaFechamento) {
    const next = new Date(y, m + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

interface CreditCardSheetProps {
  cartao: Cartao | null;
  contaId?: string; // id da contas_financeiras vinculada
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreditCardSheet({ cartao, contaId, open, onOpenChange }: CreditCardSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { accounts } = useAccounts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [compraForm, setCompraForm] = useState<CompraForm>(emptyCompraForm);
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);
  const [payingMesRef, setPayingMesRef] = useState<string | null>(null);
  const [payAccountId, setPayAccountId] = useState(contaId ?? "");
  // Import PDF
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const bank = getBankById(cartao?.banco ?? null);

  // ── Queries ──
  const { data: compras = [] } = useQuery({
    queryKey: ["compras_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_cartao")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Compra[];
    },
    enabled: !!user && open,
  });

  const { data: faturas = [] } = useQuery({
    queryKey: ["faturas_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas_cartao")
        .select("*")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fatura[];
    },
    enabled: !!user && open,
  });

  // Filtra para o cartão ativo
  const cardCompras = useMemo(
    () => (cartao ? compras.filter((c) => c.cartao_id === cartao.id) : []),
    [compras, cartao]
  );
  const cardFaturas = useMemo(
    () => (cartao ? faturas.filter((f) => f.cartao_id === cartao.id) : []),
    [faturas, cartao]
  );

  // Limite usado e fatura do período atual
  const { limiteUsado, limiteDisponivel, faturaAtualValor } = useMemo(() => {
    if (!cartao) return { limiteUsado: 0, limiteDisponivel: 0, faturaAtualValor: 0 };
    const faturasPagas = new Set(
      cardFaturas.filter((f) => f.status === "paga").map((f) => f.mes_referencia)
    );
    // Período atual do cartão
    const now = new Date();
    const d = now.getDate();
    const y = now.getFullYear();
    const m = now.getMonth();
    const currentPeriod = d >= (cartao.dia_fechamento || 1)
      ? (() => { const n = new Date(y, m + 1, 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; })()
      : `${y}-${String(m + 1).padStart(2, "0")}`;

    let total = 0;
    let faturaAtualValor = 0;
    for (const c of cardCompras) {
      const mes = getPurchaseInvoicePeriod(c.data, cartao.dia_fechamento || 1);
      if (!faturasPagas.has(mes)) total += c.valor;
      if (mes === currentPeriod) faturaAtualValor += c.valor;
    }
    return {
      limiteUsado: total,
      limiteDisponivel: Math.max(0, (cartao.limite_total || 0) - total),
      faturaAtualValor,
    };
  }, [cartao, cardCompras, cardFaturas]);

  const usagePercent =
    cartao?.limite_total && cartao.limite_total > 0
      ? (limiteUsado / cartao.limite_total) * 100
      : 0;

  // ── Mutation: salvar compra ──
  const saveCompra = useMutation({
    mutationFn: async () => {
      if (!cartao) throw new Error("Cartão não encontrado");
      const valor = parseFloat(compraForm.valor);
      const parcelas = parseInt(compraForm.parcelas) || 1;
      if (!valor || valor <= 0) throw new Error("Valor inválido");
      if (!compraForm.descricao.trim()) throw new Error("Descrição obrigatória");

      if (editingCompraId) {
        const { error } = await supabase
          .from("compras_cartao")
          .update({
            descricao: compraForm.descricao.trim(),
            valor,
            data: compraForm.data,
            categoria: compraForm.categoria || null,
            cartao_id: cartao.id,
          })
          .eq("id", editingCompraId);
        if (error) throw error;
        return;
      }

      const valorParcela = valor / parcelas;
      const inserts: any[] = [];
      let cur = new Date(compraForm.data + "T12:00:00");
      for (let i = 1; i <= parcelas; i++) {
        inserts.push({
          descricao:
            parcelas > 1
              ? `${compraForm.descricao.trim()} (${i}/${parcelas})`
              : compraForm.descricao.trim(),
          valor: valorParcela,
          data: cur.toISOString().slice(0, 10),
          categoria: compraForm.categoria || null,
          cartao_id: cartao.id,
          user_id: user!.id,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      const { error } = await supabase.from("compras_cartao").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      toast.success(editingCompraId ? "Compra atualizada!" : "Compra registrada!");
      setCompraForm(emptyCompraForm);
      setEditingCompraId(null);
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar compra"),
  });

  // ── Mutation: excluir compra ──
  const deleteCompra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compras_cartao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      toast.success("Compra excluída!");
    },
    onError: () => toast.error("Erro ao excluir compra"),
  });

  // ── Mutation: pagar fatura ──
  const payInvoice = useMutation({
    mutationFn: async ({ mesRef, total }: { mesRef: string; total: number }) => {
      if (!cartao) throw new Error("Cartão não encontrado");
      if (!payAccountId) throw new Error("Selecione a conta de débito");

      const existing = cardFaturas.find((f) => f.mes_referencia === mesRef);
      if (existing) {
        const { error } = await supabase
          .from("faturas_cartao")
          .update({ status: "paga", valor_total: total, data_pagamento: getLocalDateString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faturas_cartao").insert({
          cartao_id: cartao.id,
          mes_referencia: mesRef,
          valor_total: total,
          status: "paga",
          data_pagamento: getLocalDateString(),
          user_id: user!.id,
        } as any);
        if (error) throw error;
      }

      const { error: txError } = await supabase.from("transactions").insert({
        description: `Fatura ${cartao.nome} - ${formatMonthLabel(mesRef)}`,
        amount: total,
        date: getLocalDateString(),
        category: "Cartão de Crédito",
        type: "expense",
        status: "confirmed",
        account_id: payAccountId,
        user_id: user!.id,
      } as any);
      if (txError) throw txError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturas_cartao", user?.id] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      toast.success("Fatura paga e despesa registrada!");
      setPayingMesRef(null);
    },
    onError: (e: any) => toast.error("Erro ao pagar fatura: " + e.message),
  });

  // ── Importar PDF/Imagem ──
  const handleFileUpload = async (file: File) => {
    if (!cartao) return;
    setIsParsing(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let transactions: ImportedTransaction[] = [];
      if (ext === "pdf") {
        const res = await parsePDF(file);
        transactions = res.transactions;
      } else if (["png", "jpg", "jpeg"].includes(ext ?? "")) {
        toast.info("Lendo a imagem... (pode demorar alguns segundos).");
        const res = await parseImage(file);
        transactions = res.transactions;
      } else {
        toast.error("Formato não suportado.");
        setIsParsing(false);
        return;
      }
      if (transactions.length === 0) {
        toast.error("Nenhuma transação identificada.");
      } else {
        // Detectar duplicatas
        const dates = transactions.map(t => new Date(t.data).getTime()).filter(t => !isNaN(t));
        if (dates.length > 0 && user?.id) {
          const minDate = new Date(Math.min(...dates));
          minDate.setDate(minDate.getDate() - 3);
          const maxDate = new Date(Math.max(...dates));
          maxDate.setDate(maxDate.getDate() + 3);
          const { data: existing } = await supabase
            .from("compras_cartao")
            .select("descricao, valor, data")
            .eq("cartao_id", cartao.id)
            .gte("data", minDate.toISOString().split("T")[0])
            .lte("data", maxDate.toISOString().split("T")[0]);
          if (existing && existing.length > 0) {
            transactions = transactions.map(t => {
              const dup = existing.some(e =>
                Math.abs(Number((e as any).valor ?? 0) - t.valor) < 0.01 &&
                Math.abs(new Date((e as any).data).getTime() - new Date(t.data).getTime()) <= 86400000 * 3
              );
              return { ...t, isDuplicate: dup, selected: !dup };
            });
          }
        }
        setImportedTransactions(transactions);
        toast.success(`${transactions.length} transações identificadas!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!cartao || !user) return;
    const toImport = importedTransactions.filter(t => t.selected && t.tipo !== "receita");
    if (toImport.length === 0) return;
    try {
      const inserts: any[] = [];
      const nonInstallmentDates = toImport
        .filter(t => !t.numero_parcelas)
        .map(t => new Date(t.data).getTime())
        .filter(t => !isNaN(t));
      const anchorDate = nonInstallmentDates.length > 0
        ? new Date(Math.max(...nonInstallmentDates))
        : new Date();
      toImport.forEach(t => {
        if (t.parcela_atual && t.numero_parcelas && t.parcela_atual <= t.numero_parcelas) {
          let baseDate = new Date(t.data + "T12:00:00");
          baseDate.setFullYear(anchorDate.getFullYear());
          baseDate.setMonth(anchorDate.getMonth());
          for (let i = t.parcela_atual; i <= t.numero_parcelas; i++) {
            inserts.push({
              descricao: `${t.descricao} (${i}/${t.numero_parcelas})`,
              valor: t.valor,
              data: baseDate.toISOString().slice(0, 10),
              categoria: t.categoria || null,
              cartao_id: cartao.id,
              user_id: user.id,
            });
            baseDate.setMonth(baseDate.getMonth() + 1);
          }
        } else {
          inserts.push({
            descricao: t.parcela_atual && t.numero_parcelas
              ? `${t.descricao} (${t.parcela_atual}/${t.numero_parcelas})`
              : t.descricao,
            valor: t.valor,
            data: t.data,
            categoria: t.categoria || null,
            cartao_id: cartao.id,
            user_id: user.id,
          });
        }
      });
      const { error } = await supabase.from("compras_cartao").insert(inserts);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      toast.success(`${toImport.length} compras importadas!`);
      setImportDialogOpen(false);
      setImportedTransactions([]);
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    }
  };

  const handleEditCompra = (c: Compra) => {
    setEditingCompraId(c.id);
    setCompraForm({
      descricao: c.descricao,
      valor: String(c.valor),
      data: c.data,
      categoria: c.categoria ?? "",
      parcelas: "1",
    });
    setShowAddForm(true);
  };

  if (!cartao) return null;

  const isDanger = usagePercent >= 85;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`${isMobile ? "h-[92dvh] rounded-t-2xl" : "w-full max-w-xl"} p-0 overflow-hidden flex flex-col`}
      >
        {/* ── Header com gradiente do banco ── */}
        <div
          className="relative px-6 pt-6 pb-5 shrink-0"
          style={{
            background: bank
              ? `linear-gradient(135deg, ${bank.color}cc 0%, ${bank.color}44 100%)`
              : "linear-gradient(135deg, #3B0066cc 0%, #0d001a44 100%)",
          }}
        >
          <SheetHeader className="mb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {bank ? (
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ backgroundColor: bank.color, color: bank.textColor }}
                  >
                    {bank.initials}
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-purple-500/30 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-purple-200" />
                  </div>
                )}
                <div>
                  <SheetTitle className="text-lg leading-tight">{cartao.nome}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}
                  </p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Barra de limite */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Valor atual da fatura:{" "}
                <span className={`font-bold ${isDanger ? "text-red-400" : "text-foreground"}`}>
                  {formatCurrency(faturaAtualValor)}
                </span>
              </span>
              <span>Limite: {formatCurrency(cartao.limite_total || 0)}</span>
            </div>
            <Progress
              value={Math.min(usagePercent, 100)}
              className={`h-2 ${isDanger ? "[&>div]:bg-red-500" : "[&>div]:bg-purple-500"}`}
            />
            <p className="text-xs text-muted-foreground text-right">
              Disponível:{" "}
              <span className={`font-semibold ${isDanger ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(limiteDisponivel)}
              </span>
            </p>
          </div>
        </div>

        {/* ── Ações rápidas ── */}
        <div className="flex gap-2 px-6 py-3 border-b shrink-0">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => {
              setEditingCompraId(null);
              setCompraForm(emptyCompraForm);
              setShowAddForm((v) => !v);
            }}
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? "Cancelar" : "Adicionar Compra"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setImportDialogOpen(true)}
            title="Importar PDF ou imagem da fatura"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Importar PDF</span>
          </Button>
        </div>

        {/* ── Formulário inline de adicionar compra ── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b"
            >
              <div className="px-6 py-4 space-y-3 bg-muted/30">
                <p className="text-sm font-semibold text-foreground">
                  {editingCompraId ? "Editar Compra" : "Nova Compra"}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      placeholder="Ex: Mercado Livre"
                      value={compraForm.descricao}
                      onChange={(e) =>
                        setCompraForm((f) => ({ ...f, descricao: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0,00"
                      value={compraForm.valor}
                      onChange={(e) =>
                        setCompraForm((f) => ({ ...f, valor: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={compraForm.data}
                      onChange={(e) =>
                        setCompraForm((f) => ({ ...f, data: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={compraForm.categoria}
                      onValueChange={(v) =>
                        setCompraForm((f) => ({ ...f, categoria: v }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!editingCompraId && (
                    <div className="space-y-1">
                      <Label className="text-xs">Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        max="48"
                        value={compraForm.parcelas}
                        onChange={(e) =>
                          setCompraForm((f) => ({ ...f, parcelas: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => saveCompra.mutate()}
                  disabled={saveCompra.isPending}
                >
                  {saveCompra.isPending
                    ? "Salvando..."
                    : editingCompraId
                    ? "Salvar alterações"
                    : "Registrar Compra"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Timeline de faturas (scroll interno) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cardCompras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">Nenhuma compra ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione uma compra para ver a timeline de faturas aparecer aqui.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(true);
                  setCompraForm(emptyCompraForm);
                  setEditingCompraId(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar primeira compra
              </Button>
            </div>
          ) : (
            <InvoiceTimeline
              cartao={cartao}
              compras={cardCompras}
              faturas={cardFaturas}
              isMobile={isMobile}
              onPayInvoice={(mesRef, total) => {
                setPayingMesRef(mesRef);
                if (contaId) setPayAccountId(contaId);
              }}
              onEditCompra={handleEditCompra}
              onDeleteCompra={(id) => deleteCompra.mutate(id)}
            />
          )}
        </div>

        {/* ── Dialog pagar fatura (com seleção de conta) ── */}
        <AlertDialog
          open={!!payingMesRef}
          onOpenChange={(v) => !v && setPayingMesRef(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Pagar fatura de {payingMesRef ? formatMonthLabel(payingMesRef) : ""}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Uma despesa será registrada no ledger vinculada à conta selecionada.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-2 space-y-2">
              <Label className="text-xs">Conta de débito</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a: any) => a.tipo !== "cartao")
                    .map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome} ({formatCurrency(a.saldo)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPayingMesRef(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!payAccountId || payInvoice.isPending}
                onClick={() => {
                  if (!payingMesRef) return;
                  const total = cardCompras
                    .filter((c) => {
                      const mes = getPurchaseInvoicePeriod(c.data, cartao.dia_fechamento || 1);
                      return mes === payingMesRef;
                    })
                    .reduce((a, c) => a + c.valor, 0);
                  payInvoice.mutate({ mesRef: payingMesRef, total });
                }}
              >
                {payInvoice.isPending ? "Processando..." : "Confirmar Pagamento"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* ── Dialog Importar PDF ── */}
        <AlertDialog
          open={importDialogOpen}
          onOpenChange={(v) => { if (!v) { setImportDialogOpen(false); setImportedTransactions([]); } }}
        >
          <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <AlertDialogHeader className="p-5 pb-3 border-b">
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Importar Fatura (PDF ou Imagem)
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="flex-1 overflow-y-auto p-5">
              {importedTransactions.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isParsing ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => document.getElementById("sheet-file-input")?.click()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className={`h-7 w-7 text-primary ${isParsing ? "animate-bounce" : ""}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-1">
                    {isParsing ? "Processando arquivo..." : "Arraste sua fatura aqui"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF ou imagem da fatura do cartão <strong>{cartao?.nome}</strong>
                  </p>
                  <Button variant="outline" size="sm" disabled={isParsing}>Selecionar Arquivo</Button>
                  <input
                    id="sheet-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {importedTransactions.length} transações encontradas
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setImportedTransactions([])} className="text-xs h-7">
                      <RefreshCw className="h-3 w-3 mr-1" /> Trocar arquivo
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {importedTransactions.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          t.selected ? "bg-card border-primary/20" : "bg-muted/30 opacity-60"
                        }`}
                      >
                        <Checkbox
                          checked={t.selected}
                          onCheckedChange={() =>
                            setImportedTransactions(prev =>
                              prev.map(item => item.id === t.id ? { ...item, selected: !item.selected } : item)
                            )
                          }
                        />
                        <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{t.descricao}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {t.isDuplicate && (
                                <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Duplicata?
                                </span>
                              )}
                              <span className="font-bold text-sm">{formatCurrency(t.valor)}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.data}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setImportedTransactions(prev => prev.filter(item => item.id !== t.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {importedTransactions.length > 0 && (
              <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total selecionado</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(importedTransactions.filter(t => t.selected).reduce((a, t) => a + t.valor, 0))}
                  </p>
                </div>
                <AlertDialogAction
                  onClick={handleBulkImport}
                  disabled={importedTransactions.filter(t => t.selected).length === 0}
                  className="gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Importar {importedTransactions.filter(t => t.selected).length} transações
                </AlertDialogAction>
              </div>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
