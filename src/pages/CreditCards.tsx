import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, HelpCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parsePDF, parseImage, type ImportedTransaction } from "@/lib/statement-parser";
import { Upload, FileText, CheckCircle, RefreshCw, Trash2, Sparkles, TrendingDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate, getLocalDateString } from "@/lib/utils";

// Icons and Utils
import { expenseCategories } from "@/lib/utils";
import { banks } from "@/lib/banks";
import { useAccounts } from "@/hooks/useAccounts";

// Types
import { Tables } from "@/integrations/supabase/types";

// Subcomponents
import { CardDashboardItem } from "@/components/credit-cards/CardDashboardItem";
import { InvoiceTimeline } from "@/components/credit-cards/InvoiceTimeline";
import { PurchaseSimulator } from "@/components/credit-cards/PurchaseSimulator";
import { PhysicalInvoice } from "@/components/credit-cards/PhysicalInvoice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown } from "lucide-react";

// Types mapping
type Cartao = Tables<"cartoes_credito">;
type Compra = Tables<"compras_cartao">;
type Fatura = Tables<"faturas_cartao">;

type CardForm = { nome: string; limite_total: string; dia_fechamento: string; dia_vencimento: string; tipo_conta: string; banco: string };
const emptyCardForm: CardForm = { nome: "", limite_total: "", dia_fechamento: "1", dia_vencimento: "10", tipo_conta: "pessoal", banco: "" };

type CompraForm = { descricao: string; valor: string; data: string; categoria: string; cartao_id: string; parcelas: string };
const emptyCompraForm: CompraForm = { descricao: "", valor: "", data: getLocalDateString(), categoria: "", cartao_id: "", parcelas: "1" };

