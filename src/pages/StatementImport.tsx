import { useState, useCallback } from "react";
import { 
  type ImportedTransaction, 
  parseSpreadsheet, 
  parsePDF 
} from "@/lib/statement-parser";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, FileText, CheckCircle, AlertTriangle, Sparkles,
  TrendingUp, TrendingDown, Trash2, RefreshCw, Building2,
} from "lucide-react";
import { formatCurrency, formatDate, expenseCategories } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAccounts } from "@/hooks/useAccounts";
import { queryKeys } from "@/lib/queryKeys";


// UI component for Statement Import

// ── Component ───────────────────────────────────────────────────

export default function StatementImport() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { accounts } = useAccounts();

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsed: ImportedTransaction[] = [];

    try {
      if (ext === "csv" || ext === "txt" || ext === "xlsx" || ext === "xls") {
        parsed = await parseSpreadsheet(file);
      } else if (ext === "pdf") {
        parsed = await parsePDF(file);
      } else {
        toast.error("Formato de arquivo não suportado.");
        return;
      }

      if (parsed.length === 0) {
        toast.error("Não foi possível identificar transações no arquivo. Verifique o formato.");
        return;
      }

      setTransactions(parsed);
      setStep("review");
      toast.success(`${parsed.length} transações identificadas!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o arquivo.");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const toggleSelect = (id: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const updateTransaction = (id: string, field: keyof ImportedTransaction, value: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const importSelected = useMutation({
    mutationFn: async () => {
      const toImport = transactions.filter((t) => t.selected);
      if (toImport.length === 0) throw new Error("Selecione ao menos uma transação");
      if (!selectedAccountId) throw new Error("Selecione uma conta para importar");
      if (!user?.id) throw new Error("Usuário não autenticado");

      const account = accounts.find(a => a.id === selectedAccountId);
      const tipoConta = account?.classificacao || "pessoal";

      const transactionsToInsert = toImport.map((t) => ({
        user_id: user.id,
        description: t.descricao,
        amount: t.valor,
        date: t.data,
        category: t.categoria,
        status: "confirmed",
        account_id: selectedAccountId,
        type: t.tipo === "receita" ? "income" : "expense",
        tipo_conta: tipoConta,
      }));

      const { error } = await supabase.from("transactions").insert(transactionsToInsert);
      if (error) throw error;

      return toImport.length;
    },
    onSuccess: (count) => {
      const userId = user?.id;
      qc.invalidateQueries({ queryKey: queryKeys.transactions(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
      setImportedCount(count);
      setStep("done");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCount = transactions.filter((t) => t.selected).length;
  const receitas = transactions.filter((t) => t.selected && t.tipo === "receita");
  const despesas = transactions.filter((t) => t.selected && t.tipo === "despesa");

  // ── Step: Upload ─────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Importação de Extrato
          </h1>
          <p className="text-sm text-muted-foreground">Importe extratos em CSV, Excel ou PDF do seu banco e classifique automaticamente</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div
              className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">Arraste seu extrato aqui</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Suportamos arquivos <strong>CSV, Excel (.xlsx, .xls) e PDF</strong> exportados do seu banco.
              </p>
              <Button variant="outline" className="mt-4">
                <FileText className="mr-2 h-4 w-4" /> Selecionar Arquivo
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Como exportar o extrato do seu banco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>🟣 <strong>Nubank:</strong> Perfil → Extratos e Cobranças → Exportar CSV ou PDF</p>
            <p>🔵 <strong>Itaú:</strong> Conta Corrente → Extrato → Exportar → CSV ou Excel</p>
            <p>🟢 <strong>Inter:</strong> Extrato → Exportar → Planilha (CSV) ou PDF</p>
            <p>🔶 <strong>Bradesco / BB:</strong> Extrato → Salvar → CSV ou PDF</p>
            <p className="mt-4 text-xs italic">Dica: Se o PDF não for lido corretamente, tente exportar em CSV ou Excel, que são formatos mais estruturados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step: Review ─────────────────────────────────────────────
  if (step === "review") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Revisar Transações
            </h1>
            <p className="text-sm text-muted-foreground">
              {transactions.length} transações identificadas — revise antes de importar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="w-full sm:w-64">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-background">
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecionar conta de destino" />
                  </div>
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
            <Button variant="outline" onClick={() => { setStep("upload"); setTransactions([]); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Novo Arquivo
            </Button>
            <Button 
              onClick={() => importSelected.mutate()} 
              disabled={selectedCount === 0 || !selectedAccountId || importSelected.isPending}
            >
              {importSelected.isPending ? "Importando..." : `Importar ${selectedCount} selecionadas`}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Selecionadas</p><p className="font-heading font-bold text-lg">{selectedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Receitas</p><p className="font-heading font-bold text-lg text-emerald-600">{formatCurrency(receitas.reduce((s, t) => s + t.valor, 0))}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Despesas</p><p className="font-heading font-bold text-lg text-destructive">{formatCurrency(despesas.reduce((s, t) => s + t.valor, 0))}</p></CardContent></Card>
        </div>

        {/* Transaction list */}
        <div className="space-y-2">
          {transactions.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01 }}
              className={`rounded-lg border p-3 transition-colors ${t.selected ? "bg-card" : "bg-muted/30 opacity-50"}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={t.selected} onCheckedChange={() => toggleSelect(t.id)} />
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${t.tipo === "receita" ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                  {t.tipo === "receita"
                    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3">
                  <p className="font-medium text-sm truncate col-span-1 sm:col-span-1">{t.descricao}</p>
                  <div className="flex gap-2 items-center">
                    <Select value={t.categoria} onValueChange={(v) => updateTransaction(t.id, "categoria", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {expenseCategories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-[10px] text-muted-foreground">{formatDate(t.data)}</span>
                    <span className={`font-heading font-bold text-sm ${t.tipo === "receita" ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(t.valor)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 ${
                        t.confidence === "high" ? "bg-emerald-500/10 text-emerald-600" :
                        t.confidence === "medium" ? "bg-amber-500/10 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.confidence === "high" ? "✓ Alta" : t.confidence === "medium" ? "~ Média" : "? Baixa"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => deleteTransaction(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Done ───────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="font-heading text-2xl font-bold">Importação Concluída!</h2>
      <p className="text-muted-foreground">{importedCount} transações foram importadas com sucesso para o Vektor.</p>
      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={() => { setStep("upload"); setTransactions([]); }}>
          Importar Outro Arquivo
        </Button>
        <Button onClick={() => window.location.href = "/fluxo-de-caixa"}>
          Ver no Fluxo de Caixa
        </Button>
      </div>
    </div>
  );
}
