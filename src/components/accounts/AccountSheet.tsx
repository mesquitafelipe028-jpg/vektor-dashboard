import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { queryKeys } from "@/lib/queryKeys";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, FileText, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, Trash2, RefreshCw, Sparkles, Wallet,
} from "lucide-react";
import {
  type ImportedTransaction,
  parseSpreadsheet,
  parsePDF,
  parseImage,
} from "@/lib/statement-parser";
import { formatCurrency, formatDate, expenseCategories } from "@/lib/utils";
import { getBankById } from "@/lib/banks";

interface AccountSheetProps {
  account: {
    id: string;
    nome: string;
    tipo: string;
    banco_id?: string | null;
    saldo?: number;
    classificacao?: string;
  } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AccountSheet({ account, open, onOpenChange }: AccountSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const bank = getBankById(account?.banco_id ?? null);

  // ── Estado de importação ──
  const [step, setStep] = useState<"idle" | "review" | "done">("idle");
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const resetImport = () => {
    setStep("idle");
    setTransactions([]);
    setImportedCount(0);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(resetImport, 300);
  };

  // ── Upload e parse ──
  const handleFileUpload = useCallback(async (file: File) => {
    if (!account || !user) return;
    setIsParsing(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let parsed: ImportedTransaction[] = [];
      if (ext === "csv" || ext === "txt" || ext === "xlsx" || ext === "xls") {
        const res = await parseSpreadsheet(file);
        parsed = res.transactions;
      } else if (ext === "pdf") {
        const res = await parsePDF(file);
        parsed = res.transactions;
      } else if (["png", "jpg", "jpeg"].includes(ext ?? "")) {
        toast.info("Lendo a imagem... (pode demorar alguns segundos).");
        const res = await parseImage(file);
        parsed = res.transactions;
      } else {
        toast.error("Formato não suportado. Use CSV, Excel, PDF ou imagem.");
        return;
      }

      if (parsed.length === 0) {
        toast.error("Nenhuma transação identificada. Verifique o formato do arquivo.");
        return;
      }

      // Detectar duplicatas na conta escolhida
      const dates = parsed.map((t) => new Date(t.data).getTime()).filter((t) => !isNaN(t));
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        minDate.setDate(minDate.getDate() - 3);
        const maxDate = new Date(Math.max(...dates));
        maxDate.setDate(maxDate.getDate() + 3);

        const { data: existing } = await supabase
          .from("transactions")
          .select("description, amount, date")
          .eq("user_id", user.id)
          .eq("account_id", account.id)
          .gte("date", minDate.toISOString().split("T")[0])
          .lte("date", maxDate.toISOString().split("T")[0]);

        if (existing && existing.length > 0) {
          parsed = parsed.map((t) => {
            const dup = existing.some(
              (e) =>
                Math.abs(Number(e.amount) - t.valor) < 0.01 &&
                Math.abs(new Date(e.date).getTime() - new Date(t.data).getTime()) <= 86400000 * 3
            );
            return { ...t, isDuplicate: dup, selected: !dup };
          });
        }
      }

      setTransactions(parsed);
      setStep("review");
      toast.success(`${parsed.length} transações identificadas!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setIsParsing(false);
    }
  }, [account, user]);

  // ── Helpers de edição ──
  const toggleSelect = (id: string) =>
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));

  const updateTransaction = (id: string, field: keyof ImportedTransaction, value: string) =>
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const deleteTransaction = (id: string) =>
    setTransactions((prev) => prev.filter((t) => t.id !== id));

  // ── Importar selecionadas ──
  const handleImport = async () => {
    if (!account || !user) return;
    const toImport = transactions.filter((t) => t.selected);
    if (toImport.length === 0) {
      toast.error("Selecione ao menos uma transação.");
      return;
    }
    setImporting(true);
    try {
      const inserts = toImport.map((t) => ({
        user_id: user.id,
        description: t.descricao,
        amount: t.valor,
        date: t.data,
        category: t.categoria,
        status: "confirmed",
        account_id: account.id,
        type: t.tipo === "receita" ? "income" : "expense",
        tipo_conta: account.classificacao || "pessoal",
        numero_parcelas: t.numero_parcelas || null,
        parcela_atual: t.parcela_atual || null,
      }));
      const { error } = await supabase.from("transactions").insert(inserts);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: queryKeys.transactions(user.id) });
      qc.invalidateQueries({ queryKey: queryKeys.accounts(user.id) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });

      setImportedCount(toImport.length);
      setStep("done");
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (!account) return null;

  const selectedCount = transactions.filter((t) => t.selected).length;
  const totalReceitas = transactions
    .filter((t) => t.selected && t.tipo === "receita")
    .reduce((s, t) => s + t.valor, 0);
  const totalDespesas = transactions
    .filter((t) => t.selected && t.tipo === "despesa")
    .reduce((s, t) => s + t.valor, 0);

  // Cor do banco para o header
  const headerBg = bank
    ? `linear-gradient(135deg, ${bank.color}cc 0%, ${bank.color}22 100%)`
    : "linear-gradient(135deg, #1e3a5fcc 0%, #070d1a22 100%)";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`${
          isMobile ? "h-[92dvh] rounded-t-2xl" : "w-full max-w-2xl"
        } p-0 overflow-hidden flex flex-col`}
      >
        {/* ── Header ── */}
        <div
          className="relative px-6 pt-6 pb-5 shrink-0"
          style={{ background: headerBg }}
        >
          <SheetHeader>
            <div className="flex items-center gap-3">
              {bank ? (
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: bank.color, color: bank.textColor }}
                >
                  {bank.initials}
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-300" />
                </div>
              )}
              <div>
                <SheetTitle className="text-lg leading-tight">{account.nome}</SheetTitle>
                <p className="text-xs text-muted-foreground capitalize">
                  {account.tipo === "banco"
                    ? "Conta bancária"
                    : account.tipo === "digital"
                    ? "Conta digital"
                    : account.tipo === "carteira"
                    ? "Carteira"
                    : account.tipo === "investimento"
                    ? "Investimento"
                    : account.tipo}{" "}
                  · {account.classificacao === "mei" ? "MEI" : "Pessoal"}
                </p>
              </div>
            </div>
            {account.saldo !== undefined && (
              <div className="mt-3">
                <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60">
                  Saldo atual
                </p>
                <p
                  className={`text-3xl font-black tracking-tight ${
                    (account.saldo ?? 0) < 0 ? "text-red-400" : ""
                  }`}
                >
                  {formatCurrency(account.saldo ?? 0)}
                </p>
              </div>
            )}
          </SheetHeader>
        </div>

        {/* ── Conteúdo scrollável ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Step: idle — zona de upload */}
          {step === "idle" && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Importar Extrato
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Importe o extrato de <strong>{account.nome}</strong> em CSV, Excel, PDF ou imagem.
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isParsing
                    ? "opacity-50 pointer-events-none"
                    : "hover:border-primary/50 hover:bg-primary/5"
                }`}
                onClick={() => document.getElementById("account-sheet-file-input")?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileUpload(f);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className={`h-7 w-7 text-primary ${isParsing ? "animate-bounce" : ""}`} />
                </div>
                <h3 className="font-semibold text-base mb-1">
                  {isParsing ? "Processando arquivo..." : "Arraste seu extrato aqui"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  Suportamos <strong>CSV, Excel, PDF e imagens (JPG/PNG)</strong>
                </p>
                <Button variant="outline" size="sm" disabled={isParsing}>
                  <FileText className="h-4 w-4 mr-2" /> Selecionar Arquivo
                </Button>
                <input
                  id="account-sheet-file-input"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </div>

              {/* Dicas por banco */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Como exportar o extrato:</p>
                <p>🟣 <strong>Nubank:</strong> Perfil → Extratos e Cobranças → Exportar CSV</p>
                <p>🔵 <strong>Itaú:</strong> Conta Corrente → Extrato → Exportar CSV/Excel</p>
                <p>🟢 <strong>Inter:</strong> Extrato → Exportar → Planilha (CSV)</p>
                <p>🔶 <strong>Bradesco / BB:</strong> Extrato → Salvar → CSV ou PDF</p>
                <p className="mt-2 italic">
                  Dica: CSV é o mais confiável. Use PDF ou imagem se não tiver CSV disponível.
                </p>
              </div>
            </div>
          )}

          {/* Step: review */}
          {step === "review" && (
            <div className="p-6 space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Selecionadas</p>
                  <p className="font-bold text-lg">{selectedCount}</p>
                </div>
                <div className="rounded-lg border bg-emerald-500/5 p-3 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Receitas</p>
                  <p className="font-bold text-sm text-emerald-500">{formatCurrency(totalReceitas)}</p>
                </div>
                <div className="rounded-lg border bg-destructive/5 p-3 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Despesas</p>
                  <p className="font-bold text-sm text-destructive">{formatCurrency(totalDespesas)}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("idle"); setTransactions([]); }}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Trocar arquivo
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={selectedCount === 0 || importing}
                  onClick={handleImport}
                >
                  {importing
                    ? "Importando..."
                    : `Importar ${selectedCount} transaç${selectedCount === 1 ? "ão" : "ões"}`}
                </Button>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {transactions.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.008 }}
                    className={`rounded-lg border p-3 transition-colors ${
                      t.selected ? "bg-card" : "bg-muted/30 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={t.selected}
                        onCheckedChange={() => toggleSelect(t.id)}
                        className="mt-0.5"
                      />
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          t.tipo === "receita" ? "bg-emerald-500/10" : "bg-destructive/10"
                        }`}
                      >
                        {t.tipo === "receita" ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={t.descricao}
                            onChange={(e) => updateTransaction(t.id, "descricao", e.target.value)}
                            className="h-7 text-xs px-2 bg-transparent flex-1"
                          />
                          <span
                            className={`font-bold text-sm shrink-0 ${
                              t.tipo === "receita" ? "text-emerald-500" : "text-destructive"
                            }`}
                          >
                            {t.tipo === "receita" ? "+" : "-"}{formatCurrency(t.valor)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={t.data}
                            onChange={(e) => updateTransaction(t.id, "data", e.target.value)}
                            className="h-6 text-[10px] w-[105px] px-1 bg-transparent"
                          />
                          <Select
                            value={t.categoria}
                            onValueChange={(v) => updateTransaction(t.id, "categoria", v)}
                          >
                            <SelectTrigger className="h-6 text-[10px] flex-1">
                              <SelectValue placeholder="Categoria..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {expenseCategories.map((c) => (
                                <SelectItem key={c} value={c} className="text-xs">
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {t.isDuplicate && (
                            <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                              <AlertTriangle className="h-2.5 w-2.5" /> Dup?
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => deleteTransaction(t.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">Importação Concluída!</h3>
              <p className="text-sm text-muted-foreground">
                <strong>{importedCount}</strong> transações importadas para{" "}
                <strong>{account.nome}</strong>.
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" size="sm" onClick={resetImport}>
                  Importar Outro Arquivo
                </Button>
                <Button size="sm" onClick={() => handleClose(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
