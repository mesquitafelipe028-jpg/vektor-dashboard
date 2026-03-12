import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, HelpCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Icons and Utils
import { expenseCategories } from "@/lib/utils";
import { banks } from "@/lib/banks";

// Types
import { Tables } from "@/integrations/supabase/types";

// Subcomponents
import { CardDashboardItem } from "@/components/credit-cards/CardDashboardItem";
import { InvoiceTimeline } from "@/components/credit-cards/InvoiceTimeline";
import { PurchaseSimulator } from "@/components/credit-cards/PurchaseSimulator";

// Types mapping
type Cartao = Tables<"cartoes_credito">;
type Compra = Tables<"compras_cartao">;
type Fatura = Tables<"faturas_cartao">;

type CardForm = { nome: string; limite_total: string; dia_fechamento: string; dia_vencimento: string; tipo_conta: string; banco: string };
const emptyCardForm: CardForm = { nome: "", limite_total: "", dia_fechamento: "1", dia_vencimento: "10", tipo_conta: "pessoal", banco: "" };

type CompraForm = { descricao: string; valor: string; data: string; categoria: string; cartao_id: string; parcelas: string };
const emptyCompraForm: CompraForm = { descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "", cartao_id: "", parcelas: "1" };

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
    mutationFn: async ({ mesRef, total }: { mesRef: string; total: number }) => {
      if (!activeCard) return;

      // Upsert fatura
      const existing = cardFaturas.find((f) => f.mes_referencia === mesRef);
      if (existing) {
        const { error } = await supabase.from("faturas_cartao").update({
          status: "paga",
          valor_total: total,
          data_pagamento: new Date().toISOString().slice(0, 10),
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faturas_cartao").insert({
          cartao_id: activeCard.id,
          mes_referencia: mesRef,
          valor_total: total,
          status: "paga",
          data_pagamento: new Date().toISOString().slice(0, 10),
          user_id: user!.id,
        } as any);
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
      qc.invalidateQueries({ queryKey: ["faturas_cartao", user?.id] });
      qc.invalidateQueries({ queryKey: ["despesas", user?.id] });
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingCardId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
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
        <div className="mt-8 space-y-4">
            <h2 className="font-heading text-xl font-bold mb-2 flex items-center gap-2 text-primary">
                Faturas do Cartão
            </h2>
            <InvoiceTimeline
                cartao={activeCard}
                compras={cardCompras}
                faturas={cardFaturas}
                isMobile={isMobile}
                onPayInvoice={(mesRef, total) => payInvoice.mutate({ mesRef, total })}
                onEditCompra={openEditCompra}
                onDeleteCompra={(id) => deleteCompra.mutate(id)}
            />
        </div>
      )}

      {/* Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(v) => { if (!v) closeCardDialog(); else setCardDialogOpen(true); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCardId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingCompraId ? "Editar Compra / Parcela" : "Nova Compra Cartão"}
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
    </div>
  );
}