// Helper format month label
function formatMonthLabel(mesRef: string) {
  const [y, m] = mesRef.split("-").map(Number);
  const d = new Date(y, m - 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Helper to determine invoice period of a purchase
function getPurchaseInvoicePeriod(purchaseDate: string, diaFechamento: number) {
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

export default function CreditCards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  // Dialog states
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);

  const [compraDialogOpen, setCompraDialogOpen] = useState(false);
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);
  const [compraForm, setCompraForm] = useState<CompraForm>(emptyCompraForm);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // PDF Import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "fatura">("timeline");
  const [selectedMesRef, setSelectedMesRef] = useState<string>(getLocalDateString().slice(0, 7));

  // Payment states
  const [payInvoiceDialogOpen, setPayInvoiceDialogOpen] = useState(false);
  const [paymentMesRef, setPaymentMesRef] = useState("");
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState("");

  const { accounts = [] } = useAccounts();

  // ── Queries ──
  const { data: cartoes = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cartoes_credito", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartoes_credito").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Cartao[];
    },
    enabled: !!user,
  });

  const { data: compras = [], isLoading: loadingCompras } = useQuery({
    queryKey: ["compras_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("compras_cartao").select("*").order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Compra[];
    },
    enabled: !!user,
  });

  const { data: faturas = [] } = useQuery({
    queryKey: ["faturas_cartao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturas_cartao").select("*").order("mes_referencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fatura[];
    },
    enabled: !!user,
  });

  const activeCard = useMemo(() => {
    if (selectedCardId) return cartoes.find((c) => c.id === selectedCardId) ?? cartoes[0] ?? null;
    return cartoes[0] ?? null;
  }, [cartoes, selectedCardId]);

  // Filtra logs do cartao ativo
  const cardCompras = useMemo(() => activeCard ? compras.filter((c) => c.cartao_id === activeCard.id) : [], [compras, activeCard]);
  const cardFaturas = useMemo(() => activeCard ? faturas.filter((f) => f.cartao_id === activeCard.id) : [], [faturas, activeCard]);

  // Calcula limites processando TODAS as compras do cartao q não estao em faturas PAGAS
  const { limiteUsado, limiteDisponivel } = useMemo(() => {
    if (!activeCard) return { limiteUsado: 0, limiteDisponivel: 0 };
    
    // Paga se fatura.status === "paga"
    const faturasPagas = new Set(cardFaturas.filter(f => f.status === "paga").map(f => f.mes_referencia));
    
    let totalUsado = 0;
    for (const c of cardCompras) {
      const mesRef = getPurchaseInvoicePeriod(c.data, activeCard.dia_fechamento || 1);
      if (!faturasPagas.has(mesRef)) {
        totalUsado += c.valor;
      }
    }

    const disponivel = Math.max(0, (activeCard.limite_total || 0) - totalUsado);
    return { limiteUsado: totalUsado, limiteDisponivel: disponivel };
  }, [activeCard, cardCompras, cardFaturas]);

  const currentPeriod = useMemo(() => {
    if (!activeCard) return getLocalDateString().slice(0, 7);
    const now = new Date();
    const d = now.getDate();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (d >= (activeCard.dia_fechamento || 1)) {
        const next = new Date(y, m + 1, 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }, [activeCard]);

  useMemo(() => {
    if (currentPeriod && !selectedMesRef) setSelectedMesRef(currentPeriod);
  }, [currentPeriod, selectedMesRef]);

  // ── Card mutations ──
  const saveCard = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: cardForm.nome.trim(),
        limite_total: parseFloat(cardForm.limite_total) || 0,
        dia_fechamento: parseInt(cardForm.dia_fechamento) || 1,
        dia_vencimento: parseInt(cardForm.dia_vencimento) || 10,
        tipo_conta: cardForm.tipo_conta,
        banco: cardForm.banco || null,
        user_id: user!.id,
      };
      if (!payload.nome) throw new Error("Nome obrigatório");
      if (editingCardId) {
        const { error } = await supabase.from("cartoes_credito").update(payload).eq("id", editingCardId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cartoes_credito").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cartoes_credito", user?.id] });
      toast.success(editingCardId ? "Cartão atualizado!" : "Cartão cadastrado!");
      closeCardDialog();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar cartão"),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cartoes_credito").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cartoes_credito", user?.id] });
      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      qc.invalidateQueries({ queryKey: ["faturas_cartao", user?.id] });
      toast.success("Cartão excluído!");
      setSelectedCardId(null);
    },
    onError: () => toast.error("Erro ao excluir cartão"),
  });

  // ── Purchase mutations ──
  const saveCompra = useMutation({
    mutationFn: async () => {
      const valorTotal = parseFloat(compraForm.valor);
      const parcelas = parseInt(compraForm.parcelas) || 1;
      
      if (!valorTotal || valorTotal <= 0) throw new Error("Valor inválido");
      if (!compraForm.descricao.trim()) throw new Error("Descrição obrigatória");
      const cartaoId = compraForm.cartao_id || activeCard?.id;
      if (!cartaoId) throw new Error("Selecione um cartão");

      // Editar uma compra especifica (nunca e parcelada ao editar, e sim uma unica)
      if (editingCompraId) {
        const payload = {
          descricao: compraForm.descricao.trim(),
          valor: valorTotal,
          data: compraForm.data,
          categoria: compraForm.categoria || null,
          cartao_id: cartaoId,
        };
        const { error } = await supabase.from("compras_cartao").update(payload).eq("id", editingCompraId);
        if (error) throw error;
        return;
      }

      // Insercao nova (pode ser parcelada)
      const valorParcela = valorTotal / parcelas;
      const inserts: any[] = [];
      let currentCompra = new Date(compraForm.data + "T12:00:00");
      
      for (let i = 1; i <= parcelas; i++) {
        let desc = compraForm.descricao.trim();
        if (parcelas > 1) {
          desc = `${desc} (${i}/${parcelas})`;
        }
        
        inserts.push({
          descricao: desc,
          valor: valorParcela,
          data: currentCompra.toISOString().slice(0, 10),
          categoria: compraForm.categoria || null,
          cartao_id: cartaoId,
          user_id: user!.id,
        });

        // Avancar 1 mes exato para a prox parcela
        currentCompra.setMonth(currentCompra.getMonth() + 1);
      }

      const { error } = await supabase.from("compras_cartao").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      toast.success(editingCompraId ? "Compra atualizada!" : "Compra(s) registrada(s)!");
      closeCompraDialog();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar compra"),
  });

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

  // ── Pay invoice ──
  const payInvoice = useMutation({
    mutationFn: async ({ mesRef, total, accountId }: { mesRef: string; total: number; accountId: string }) => {
      if (!activeCard) return;

      // Upsert fatura
      const existing = cardFaturas.find((f) => f.mes_referencia === mesRef);
      if (existing) {
        const { error } = await supabase.from("faturas_cartao").update({
          status: "paga",
          valor_total: total,
          data_pagamento: getLocalDateString(),
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faturas_cartao").insert({
          cartao_id: activeCard.id,
          mes_referencia: mesRef,
          valor_total: total,
          status: "paga",
          data_pagamento: getLocalDateString(),
          user_id: user!.id,
        } as any);
        if (error) throw error;
      }

      // NOVO: Registrar na tabela de transactions (Ledger)
      const { error: txError } = await supabase.from("transactions").insert({
        description: `Fatura ${activeCard.nome} - ${formatMonthLabel(mesRef)}`,
        amount: total,
        date: getLocalDateString(),
        category: "Cartão de Crédito",
        type: "expense",
        status: "confirmed",
        account_id: accountId,
        user_id: user!.id,
      } as any);
      
      if (txError) throw txError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturas_cartao", user?.id] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_financeiras"] });
      toast.success("Fatura paga e despesa registrada no ledger!");
    },
    onError: (e: any) => toast.error("Erro ao pagar fatura: " + e.message),
  });

  // ── Dialog helpers ──
  const closeCardDialog = useCallback(() => {
    setCardDialogOpen(false);
    setEditingCardId(null);
    setCardForm(emptyCardForm);
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsParsing(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    try {
      let transactions: ImportedTransaction[] = [];
      
      if (ext === "pdf") {
        transactions = await parsePDF(file);
      } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
        toast.info("Lendo a imagem... (Isso pode demorar alguns segundos).");
        transactions = await parseImage(file);
      } else {
        toast.error("Formato de arquivo não suportado.");
        setIsParsing(false);
        return;
      }
      
      if (transactions.length === 0) {
        toast.error("Nenhuma transação identificada no arquivo.");
      } else {
        // Detect Duplicates in Credit Cards context (compras_cartao table)
        if (user?.id && activeCard?.id) {
          const dates = transactions.map(t => new Date(t.data).getTime()).filter(t => !isNaN(t));
          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates));
            minDate.setDate(minDate.getDate() - 3);
            const maxDate = new Date(Math.max(...dates));
            maxDate.setDate(maxDate.getDate() + 3);

            const { data: existing } = await supabase
              .from('compras_cartao')
              .select('descricao, valor, data')
              .eq('cartao_id', activeCard.id)
              .gte('data', minDate.toISOString().split('T')[0])
              .lte('data', maxDate.toISOString().split('T')[0]);
            
            if (existing && existing.length > 0) {
              transactions = transactions.map(t => {
                const dup = existing.some(e => 
                  Math.abs(Number(e.amount || e.valor) - t.valor) < 0.01 &&
                  Math.abs(new Date(e.date || e.data).getTime() - new Date(t.data).getTime()) <= 86400000 * 3
                );
                return { ...t, isDuplicate: dup, selected: !dup };
              });
            }
          }
        }

        setImportedTransactions(transactions);
        toast.success(`${transactions.length} transações identificadas!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleBulkImport = async () => {
    // Ignorar "receitas" (como pagamentos de fatura com sinal negativo)
    const toImport = importedTransactions.filter(t => t.selected && t.tipo !== "receita");
    if (toImport.length === 0 || !activeCard) return;

    try {
        const inserts: any[] = [];
        
        // Vamos determinar o mês "atual" da fatura lida (moda ou mês atual do sistema se falhar)
        const nonInstallmentDates = toImport
          .filter(t => !t.numero_parcelas)
          .map(t => new Date(t.data).getTime())
          .filter(t => !isNaN(t));
        
        const anchorDate = nonInstallmentDates.length > 0 
          ? new Date(Math.max(...nonInstallmentDates))
          : new Date();

        toImport.forEach((t) => {
          if (t.parcela_atual && t.numero_parcelas && t.parcela_atual <= t.numero_parcelas) {
            // Se for compra parcelada (ex: 8/10), ancoramos a parcela ATUAL no mês da fatura principal
            // para evitar que o "18/07" (compra do passado) crie uma fatura fictícia
            let baseDate = new Date(t.data + "T12:00:00");
            baseDate.setFullYear(anchorDate.getFullYear());
            baseDate.setMonth(anchorDate.getMonth());

            // Gerar a parcela lida e todas as subsequentes
            for (let i = t.parcela_atual; i <= t.numero_parcelas; i++) {
              inserts.push({
                descricao: `${t.descricao} (${i}/${t.numero_parcelas})`,
                valor: t.valor,
                data: baseDate.toISOString().slice(0, 10),
                categoria: t.categoria || null,
                cartao_id: activeCard.id,
                user_id: user!.id,
              });
              baseDate.setMonth(baseDate.getMonth() + 1); // avança mês para a próxima parcela
            }
          } else {
            // Compras comuns à vista (anexa caso tenha alguma parcela isolada sem criar loop longo)
            let finalDesc = t.descricao;
            if (t.parcela_atual && t.numero_parcelas) {
              finalDesc = `${finalDesc} (${t.parcela_atual}/${t.numero_parcelas})`;
            }
            inserts.push({
              descricao: finalDesc,
              valor: t.valor,
              data: t.data, // mantemos a data precisa
              categoria: t.categoria || null,
              cartao_id: activeCard.id,
              user_id: user!.id,
            });
          }
        });

      const { error } = await supabase.from("compras_cartao").insert(inserts);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["compras_cartao", user?.id] });
      toast.success(`${toImport.length} compras importadas com sucesso!`);
      setImportDialogOpen(false);
      setImportedTransactions([]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar transações.");
    }
  };

  const closeCompraDialog = useCallback(() => {
    setCompraDialogOpen(false);
    setEditingCompraId(null);
    setCompraForm(emptyCompraForm);
  }, []);

  const openEditCard = (c: Cartao) => {
    setEditingCardId(c.id);
    setCardForm({
      nome: c.nome,
      limite_total: String(c.limite_total),
      dia_fechamento: String(c.dia_fechamento),
      dia_vencimento: String(c.dia_vencimento),
      tipo_conta: c.tipo_conta ?? "pessoal",
      banco: c.banco ?? "",
    });
    setCardDialogOpen(true);
  };

  const openEditCompra = (c: Compra) => {
    setEditingCompraId(c.id);
    setCompraForm({
      descricao: c.descricao,
      valor: String(c.valor),
      data: c.data,
      categoria: c.categoria ?? "",
      cartao_id: c.cartao_id,
      parcelas: "1" // Edicao nao altera nr de parcelas, edita so o individual
    });
    setCompraDialogOpen(true);
  };

  const openNewCompra = () => {
    setCompraForm({ ...emptyCompraForm, cartao_id: activeCard?.id ?? "" });
    setEditingCompraId(null);
    setCompraDialogOpen(true);
  };

  const handleOpenPayInvoice = (mesRef: string, total: number) => {
    setPaymentMesRef(mesRef);
    setPaymentTotal(total);
    setPayInvoiceDialogOpen(true);
    // Auto-select first bank account
    if (accounts.length > 0 && !paymentAccountId) {
      setPaymentAccountId(accounts[0].id);
    }
  };

  const confirmPayment = () => {
    if (!paymentAccountId) {
      toast.error("Selecione uma conta para pagar");
      return;
    }
    payInvoice.mutate({ mesRef: paymentMesRef, total: paymentTotal, accountId: paymentAccountId });
    setPayInvoiceDialogOpen(false);
  };

  // ── No cards state ──
  if (!loadingCards && cartoes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Cartões de Crédito</h1>
            <p className="text-sm text-muted-foreground">Controle seus cartões e faturas</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Nenhum cartão cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Cadastre seu primeiro cartão de crédito para começar a controlar suas faturas e gastos.
            </p>
            <Button onClick={() => { setCardForm(emptyCardForm); setEditingCardId(null); setCardDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Cadastrar Cartão
            </Button>
          </CardContent>
        </Card>

        {/* Card Dialog */}
        <Dialog open={cardDialogOpen} onOpenChange={(v) => { if (!v) closeCardDialog(); else setCardDialogOpen(true); }}>
            <DialogContent aria-describedby="new-card-description">
                <DialogHeader>
                    <DialogTitle>{editingCardId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
                    <DialogDescription id="new-card-description" className="sr-only">Formulário para cadastrar ou editar detalhes do cartão de crédito.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                    <Label>Nome do Cartão *</Label>
                    <Input value={cardForm.nome} onChange={(e) => setCardForm({ ...cardForm, nome: e.target.value })} placeholder="Ex: Nubank, Itaú Black" />
                    </div>
                    <div className="space-y-2">
                    <Label>Banco Emissor</Label>
                    <Select value={cardForm.banco} onValueChange={(v) => setCardForm({ ...cardForm, banco: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                        {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                    <Label>Limite Total (R$)</Label>
                    <Input type="number" step="0.01" value={cardForm.limite_total} onChange={(e) => setCardForm({ ...cardForm, limite_total: e.target.value })} placeholder="Ex: 5000.00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Dia de Fechamento</Label>
                        <Input type="number" min="1" max="31" value={cardForm.dia_fechamento} onChange={(e) => setCardForm({ ...cardForm, dia_fechamento: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Dia de Vencimento</Label>
                        <Input type="number" min="1" max="31" value={cardForm.dia_vencimento} onChange={(e) => setCardForm({ ...cardForm, dia_vencimento: e.target.value })} />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select value={cardForm.tipo_conta} onValueChange={(v) => setCardForm({ ...cardForm, tipo_conta: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                        <SelectItem value="mei">MEI / Empresarial</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <Button className="w-full mt-4" onClick={() => saveCard.mutate()} disabled={saveCard.isPending}>
                        {saveCard.isPending ? "Salvando..." : "Salvar Cartão"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">Controle inteligente de faturas e parcelamentos</p>
        </div>
        <div className="flex gap-2">
        {activeCard && <PurchaseSimulator cartaoDiaFechamento={activeCard.dia_fechamento || 1} />}
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={!activeCard}>
            <FileText className="mr-2 h-4 w-4" /> Importar PDF
          </Button>
          <Button onClick={openNewCompra} disabled={!activeCard}>
            <Plus className="mr-2 h-4 w-4" /> Nova Compra
          </Button>
        </div>
      </div>

      {/* Cards Horizontal List */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide">
        {/* Renderiza botao de add cartao se hover outros */}
        <Button 
            variant="outline" 
            className="shrink-0 h-[178px] min-w-[140px] flex flex-col justify-center gap-2 border-dashed snap-start" 
            onClick={() => { setCardForm(emptyCardForm); setEditingCardId(null); setCardDialogOpen(true); }}
        >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-muted-foreground font-normal">Novo Cartão</span>
        </Button>
          
        {cartoes.map((c) => (
            <div key={c.id} className="snap-start shrink-0">
                <CardDashboardItem
                    cartao={c}
                    isActive={activeCard?.id === c.id}
                    onClick={() => setSelectedCardId(c.id)}
                    onEdit={openEditCard}
                    onDelete={(id) => deleteCard.mutate(id)}
                    limiteUsado={c.id === activeCard?.id ? limiteUsado : 0} 
                    limiteDisponivel={c.id === activeCard?.id ? limiteDisponivel : c.limite_total || 0}
                />
            </div>
        ))}
      </div>

      {/* Invoices Timeline */}
      {activeCard && (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h2 className="font-heading text-xl font-bold flex items-center gap-2 text-primary">
                    Faturas do Cartão
                </h2>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                        <TabsList className="grid grid-cols-2 w-full sm:w-[240px] h-9">
                            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                            <TabsTrigger value="fatura" className="text-xs">Fatura Real</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {viewMode === "fatura" && (
                        <Select value={selectedMesRef} onValueChange={setSelectedMesRef}>
                            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Array.from(new Set(cardCompras.map(c => getPurchaseInvoicePeriod(c.data, activeCard.dia_fechamento || 1)))).sort().reverse().map(mes => (
                                    <SelectItem key={mes} value={mes}>{formatMonthLabel(mes)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {viewMode === "timeline" ? (
                <InvoiceTimeline
                    cartao={activeCard}
                    compras={cardCompras}
                    faturas={cardFaturas}
                    isMobile={isMobile}
                    onPayInvoice={handleOpenPayInvoice}
                    onEditCompra={openEditCompra}
                    onDeleteCompra={(id) => deleteCompra.mutate(id)}
                />
            ) : (
                <div className="max-w-4xl mx-auto py-4">
                  <PhysicalInvoice
                      cartao={activeCard}
                      compras={cardCompras.filter(c => getPurchaseInvoicePeriod(c.data, activeCard.dia_fechamento || 1) === selectedMesRef)}
                      mesRef={selectedMesRef}
                      onEditCompra={openEditCompra}
                      onDeleteCompra={(id) => deleteCompra.mutate(id)}
                  />
                  <div className="mt-4 flex justify-end gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <FileDown className="mr-2 h-4 w-4" /> Exportar / Imprimir
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleOpenPayInvoice(selectedMesRef, cardCompras.filter(c => getPurchaseInvoicePeriod(c.data, activeCard.dia_fechamento || 1) === selectedMesRef).reduce((acc, c) => acc + c.valor, 0))}
                      disabled={cardFaturas.find(f => f.mes_referencia === selectedMesRef)?.status === "paga"}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> {cardFaturas.find(f => f.mes_referencia === selectedMesRef)?.status === "paga" ? "Fatura Paga" : "Confirmar Pagamento"}
                    </Button>
                  </div>
                </div>
            )}
        </>
      )}

      {/* Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(v) => { if (!v) closeCardDialog(); else setCardDialogOpen(true); }}>
        <DialogContent aria-describedby="card-dialog-description">
            <DialogHeader>
                <DialogTitle>{editingCardId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
                <DialogDescription id="card-dialog-description" className="sr-only">
                  Formulário para gerenciar informações do seu cartão de crédito como limite e vencimento.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                <Label>Nome do Cartão *</Label>
                <Input value={cardForm.nome} onChange={(e) => setCardForm({ ...cardForm, nome: e.target.value })} placeholder="Ex: Nubank, Itaú Black" />
                </div>
                <div className="space-y-2">
                <Label>Banco Emissor</Label>
                <Select value={cardForm.banco} onValueChange={(v) => setCardForm({ ...cardForm, banco: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                    {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                <Label>Limite Total (R$)</Label>
                <Input type="number" step="0.01" value={cardForm.limite_total} onChange={(e) => setCardForm({ ...cardForm, limite_total: e.target.value })} placeholder="Ex: 5000.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Dia de Fechamento</Label>
                    <Input type="number" min="1" max="31" value={cardForm.dia_fechamento} onChange={(e) => setCardForm({ ...cardForm, dia_fechamento: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Input type="number" min="1" max="31" value={cardForm.dia_vencimento} onChange={(e) => setCardForm({ ...cardForm, dia_vencimento: e.target.value })} />
                </div>
                </div>
                <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select value={cardForm.tipo_conta} onValueChange={(v) => setCardForm({ ...cardForm, tipo_conta: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                    <SelectItem value="mei">MEI / Empresarial</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <Button className="w-full mt-4" onClick={() => saveCard.mutate()} disabled={saveCard.isPending}>
                    {saveCard.isPending ? "Salvando..." : "Salvar Cartão"}
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={compraDialogOpen} onOpenChange={(v) => { if (!v) closeCompraDialog(); else setCompraDialogOpen(true); }}>
        <DialogContent aria-describedby="purchase-dialog-description">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingCompraId ? "Editar Compra / Parcela" : "Nova Compra Cartão"}
            </DialogTitle>
            <DialogDescription id="purchase-dialog-description" className="sr-only">
              Registre uma nova compra ou edite os detalhes de uma parcela existente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {cartoes.length > 1 && (
              <div className="space-y-2">
                <Label>Cartão *</Label>
                <Select value={compraForm.cartao_id} onValueChange={(v) => setCompraForm({ ...compraForm, cartao_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                  <SelectContent>
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Descrição da Compra *</Label>
              <Input
                value={compraForm.descricao}
                onChange={(e) => setCompraForm({ ...compraForm, descricao: e.target.value })}
                placeholder="Ex: Supermercado Extra"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{editingCompraId ? "Valor da Parcela (R$)" : "Valor TOTAL (R$)"} *</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={compraForm.valor}
                        onChange={(e) => setCompraForm({ ...compraForm, valor: e.target.value })}
                        placeholder="Ex: 150.00"
                    />
                </div>
                {!editingCompraId && (
                    <div className="space-y-2">
                        <Label>Parcelas *</Label>
                        <Input
                            type="number"
                            min="1"
                            max="72"
                            value={compraForm.parcelas}
                            onChange={(e) => setCompraForm({ ...compraForm, parcelas: e.target.value })}
                            placeholder="Ex: 1"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-2">
              <Label>Data da Compra *</Label>
              <Input
                type="date"
                value={compraForm.data}
                onChange={(e) => setCompraForm({ ...compraForm, data: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={compraForm.categoria} onValueChange={(v) => setCompraForm({ ...compraForm, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            disabled={saveCompra.isPending}
            onClick={() => saveCompra.mutate()}
          >
            {saveCompra.isPending ? "Salvando..." : editingCompraId ? "Salvar Alterações" : "Registrar Compra"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={payInvoiceDialogOpen} onOpenChange={setPayInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Fatura - {formatMonthLabel(paymentMesRef)}</DialogTitle>
            <DialogDescription>
              Selecione a conta que será utilizada para o pagamento de {formatCurrency(paymentTotal)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Conta de Origem</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.nome} (Saldo: {formatCurrency(acc.saldo)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-4" onClick={confirmPayment} disabled={payInvoice.isPending}>
              {payInvoice.isPending ? "Processando..." : "Confirmar e Pagar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={(v) => { if (!v) { setImportDialogOpen(false); setImportedTransactions([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden" aria-describedby="import-dialog-description">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Importar Fatura (PDF ou Imagem)
            </DialogTitle>
            <DialogDescription id="import-dialog-description" className="sr-only">
              Suba o arquivo PDF ou imagem da sua fatura para identificar e importar gastos automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {importedTransactions.length === 0 ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isParsing ? "opacity-50 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5"}`}
                onClick={() => document.getElementById("file-input-invoice")?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className={`h-8 w-8 text-primary ${isParsing ? "animate-bounce" : ""}`} />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {isParsing ? "Processando arquivo..." : "Arraste sua fatura aqui"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Selecione o arquivo PDF ou uma imagem da sua fatura para identificar as compras automaticamente.
                </p>
                <Button variant="outline" disabled={isParsing}>
                   Selecionar Arquivo
                </Button>
                <input 
                  id="file-input-invoice" 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">
                    {importedTransactions.length} transações encontradas em <strong>{activeCard?.nome}</strong>
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setImportedTransactions([])} className="text-xs h-7">
                    <RefreshCw className="h-3 w-3 mr-1" /> Trocar arquivo
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {importedTransactions.map((t) => (
                    <div 
                      key={t.id} 
                      className={`flex flex-col p-3 rounded-lg border transition-all ${t.selected ? "bg-card border-primary/20 shadow-sm" : "bg-muted/30 opacity-60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={t.selected} 
                          onCheckedChange={() => {
                            setImportedTransactions(prev => prev.map(item => item.id === t.id ? { ...item, selected: !item.selected } : item));
                          }} 
                        />
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <Input 
                              value={t.descricao} 
                              onChange={(e) => {
                                setImportedTransactions(prev => prev.map(item => item.id === t.id ? { ...item, descricao: e.target.value } : item));
                              }}
                              className="h-7 text-xs border-transparent hover:border-input focus:border-primary shadow-none p-2 bg-transparent w-full"
                            />
                            <div className="flex flex-col items-end shrink-0">
                              <span className="font-bold text-sm whitespace-nowrap">{formatCurrency(t.valor)}</span>
                              <Badge variant="outline" className={`text-[8px] h-4 mt-1 ${t.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                {t.confidence === 'high' ? 'Alta Conf' : 'Média'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              <Input 
                                type="date" 
                                value={t.data} 
                                onChange={(e) => {
                                  setImportedTransactions(prev => prev.map(item => item.id === t.id ? { ...item, data: e.target.value } : item));
                                }}
                                className="h-6 text-[10px] border-transparent p-0 bg-transparent w-[95px]"
                              />
                              
                              <div className="flex flex-wrap items-center gap-1">
                                {t.isDuplicate && (
                                  <div className="flex items-center text-[9px] text-amber-600 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded cursor-help" title="Possível duplicata já registrada no seu sistema para este cartão, valor e data próximos.">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                    Duplicata?
                                  </div>
                                )}
                                {(t.parcela_atual && t.numero_parcelas) ? (
                                  <span className="text-[9px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                                    {t.parcela_atual}/{t.numero_parcelas}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setImportedTransactions(prev => prev.filter(item => item.id !== t.id))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {importedTransactions.length > 0 && (
            <div className="p-6 border-t bg-muted/20 flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-muted-foreground font-medium uppercase">Total selecionado</span>
                <span className="font-bold text-lg text-primary">
                  {formatCurrency(importedTransactions.filter(t => t.selected).reduce((acc, t) => acc + t.valor, 0))}
                </span>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleBulkImport()} 
                disabled={saveCompra.isPending || importedTransactions.filter(t => t.selected).length === 0}
              >
                {saveCompra.isPending ? "Importando..." : `Importar ${importedTransactions.filter(t => t.selected).length} transações`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
