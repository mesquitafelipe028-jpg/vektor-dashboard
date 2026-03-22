import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogoVektor } from "@/components/branding/LogoVektor";
import {
  Sparkles, Wallet, Store, Users, ArrowRight, ArrowLeft,
  Banknote, CreditCard, Smartphone, PiggyBank,
  TrendingUp, TrendingDown, Check, CalendarCheck,
  Upload, FileText, Zap, ShieldCheck, Star,
} from "lucide-react";
import { expenseCategories, revenueCategories } from "@/lib/categories";
import { 
  type ImportedTransaction, 
  parseSpreadsheet, 
  parsePDF 
} from "@/lib/statement-parser";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const TOTAL_STEPS = 5;

type Goal = "pessoal" | "mei" | "clientes";

const goalOptions = [
  { value: "pessoal" as Goal, label: "Controlar finanças pessoais", icon: Wallet, desc: "Organize receitas, despesas e metas pessoais" },
  { value: "mei" as Goal, label: "Controlar MEI ou negócio", icon: Store, desc: "Gerencie seu negócio com controle fiscal" },
  { value: "clientes" as Goal, label: "Controlar clientes e cobranças", icon: Users, desc: "Cadastre clientes e acompanhe pagamentos" },
];

const accountTypes = [
  { value: "banco", label: "Conta bancária", icon: Banknote },
  { value: "carteira", label: "Carteira / dinheiro", icon: PiggyBank },
  { value: "digital", label: "Conta digital", icon: Smartphone },
  { value: "cartao", label: "Cartão de crédito", icon: CreditCard },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { updatePreference } = useUserPreferences();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Goal
  const [goal, setGoal] = useState<Goal | "">("");

  // Step 2: Magic Import
  const [importedTx, setImportedTx] = useState<ImportedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Step 3: Account
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("banco");
  const [initialBalance, setInitialBalance] = useState("");

  // Step 4: Premium Strategy
  const [isPro, setIsPro] = useState(false);

  const [saving, setSaving] = useState(false);

  const showClientStep = goal === "mei" || goal === "clientes";
  // We keep 5 steps: Welcome -> Import -> Account -> Premium -> Finish
  const progressPercent = (step / TOTAL_STEPS) * 100;

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setIsParsing(true);
    try {
      let parsed: ImportedTransaction[] = [];
      if (ext === "csv" || ext === "txt" || ext === "xlsx" || ext === "xls") {
        parsed = await parseSpreadsheet(file);
      } else if (ext === "pdf") {
        parsed = await parsePDF(file);
      } else {
        toast.error("Formato não suportado.");
        return;
      }

      if (parsed.length > 0) {
        setImportedTx(parsed);
        // Sugerir nome da conta baseado no arquivo se possível
        if (!accountName) setAccountName(file.name.split(".")[0]);
        toast.success(`Mágica feita! ${parsed.length} transações encontradas.`);
        goNext();
      } else {
        toast.error("Nenhuma transação encontrada no arquivo.");
      }
    } catch (err) {
      toast.error("Erro ao ler arquivo.");
    } finally {
      setIsParsing(false);
    }
  }, [accountName]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return goal !== "";
      case 2: return true; // Can skip import
      case 3: return accountName.trim().length > 0;
      default: return true;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Create Account
      const { data: accData } = await supabase.from("contas_financeiras").insert({
        user_id: user.id,
        nome: accountName || "Conta Principal",
        tipo: accountType,
        saldo: parseFloat(initialBalance) || 0,
        classificacao: goal === "mei" ? "pj" : "pf",
      }).select().single();

      // 2. Save Imported Transactions in the unified table
      if (accData && importedTx.length > 0) {
        const transactionsToInsert = importedTx.map(t => ({
          user_id: user.id,
          description: t.descricao,
          amount: t.valor,
          date: t.data,
          category: t.categoria,
          account_id: accData.id,
          status: "confirmed",
          type: t.tipo === "receita" ? "income" : "expense"
        }));

        const { error } = await supabase.from("transactions").insert(transactionsToInsert);
        if (error) throw error;
      }

      // 3. Mark Premium if selected
      if (isPro) {
        await supabase.from("assinaturas").insert({
          user_id: user.id,
          plano: "pro_mensal",
          status: "ativo"
        });
      }

      localStorage.setItem(`vektor_onboarding_done_${user.id}`, "true");
      localStorage.setItem(`vektor_goal_${user.id}`, goal);
      updatePreference("onboarding_completed", true);
      toast.success("Tudo pronto! Bem-vindo ao Vektor 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!user) return;
    localStorage.setItem(`vektor_onboarding_done_${user.id}`, "true");
    updatePreference("onboarding_completed", true);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <LogoVektor size="sm" textClassName="text-muted-foreground" />
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
          Pular Onboarding
        </Button>
      </header>

      <div className="px-4 sm:px-6 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Passo {step} de {TOTAL_STEPS}
          </span>
          <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 font-geist">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 1 && <StepWelcome goal={goal} setGoal={setGoal} />}
              {step === 2 && (
                <StepMagicImport 
                  onUpload={handleFileUpload} 
                  isParsing={isParsing} 
                  txCount={importedTx.length}
                />
              )}
              {step === 3 && (
                <StepAccount
                  accountName={accountName}
                  setAccountName={setAccountName}
                  accountType={accountType}
                  setAccountType={setAccountType}
                  initialBalance={initialBalance}
                  setInitialBalance={setInitialBalance}
                />
              )}
              {step === 4 && <StepPremium isPro={isPro} setIsPro={setIsPro} />}
              {step === 5 && <StepFinish />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="px-4 sm:px-6 pb-6 pt-2 max-w-lg mx-auto w-full">
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} disabled={!canAdvance()} className="flex-1 bg-primary text-white hover:bg-primary/90">
              {step === 2 && importedTx.length === 0 ? "Pular Importação" : "Continuar"} 
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Configurando tudo..." : "Começar Agora"} <Check className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ─── Step Components ─── */

function StepWelcome({ goal, setGoal }: { goal: string; setGoal: (g: Goal) => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Bem-vindo ao Vektor</h1>
        <p className="text-muted-foreground">Qual seu objetivo principal?</p>
      </div>
      <div className="space-y-3 text-left">
        {goalOptions.map((opt) => {
          const Icon = opt.icon;
          const selected = goal === opt.value;
          return (
            <Card
              key={opt.value}
              className={`cursor-pointer transition-all border-2 ${
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => setGoal(opt.value)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-2.5 rounded-xl ${selected ? "bg-primary/15" : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {selected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function StepMagicImport({ onUpload, isParsing, txCount }: { onUpload: (f: File) => void; isParsing: boolean; txCount: number }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">A Mágica do Vektor</h2>
        <p className="text-sm text-muted-foreground">Importe seu extrato (PDF, CSV ou Excel) e nós organizamos tudo em segundos.</p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-3xl p-10 transition-all text-center ${
          dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-card/50"
        } ${txCount > 0 ? "border-emerald-500/50 bg-emerald-50/50" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isParsing ? (
          <div className="space-y-4 py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm font-medium animate-pulse text-primary">Lendo seu arquivo...</p>
          </div>
        ) : txCount > 0 ? (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700">{txCount} Transações Encontradas!</p>
              <p className="text-sm text-muted-foreground">Tudo pronto para seguir.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Arraste seu arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">Ou clique para selecionar</p>
            </div>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => e.target.files && onUpload(e.target.files[0])}
              accept=".pdf,.csv,.xlsx,.xls,.txt"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-100">
          <FileText className="h-5 w-5 text-orange-600" />
          <div className="text-[10px] leading-tight text-orange-800">
            <p className="font-bold">PDF Bancário</p>
            <p>Nubank, Itaú, Bradesco...</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div className="text-[10px] leading-tight text-blue-800">
            <p className="font-bold">Privacidade Total</p>
            <p>Seus dados são criptografados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepAccount({
  accountName, setAccountName, accountType, setAccountType, initialBalance, setInitialBalance,
}: {
  accountName: string; setAccountName: (v: string) => void;
  accountType: string; setAccountType: (v: string) => void;
  initialBalance: string; setInitialBalance: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/15 mx-auto mb-3">
          <Banknote className="h-7 w-7 text-secondary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Configurações Finais</h2>
        <p className="text-sm text-muted-foreground">Dê um nome para sua conta e defina o saldo inicial.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da conta</Label>
          <Input
            placeholder="Ex: Nubank, Carteira, Caixa MEI"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            maxLength={50}
            className="h-12 text-lg font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de conta</Label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypes.map((t) => {
              const Icon = t.icon;
              const selected = accountType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setAccountType(t.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                    selected
                      ? "border-primary bg-primary/5 text-foreground ring-4 ring-primary/5"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${selected ? "text-primary" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo inicial (R$)</Label>
          <Input
            type="number"
            placeholder="0,00"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            min="0"
            step="0.01"
            className="h-12 text-lg font-medium"
          />
          <p className="text-[10px] text-muted-foreground">O saldo será somado às transações importadas.</p>
        </div>
      </div>
    </div>
  );
}

function StepPremium({ isPro, setIsPro }: { isPro: boolean; setIsPro: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mx-auto mb-3">
          <Star className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground font-geist">Vektor PRO</h2>
        <p className="text-sm text-muted-foreground">Acelere seu crescimento com ferramentas profissionais.</p>
      </div>

      <div className="space-y-3">
        {[
          { icon: Zap, label: "Importação de PDF Ilimitada", desc: "Processamento ultra-rápido de extratos." },
          { icon: FileText, label: "Relatórios para Contador (DRE)", desc: "Exportação em 1-clique para seu contador." },
          { icon: Users, label: "Gestão de Clientes Avançada", desc: "Acompanhe cobranças e inadimplência." },
        ].map((feat, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50">
            <div className="p-2 rounded-xl bg-primary/5 shrink-0 h-fit">
              <feat.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{feat.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Card 
        className={`cursor-pointer transition-all border-2 overflow-hidden ${
          isPro ? "border-amber-500 bg-amber-50 ring-4 ring-amber-500/10 shadow-lg" : "border-border hover:border-amber-400/50"
        }`}
        onClick={() => setIsPro(!isPro)}
      >
        <div className="bg-amber-500 py-1.5 px-3">
          <p className="text-center text-[10px] uppercase font-black tracking-[0.2em] text-white">Oferta de Boas-Vindas</p>
        </div>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-amber-900 leading-none">TESTAR GRÁTIS</h3>
            <p className="text-xs text-amber-800/70 font-medium">14 dias de acesso total, sem compromisso.</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
            {isPro && <div className="w-3 h-3 rounded-full bg-amber-500" />}
          </div>
        </CardContent>
      </Card>
      
      {!isPro && (
        <p className="text-center text-[10px] text-muted-foreground px-4">
          Você pode continuar com a versão gratuita com limites básicos de importação.
        </p>
      )}
    </div>
  );
}

function StepFinish() {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/15 mx-auto">
        <Check className="h-10 w-10 text-secondary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Seu sistema está pronto! 🎉</h2>
        <p className="text-muted-foreground">
          Tudo configurado. Agora você pode gerenciar suas finanças com o Vektor.
        </p>
      </div>
    </div>
  );
}
