import { useState, useMemo } from "react";
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
} from "lucide-react";
import { expenseCategories, revenueCategories } from "@/lib/categories";

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
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [goal, setGoal] = useState<Goal | "">("");

  // Step 2
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("banco");
  const [initialBalance, setInitialBalance] = useState("");

  // Step 3
  const [txType, setTxType] = useState<"receita" | "despesa">("receita");
  const [txValue, setTxValue] = useState("");
  const [txCategory, setTxCategory] = useState("");

  // Step 4
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientChargeType, setClientChargeType] = useState("mensal");
  const [clientValue, setClientValue] = useState("");

  const [saving, setSaving] = useState(false);

  const showClientStep = goal === "mei" || goal === "clientes";
  const effectiveSteps = showClientStep ? TOTAL_STEPS : TOTAL_STEPS - 1;
  const progressPercent = (step / effectiveSteps) * 100;

  const categories = useMemo(
    () => (txType === "receita" ? revenueCategories : expenseCategories),
    [txType]
  );

  const goNext = () => {
    setDirection(1);
    // Skip step 4 if not business
    if (step === 3 && !showClientStep) {
      setStep(5);
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 5 && !showClientStep) {
      setStep(3);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return goal !== "";
      case 2: return accountName.trim().length > 0;
      case 3: return txValue.trim().length > 0 && txCategory !== "";
      case 4: return clientName.trim().length > 0;
      default: return true;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save first transaction
      if (txValue && txCategory) {
        const table = txType === "receita" ? "receitas" : "despesas";
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from(table).insert({
          user_id: user.id,
          descricao: txCategory,
          valor: parseFloat(txValue) || 0,
          data: today,
          categoria: txCategory,
        } as any);
      }

      // Save client if applicable
      if (showClientStep && clientName.trim()) {
        await supabase.from("clientes").insert({
          user_id: user.id,
          nome: clientName.trim(),
          telefone: clientPhone.trim() || null,
        });
      }

      // Mark onboarding done
      localStorage.setItem(`vektor_onboarding_done_${user.id}`, "true");
      localStorage.setItem(`vektor_goal_${user.id}`, goal);

      toast.success("Tudo pronto! Bem-vindo ao Vektor 🎉");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!user) return;
    localStorage.setItem(`vektor_onboarding_done_${user.id}`, "true");
    if (goal) localStorage.setItem(`vektor_goal_${user.id}`, goal);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <LogoVektor size="sm" textClassName="text-muted-foreground" />
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
          Pular
        </Button>
      </header>

      {/* Progress */}
      <div className="px-4 sm:px-6 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Passo {step} de {effectiveSteps}
          </span>
          <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
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
              {step === 1 && (
                <StepWelcome goal={goal} setGoal={setGoal} />
              )}
              {step === 2 && (
                <StepAccount
                  accountName={accountName}
                  setAccountName={setAccountName}
                  accountType={accountType}
                  setAccountType={setAccountType}
                  initialBalance={initialBalance}
                  setInitialBalance={setInitialBalance}
                />
              )}
              {step === 3 && (
                <StepTransaction
                  txType={txType}
                  setTxType={setTxType}
                  txValue={txValue}
                  setTxValue={setTxValue}
                  txCategory={txCategory}
                  setTxCategory={setTxCategory}
                  categories={categories}
                />
              )}
              {step === 4 && showClientStep && (
                <StepClient
                  clientName={clientName}
                  setClientName={setClientName}
                  clientPhone={clientPhone}
                  setClientPhone={setClientPhone}
                  clientChargeType={clientChargeType}
                  setClientChargeType={setClientChargeType}
                  clientValue={clientValue}
                  setClientValue={setClientValue}
                />
              )}
              {step === 5 && (
                <StepFinish />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 sm:px-6 pb-6 pt-2 max-w-lg mx-auto w-full">
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} disabled={!canAdvance()} className="flex-1">
              Continuar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="flex-1">
              {saving ? "Salvando..." : "Ir para o Dashboard"} <Check className="ml-1 h-4 w-4" />
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
        <h2 className="text-xl font-bold text-foreground">Sua primeira conta</h2>
        <p className="text-sm text-muted-foreground">Configure sua conta financeira principal</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome da conta</Label>
          <Input
            placeholder="Ex: Nubank, Carteira, Caixa MEI"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de conta</Label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypes.map((t) => {
              const Icon = t.icon;
              const selected = accountType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setAccountType(t.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all text-sm ${
                    selected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
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
          <Label>Saldo inicial (opcional)</Label>
          <Input
            type="number"
            placeholder="0,00"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
}

function StepTransaction({
  txType, setTxType, txValue, setTxValue, txCategory, setTxCategory, categories,
}: {
  txType: "receita" | "despesa"; setTxType: (v: "receita" | "despesa") => void;
  txValue: string; setTxValue: (v: string) => void;
  txCategory: string; setTxCategory: (v: string) => void;
  categories: { name: string; icon: any; color: string; bg: string }[];
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 mx-auto mb-3">
          <CalendarCheck className="h-7 w-7 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Primeira movimentação</h2>
        <p className="text-sm text-muted-foreground">Registre sua primeira receita ou despesa</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={txType === "receita" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setTxType("receita"); setTxCategory(""); }}
          >
            <TrendingUp className="mr-1 h-4 w-4" /> Receita
          </Button>
          <Button
            variant={txType === "despesa" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setTxType("despesa"); setTxCategory(""); }}
          >
            <TrendingDown className="mr-1 h-4 w-4" /> Despesa
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            placeholder="0,00"
            value={txValue}
            onChange={(e) => setTxValue(e.target.value)}
            min="0.01"
            step="0.01"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {categories.slice(0, 8).map((cat) => {
              const Icon = cat.icon;
              const selected = txCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setTxCategory(cat.name)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left text-xs transition-all ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                  <span className="truncate text-foreground">{cat.name.split("/")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepClient({
  clientName, setClientName, clientPhone, setClientPhone,
  clientChargeType, setClientChargeType, clientValue, setClientValue,
}: {
  clientName: string; setClientName: (v: string) => void;
  clientPhone: string; setClientPhone: (v: string) => void;
  clientChargeType: string; setClientChargeType: (v: string) => void;
  clientValue: string; setClientValue: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Seu primeiro cliente</h2>
        <p className="text-sm text-muted-foreground">Adicione um cliente para acompanhar cobranças</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do cliente</Label>
          <Input
            placeholder="Ex: João Silva"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone (opcional)</Label>
          <Input
            placeholder="(11) 99999-9999"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de cobrança</Label>
          <RadioGroup value={clientChargeType} onValueChange={setClientChargeType}>
            {["mensal", "semanal", "avulso"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`charge-${t}`} />
                <Label htmlFor={`charge-${t}`} className="cursor-pointer capitalize">{t}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>Valor da mensalidade (opcional)</Label>
          <Input
            type="number"
            placeholder="0,00"
            value={clientValue}
            onChange={(e) => setClientValue(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </div>
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
