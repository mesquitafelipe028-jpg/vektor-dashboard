import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, AlertTriangle, Check, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

const LIMITE_MEI = 81000;

export default function Taxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [competencia, setCompetencia] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState("71.60");

  const { data: impostos = [], isLoading } = useQuery({
    queryKey: ["impostos_mei"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impostos_mei")
        .select("*")
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentYear = new Date().getFullYear().toString();
  const faturamentoAnual = receitas
    .filter((r) => r.data.startsWith(currentYear))
    .reduce((s, r) => s + r.valor, 0);
  const percentLimit = Math.min((faturamentoAnual / LIMITE_MEI) * 100, 100);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("impostos_mei").insert({
        competencia,
        vencimento,
        valor: parseFloat(valor),
        user_id: user!.id,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostos_mei"] });
      toast.success("Guia DAS adicionada");
      setOpen(false);
      setCompetencia("");
      setVencimento("");
      setValor("71.60");
    },
    onError: () => toast.error("Erro ao adicionar guia"),
  });

  const togglePagoMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "pago" ? "pendente" : "pago";
      const { error } = await supabase
        .from("impostos_mei")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impostos_mei"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const dasValue = impostos.length > 0 ? impostos[0].valor : 71.60;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Impostos MEI</h1>
          <p className="text-muted-foreground text-sm">Controle do DAS e limite de faturamento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Guia</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Guia DAS</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Competência</Label>
                <Input placeholder="Ex: Março/2026" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!competencia || !vencimento || createMutation.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">DAS Mensal</p>
                <p className="text-2xl font-bold font-heading">{formatCurrency(dasValue)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Valor fixo mensal para MEI (Comércio e Serviços)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`h-6 w-6 ${percentLimit > 80 ? "text-destructive" : "text-accent"}`} />
              <div>
                <p className="text-sm text-muted-foreground">Limite Anual MEI</p>
                <p className="text-2xl font-bold font-heading">
                  {formatCurrency(faturamentoAnual)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(LIMITE_MEI)}</span>
                </p>
              </div>
            </div>
            <Progress value={percentLimit} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{percentLimit.toFixed(1)}% do limite utilizado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Controle do DAS</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : impostos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma guia cadastrada. Clique em "Nova Guia" para começar.</p>
          ) : (
            <div className="space-y-3">
              {impostos.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium">{m.competencia}</span>
                    <p className="text-xs text-muted-foreground">Vence: {new Date(m.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatCurrency(m.valor)}</span>
                    <Badge
                      variant={m.status === "pago" ? "default" : m.status === "pendente" ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() => togglePagoMutation.mutate({ id: m.id, currentStatus: m.status })}
                    >
                      {m.status === "pago" && <Check className="mr-1 h-3 w-3" />}
                      {m.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
