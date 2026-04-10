import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Sparkles } from "lucide-react";
import { getLocalDateString } from "@/lib/utils";

export default function QuickCardExpenseForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data: getLocalDateString(),
    cartao_id: "",
    parcelas: "1"
  });

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

  const saveExpense = useMutation({
    mutationFn: async () => {
      const valorTotal = parseFloat(form.valor);
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
        
        // This generates "credit_card_expense", scheduled physically on Ledger System
        insertsTransactions.push({
          user_id: user!.id,
          description: desc,
          amount: valorParcela,
          date: currentCompra.toISOString().slice(0, 10),
          category: "Lazer/Entretenimento", // Mapeamento default rapido
          type: "expense",
          subtype: "credit_card_expense",
          status: "confirmed", // Fica agendada
          account_id: form.cartao_id, // Virtual account link
          numero_parcelas: parcelas,
          parcela_atual: i
        });

        // Este preenche visualmente na tela de Cartoes antiga
        insertsComprasCartao.push({
          user_id: user!.id,
          descricao: desc,
          valor: valorParcela,
          data: currentCompra.toISOString().slice(0, 10),
          categoria: "Lazer/Entretenimento",
          cartao_id: form.cartao_id
        });

        // Avancar 1 mes exato para a prox parcela
        currentCompra.setMonth(currentCompra.getMonth() + 1);
      }

      // NOVO FLUXO -> Vai diretamente pro sistema central de unificação de transactions
      const { error: tError } = await supabase.from("transactions").insert(insertsTransactions);
      if (tError) throw tError;

      // FLUXO ANTIGO -> Preenche visual legacy para Faturas
      const { error: cError } = await supabase.from("compras_cartao").insert(insertsComprasCartao);
      if (cError) throw cError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["compras_cartao"] });
      toast.success("Compra no cartão agendada com sucesso!");
      navigate(-1);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar compra no cartão")
  });

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-muted/50" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">Nova Fatura/Compra <Sparkles className="h-4 w-4 text-primary" /></h1>
          <p className="text-sm text-muted-foreground leading-tight">Adicione gastos no cartão</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Netflix, Nubank, Uber..." 
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input 
              type="number" step="0.01"
              placeholder="0.00" 
              value={form.valor}
              onChange={e => setForm({...form, valor: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input 
                type="date"
                value={form.data}
                onChange={e => setForm({...form, data: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade de Parcelas</Label>
              <Input 
                type="number" min="1" max="72"
                value={form.parcelas}
                onChange={e => setForm({...form, parcelas: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Qual Cartão?</Label>
            <Select value={form.cartao_id} onValueChange={v => setForm({...form, cartao_id: v})}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> 
                  <SelectValue placeholder="Selecione o Cartão" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {cartoes.length === 0 && <span className="p-2 text-sm">Nenhum cartão cadastrado.</span>}
                {cartoes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full mt-4 h-12" 
            onClick={() => saveExpense.mutate()} 
            disabled={saveExpense.isPending}
          >
            {saveExpense.isPending ? "Processando..." : "Confirmar Lançamento no Cartão"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
