import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BankLogo, banks } from "@/lib/banks";
import {
  Plus, Trash2, Pencil, Banknote, Smartphone, PiggyBank, CreditCard,
  TrendingUp, Wallet, Building2, CircleDollarSign, Landmark, ShieldCheck,
  Gem, Star, Briefcase, Heart, Zap, LucideIcon,
} from "lucide-react";
import type { AccountType, AccountClassification, ContaFinanceiraInsert } from "@/types/accounts";

const accountTypeOptions: { value: AccountType; label: string; icon: LucideIcon }[] = [
  { value: "banco", label: "Conta bancária", icon: Landmark },
  { value: "digital", label: "Conta digital", icon: Smartphone },
  { value: "carteira", label: "Carteira / dinheiro", icon: PiggyBank },
  { value: "cartao", label: "Cartão de crédito", icon: CreditCard },
  { value: "investimento", label: "Conta investimento", icon: TrendingUp },
];

const iconOptions: { value: string; icon: LucideIcon }[] = [
  { value: "wallet", icon: Wallet },
  { value: "banknote", icon: Banknote },
  { value: "landmark", icon: Landmark },
  { value: "credit-card", icon: CreditCard },
  { value: "smartphone", icon: Smartphone },
  { value: "piggy-bank", icon: PiggyBank },
  { value: "trending-up", icon: TrendingUp },
  { value: "building", icon: Building2 },
  { value: "dollar", icon: CircleDollarSign },
  { value: "shield", icon: ShieldCheck },
  { value: "gem", icon: Gem },
  { value: "star", icon: Star },
  { value: "briefcase", icon: Briefcase },
  { value: "heart", icon: Heart },
  { value: "zap", icon: Zap },
];

const colorOptions = [
  "#8A05BE", "#EC7000", "#003882", "#CC092F", "#EC0000",
  "#005CA9", "#FF7A00", "#242424", "#009EE3", "#00A859",
  "#6366F1", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6",
];

function getIconComponent(iconName: string): LucideIcon {
  return iconOptions.find((i) => i.value === iconName)?.icon ?? Wallet;
}

export default function Accounts() {
  const { user } = useAuth();
  const { accounts, isLoading, createAccount, deleteAccount } = useAccounts();
  const [open, setOpen] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<AccountType>("banco");
  const [bancoId, setBancoId] = useState<string>("");
  const [saldo, setSaldo] = useState("");
  const [cor, setCor] = useState(colorOptions[0]);
  const [icone, setIcone] = useState("wallet");
  const [classificacao, setClassificacao] = useState<AccountClassification>("pessoal");

  const showBankSelector = tipo === "banco" || tipo === "digital";

  const resetForm = () => {
    setNome("");
    setTipo("banco");
    setBancoId("");
    setSaldo("");
    setCor(colorOptions[0]);
    setIcone("wallet");
    setClassificacao("pessoal");
  };

  const handleCreate = async () => {
    if (!user || !nome.trim()) return;

    const payload: ContaFinanceiraInsert = {
      user_id: user.id,
      nome: nome.trim(),
      tipo,
      banco_id: showBankSelector && bancoId ? bancoId : null,
      saldo: parseFloat(saldo) || 0,
      cor,
      icone,
      classificacao,
    };

    try {
      await createAccount.mutateAsync(payload);
      toast.success("Conta criada com sucesso!");
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Erro ao criar conta. Verifique se a tabela existe no Supabase.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id);
      toast.success("Conta removida.");
    } catch {
      toast.error("Erro ao remover conta.");
    }
  };

  const SelectedIcon = getIconComponent(icone);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-1 h-4 w-4" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Conta Financeira</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome da conta *</Label>
                <Input
                  placeholder="Ex: Nubank, Carteira, Conta MEI"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypeOptions.map((t) => {
                    const Icon = t.icon;
                    const selected = tipo === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTipo(t.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all text-sm ${
                          selected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banco */}
              {showBankSelector && (
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Select value={bancoId} onValueChange={setBancoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco">
                        {bancoId && (
                          <span className="flex items-center gap-2">
                            <BankLogo bankId={bancoId} size={20} />
                            {banks.find((b) => b.id === bancoId)?.name}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {banks.filter((b) => b.id !== "outro").map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          <span className="flex items-center gap-2">
                            <BankLogo bankId={bank.id} size={20} />
                            {bank.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Saldo inicial */}
              <div className="space-y-2">
                <Label>Saldo inicial</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  step="0.01"
                />
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <Label>Cor da conta</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        cor === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Ícone */}
              <div className="space-y-2">
                <Label>Ícone da conta</Label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((opt) => {
                    const Icon = opt.icon;
                    const selected = icone === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setIcone(opt.value)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Classificação */}
              <div className="space-y-2">
                <Label>Essa conta pertence a:</Label>
                <RadioGroup value={classificacao} onValueChange={(v) => setClassificacao(v as AccountClassification)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pessoal" id="pessoal" />
                    <Label htmlFor="pessoal" className="font-normal">Pessoal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mei" id="mei" />
                    <Label htmlFor="mei" className="font-normal">MEI</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handleCreate}
                disabled={!nome.trim() || createAccount.isPending}
                className="w-full"
              >
                {createAccount.isPending ? "Salvando..." : "Criar Conta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma conta cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira conta financeira para começar a controlar seus saldos.
            </p>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Criar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = getIconComponent(account.icone);
            const typeLabel = accountTypeOptions.find((t) => t.value === account.tipo)?.label ?? account.tipo;
            return (
              <Card key={account.id} className="group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: account.cor }} />
                <CardHeader className="pb-2 flex-row items-center gap-3 space-y-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: account.cor + "20", color: account.cor }}
                  >
                    {account.banco_id ? (
                      <BankLogo bankId={account.banco_id} size={28} />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{account.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {typeLabel}
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted">
                        {account.classificacao === "mei" ? "MEI" : "Pessoal"}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(account.saldo)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
