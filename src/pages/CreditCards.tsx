import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Plus, Pencil, Trash2, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { formatCurrency, formatDate, expenseCategories } from "@/lib/mockData";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────
interface Cartao {
  id: string;
  nome: string;
  limite_total: number;
  dia_fechamento: number;
  dia_vencimento: number;
  tipo_conta: string;
}

interface Compra {
  id: string;
  cartao_id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string | null;
}

interface Fatura {
  id: string;
  cartao_id: string;
  mes_referencia: string;
  valor_total: number;
  status: string;
  data_pagamento: string | null;
}

type CardForm = { nome: string; limite_total: string; dia_fechamento: string; dia_vencimento: string; tipo_conta: string };
const emptyCardForm: CardForm = { nome: "", limite_total: "", dia_fechamento: "1", dia_vencimento: "10", tipo_conta: "pessoal" };

type CompraForm = { descricao: string; valor: string; data: string; categoria: string; cartao_id: string };
const emptyCompraForm: CompraForm = { descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "", cartao_id: "" };

// ── Helpers ────────────────────────────────────────
function getCurrentInvoicePeriod(diaFechamento: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const d = now.getDate();
  // If past closing day, current invoice is next month
  if (d > diaFechamento) {
    const next = new Date(y, m + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getNextInvoicePeriod(diaFechamento: number) {
  const current = getCurrentInvoicePeriod(diaFechamento);
  const [y, m] = current.split("-").map(Number);
  const next = new Date(y, m, 1); // m is already 1-indexed, so this gives next month
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function getPurchaseInvoicePeriod(purchaseDate: string, diaFechamento: number) {
  const d = new Date(purchaseDate + "T12:00:00");
  const day = d.getDate();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (day > diaFechamento) {
    const next = new Date(y, m + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function formatMonthLabel(mesRef: string) {
  const [y, m] = mesRef.split("-").map(Number);
  const d = new Date(y, m - 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── Component ──────────────────────────────────────
export default function CreditCards() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Dialog states
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);

  const [compraDialogOpen, setCompraDialogOpen] = useState(false);
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);
  const [compraForm, setCompraForm] = useState<CompraForm>(emptyCompraForm);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // ── Queries ──
  const { data: cartoes = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cartoes_credito"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("cartoes_credito").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Cartao[];
    },
    enabled: !!user,
  });

  const { data: compras = [] } = useQuery({
    queryKey: ["compras_cartao"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("compras_cartao").select("*").order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Compra[];
    },
    enabled: !!user,
  });

  const { data: faturas = [] } = useQuery({
    queryKey: ["faturas_cartao"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("faturas_cartao").select("*").order("mes_referencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fatura[];
    },
    enabled: !!user,
  });

  const activeCard = useMemo(() => {
    if (selectedCardId) return cartoes.find((c) => c.id === selectedCardId) ?? cartoes[0] ?? null;
    return cartoes[0] ?? null;
  }, [cartoes, selectedCardId]);

  // ── Derived data ──
  const currentPeriod = activeCard ? getCurrentInvoicePeriod(activeCard.dia_fechamento) : "";
  const nextPeriod = activeCard ? getNextInvoicePeriod(activeCard.dia_fechamento) : "";

  const cardCompras = useMemo(() => activeCard ? compras.filter((c) => c.cartao_id === activeCard.id) : [], [compras, activeCard]);

  const currentCompras = useMemo(() =>
    cardCompras.filter((c) => getPurchaseInvoicePeriod(c.data, activeCard?.dia_fechamento ?? 1) === currentPeriod),
    [cardCompras, currentPeriod, activeCard]
  );

  const nextCompras = useMemo(() =>
    cardCompras.filter((c) => getPurchaseInvoicePeriod(c.data, activeCard?.dia_fechamento ?? 1) === nextPeriod),
    [cardCompras, nextPeriod, activeCard]
  );

  const currentTotal = currentCompras.reduce((s, c) => s + c.valor, 0);
  const nextTotal = nextCompras.reduce((s, c) => s + c.valor, 0);

  const limiteUsado = currentTotal + nextTotal;
  const limiteDisponivel = activeCard ? Math.max(0, activeCard.limite_total - limiteUsado) : 0;
  const usagePercent = activeCard && activeCard.limite_total > 0 ? (limiteUsado / activeCard.limite_total) * 100 : 0;

  const cardFaturas = useMemo(() =>
    activeCard ? faturas.filter((f) => f.cartao_id === activeCard.id) : [],
    [faturas, activeCard]
  );

  // ── Card mutations ──
  const saveCard = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: cardForm.nome.trim(),
        limite_total: parseFloat(cardForm.limite_total) || 0,
        dia_fechamento: parseInt(cardForm.dia_fechamento) || 1,
        dia_vencimento: parseInt(cardForm.dia_vencimento) || 10,
        tipo_conta: cardForm.tipo_conta,
        user_id: user!.id,
      };
      if (!payload.nome) throw new Error("Nome obrigatório");
      if (editingCardId) {
        const { error } = await (supabase as any).from("cartoes_credito").update(payload).eq("id", editingCardId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("cartoes_credito").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cartoes_credito"] });
      toast.success(editingCardId ? "Cartão atualizado!" : "Cartão cadastrado!");
      closeCardDialog();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar cartão"),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cartoes_credito").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cartoes_credito"] });
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
      qc.invalidateQueries({ queryKey: ["faturas_cartao"] });
      toast.success("Cartão excluído!");
      setSelectedCardId(null);
    },
    onError: () => toast.error("Erro ao excluir cartão"),
  });

  // ── Purchase mutations ──
  const saveCompra = useMutation({
    mutationFn: async () => {
      const valor = parseFloat(compraForm.valor);
      if (!valor || valor <= 0) throw new Error("Valor inválido");
      if (!compraForm.descricao.trim()) throw new Error("Descrição obrigatória");
      const cartaoId = compraForm.cartao_id || activeCard?.id;
      if (!cartaoId) throw new Error("Selecione um cartão");

      const payload = {
        descricao: compraForm.descricao.trim(),
        valor,
        data: compraForm.data,
        categoria: compraForm.categoria || null,
        cartao_id: cartaoId,
        user_id: user!.id,
      };
      if (editingCompraId) {
        const { error } = await (supabase as any).from("compras_cartao").update(payload).eq("id", editingCompraId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("compras_cartao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
      toast.success(editingCompraId ? "Compra atualizada!" : "Compra registrada!");
      closeCompraDialog();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar compra"),
  });

  const deleteCompra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("compras_cartao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
      toast.success("Compra excluída!");
    },
    onError: () => toast.error("Erro ao excluir compra"),
  });

  // ── Pay invoice ──
  const payInvoice = useMutation({
    mutationFn: async (mesRef: string) => {
      if (!activeCard) return;
      const total = cardCompras
        .filter((c) => getPurchaseInvoicePeriod(c.data, activeCard.dia_fechamento) === mesRef)
        .reduce((s, c) => s + c.valor, 0);

      // Upsert fatura
      const existing = cardFaturas.find((f) => f.mes_referencia === mesRef);
      if (existing) {
        const { error } = await (supabase as any).from("faturas_cartao").update({
          status: "paga",
          valor_total: total,
          data_pagamento: new Date().toISOString().slice(0, 10),
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("faturas_cartao").insert({
          cartao_id: activeCard.id,
          mes_referencia: mesRef,
          valor_total: total,
          status: "paga",
          data_pagamento: new Date().toISOString().slice(0, 10),
          user_id: user!.id,
        });
        if (error) throw error;
      }

      // Register as expense
      const { error: expError } = await supabase.from("despesas").insert({
        descricao: `Fatura ${activeCard.nome} - ${formatMonthLabel(mesRef)}`,
        valor: total,
        data: new Date().toISOString().slice(0, 10),
        categoria: "Cartão de Crédito",
        user_id: user!.id,
      });
      if (expError) throw expError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faturas_cartao"] });
      qc.invalidateQueries({ queryKey: ["despesas"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Fatura paga e despesa registrada!");
    },
    onError: () => toast.error("Erro ao pagar fatura"),
  });

  // ── Dialog helpers ──
  const closeCardDialog = useCallback(() => {
    setCardDialogOpen(false);
    setEditingCardId(null);
    setCardForm(emptyCardForm);
  }, []);

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
      tipo_conta: c.tipo_conta,
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
    });
    setCompraDialogOpen(true);
  };

  const openNewCompra = () => {
    setCompraForm({ ...emptyCompraForm, cartao_id: activeCard?.id ?? "" });
    setEditingCompraId(null);
    setCompraDialogOpen(true);
  };

  // ── Render helpers ──
  const isPeriodPaid = (mesRef: string) => cardFaturas.some((f) => f.mes_referencia === mesRef && f.status === "paga");

  const renderPurchaseTable = (purchases: Compra[], showActions = true) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 5 : 4} className="text-center text-muted-foreground py-8">
                Nenhuma compra registrada
              </TableCell>
            </TableRow>
          ) : (
            purchases.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <TableCell>{formatDate(c.data)}</TableCell>
                <TableCell className="font-medium">{c.descricao}</TableCell>
                <TableCell>{c.categoria ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">
                  {formatCurrency(c.valor)}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditCompra(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A compra "{c.descricao}" será removida permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCompra.mutate(c.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

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
        <CardFormDialog
          open={cardDialogOpen}
          onOpenChange={(v) => { if (!v) closeCardDialog(); else setCardDialogOpen(true); }}
          form={cardForm}
          setForm={setCardForm}
          onSave={() => saveCard.mutate()}
          isPending={saveCard.isPending}
          isEditing={!!editingCardId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">Controle seus cartões e faturas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCardForm(emptyCardForm); setEditingCardId(null); setCardDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cartão
          </Button>
          <Button onClick={openNewCompra} disabled={!activeCard}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Compra
          </Button>
        </div>
      </div>

      {/* Card selector (if multiple) */}
      {cartoes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cartoes.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCardId(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeCard?.id === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {/* Card Summary */}
      {activeCard && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold">{activeCard.nome}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha dia {activeCard.dia_fechamento}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Vence dia {activeCard.dia_vencimento}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditCard(activeCard)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todas as compras e faturas deste cartão serão excluídas permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteCard.mutate(activeCard.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Limit bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limite utilizado</span>
                <span className="font-semibold">
                  {formatCurrency(limiteUsado)} / {formatCurrency(activeCard.limite_total)}
                </span>
              </div>
              <Progress
                value={Math.min(usagePercent, 100)}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Usado: {formatCurrency(limiteUsado)}</span>
                <span className="text-secondary font-medium">Disponível: {formatCurrency(limiteDisponivel)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Fatura Atual / Próxima / Histórico */}
      {activeCard && (
        <Tabs defaultValue="current">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="current">Fatura Atual</TabsTrigger>
            <TabsTrigger value="next">Próxima Fatura</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="font-heading text-lg">
                    Fatura Atual — {formatMonthLabel(currentPeriod)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: <span className="font-semibold text-foreground">{formatCurrency(currentTotal)}</span>
                  </p>
                </div>
                {currentTotal > 0 && !isPeriodPaid(currentPeriod) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-secondary border-secondary hover:bg-secondary/10">
                        <CheckCircle className="mr-2 h-4 w-4" /> Pagar Fatura
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Pagar fatura de {formatMonthLabel(currentPeriod)}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Será registrada uma despesa de {formatCurrency(currentTotal)} no sistema. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => payInvoice.mutate(currentPeriod)}>
                          Confirmar Pagamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {isPeriodPaid(currentPeriod) && (
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                    <CheckCircle className="mr-1 h-3 w-3" /> Paga
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {renderPurchaseTable(currentCompras)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="next" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Próxima Fatura — {formatMonthLabel(nextPeriod)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total parcial: <span className="font-semibold text-foreground">{formatCurrency(nextTotal)}</span>
                </p>
              </CardHeader>
              <CardContent>
                {renderPurchaseTable(nextCompras)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Histórico de Faturas</CardTitle>
              </CardHeader>
              <CardContent>
                {cardFaturas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma fatura no histórico</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cardFaturas.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{formatMonthLabel(f.mes_referencia)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(f.valor_total)}</TableCell>
                            <TableCell>
                              <Badge variant={f.status === "paga" ? "secondary" : "destructive"} className={f.status === "paga" ? "bg-secondary/10 text-secondary" : ""}>
                                {f.status === "paga" ? "Pago" : f.status === "fechada" ? "Fechada" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>{f.data_pagamento ? formatDate(f.data_pagamento) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Card Dialog */}
      <CardFormDialog
        open={cardDialogOpen}
        onOpenChange={(v) => { if (!v) closeCardDialog(); else setCardDialogOpen(true); }}
        form={cardForm}
        setForm={setCardForm}
        onSave={() => saveCard.mutate()}
        isPending={saveCard.isPending}
        isEditing={!!editingCardId}
      />

      {/* Purchase Dialog */}
      <Dialog open={compraDialogOpen} onOpenChange={(v) => { if (!v) closeCompraDialog(); else setCompraDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingCompraId ? "Editar Compra" : "Nova Compra no Cartão"}
            </DialogTitle>
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
              <Label>Descrição *</Label>
              <Input
                value={compraForm.descricao}
                onChange={(e) => setCompraForm({ ...compraForm, descricao: e.target.value })}
                placeholder="Ex: Compra no iFood"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={compraForm.categoria} onValueChange={(v) => setCompraForm({ ...compraForm, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={compraForm.valor}
                  onChange={(e) => setCompraForm({ ...compraForm, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={compraForm.data}
                  onChange={(e) => setCompraForm({ ...compraForm, data: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCompraDialog}>Cancelar</Button>
            <Button onClick={() => saveCompra.mutate()} disabled={saveCompra.isPending}>
              {saveCompra.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Card Form Dialog Component ──
function CardFormDialog({
  open, onOpenChange, form, setForm, onSave, isPending, isEditing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: CardForm;
  setForm: (f: CardForm) => void;
  onSave: () => void;
  isPending: boolean;
  isEditing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? "Editar Cartão" : "Novo Cartão de Crédito"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do Cartão *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Nubank, Inter, C6..."
            />
          </div>
          <div className="space-y-2">
            <Label>Limite Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.limite_total}
              onChange={(e) => setForm({ ...form, limite_total: e.target.value })}
              placeholder="5000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia de Fechamento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.dia_fechamento}
                onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.dia_vencimento}
                onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Conta</Label>
            <Select value={form.tipo_conta} onValueChange={(v) => setForm({ ...form, tipo_conta: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pessoal">Pessoal</SelectItem>
                <SelectItem value="mei">MEI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
