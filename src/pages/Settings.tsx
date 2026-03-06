import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, Search, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

// CNPJ formatting & validation
function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (str: string, weights: number[]) => {
    const sum = weights.reduce((s, w, i) => s + parseInt(str[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(digits, w1);
  const d2 = calc(digits, w2);

  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
}

interface EmpresaData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_abertura: string;
  cnae_principal: string;
  natureza_juridica: string;
}

const emptyEmpresa: EmpresaData = {
  cnpj: "", razao_social: "", nome_fantasia: "", situacao_cadastral: "",
  data_abertura: "", cnae_principal: "", natureza_juridica: "",
};

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Company state
  const [empresa, setEmpresa] = useState<EmpresaData>(emptyEmpresa);
  const [cnpjInput, setCnpjInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [cnpjFound, setCnpjFound] = useState<boolean | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: savedEmpresa } = useQuery({
    queryKey: ["empresa", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("empresas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setNome(profile.nome);
  }, [profile]);

  useEffect(() => {
    if (savedEmpresa) {
      setEmpresa({
        cnpj: savedEmpresa.cnpj || "",
        razao_social: savedEmpresa.razao_social || "",
        nome_fantasia: savedEmpresa.nome_fantasia || "",
        situacao_cadastral: savedEmpresa.situacao_cadastral || "",
        data_abertura: savedEmpresa.data_abertura || "",
        cnae_principal: savedEmpresa.cnae_principal || "",
        natureza_juridica: savedEmpresa.natureza_juridica || "",
      });
      setCnpjInput(formatCnpj(savedEmpresa.cnpj || ""));
      setCnpjFound(true);
    }
  }, [savedEmpresa]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ nome })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado");
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const saveEmpresa = useMutation({
    mutationFn: async () => {
      const payload = { ...empresa, user_id: user!.id };
      if (savedEmpresa) {
        const { error } = await (supabase as any)
          .from("empresas")
          .update(payload)
          .eq("id", savedEmpresa.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("empresas")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresa"] });
      toast.success("Dados da empresa salvos!");
    },
    onError: () => toast.error("Erro ao salvar dados da empresa."),
  });

  const buscarCnpj = async () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (!isValidCnpj(digits)) {
      toast.error("CNPJ inválido. Verifique o número digitado.");
      return;
    }

    setSearching(true);
    setCnpjFound(null);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!resp.ok) {
        setCnpjFound(false);
        toast.error("Não foi possível encontrar dados para este CNPJ. Verifique o número digitado.");
        return;
      }
      const data = await resp.json();
      const newEmpresa: EmpresaData = {
        cnpj: digits,
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        situacao_cadastral: data.descricao_situacao_cadastral || "",
        data_abertura: data.data_inicio_atividade || "",
        cnae_principal: data.cnae_fiscal_descricao
          ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`
          : String(data.cnae_fiscal || ""),
        natureza_juridica: data.natureza_juridica || "",
      };
      setEmpresa(newEmpresa);
      setCnpjFound(true);
      toast.success("Dados do CNPJ encontrados!");
    } catch {
      setCnpjFound(false);
      toast.error("Erro ao consultar CNPJ. Tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha");
    } else {
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const clearData = useMutation({
    mutationFn: async () => {
      const tables = ["receitas", "despesas", "clientes", "categorias", "impostos_mei", "empresas", "metas_financeiras"] as const;
      for (const table of tables) {
        const { error } = await (supabase as any).from(table).delete().eq("user_id", user!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEmpresa(emptyEmpresa);
      setCnpjInput("");
      setCnpjFound(null);
      setResetDialogOpen(false);
      setConfirmText("");
      toast.success("Todos os dados foram apagados. Você está começando do zero!");
    },
    onError: () => toast.error("Erro ao limpar dados. Tente novamente."),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie seus dados pessoais e do negócio</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Dados Pessoais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={user?.email ?? ""} disabled className="opacity-70" />
            </div>
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* Company / CNPJ Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* CNPJ Search */}
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1"
                />
                <Button
                  onClick={buscarCnpj}
                  disabled={searching || cnpjInput.replace(/\D/g, "").length < 14}
                  variant="secondary"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {cnpjFound === true && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> CNPJ encontrado
                </div>
              )}
              {cnpjFound === false && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" /> Não foi possível encontrar dados para este CNPJ
                </div>
              )}
            </div>

            <Separator />

            {/* Company fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input
                  value={empresa.razao_social}
                  onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={empresa.nome_fantasia}
                  onChange={(e) => setEmpresa({ ...empresa, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Situação Cadastral</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={empresa.situacao_cadastral}
                    onChange={(e) => setEmpresa({ ...empresa, situacao_cadastral: e.target.value })}
                    placeholder="Ex: Ativa"
                    className="flex-1"
                  />
                  {empresa.situacao_cadastral && (
                    <Badge
                      variant={empresa.situacao_cadastral.toLowerCase().includes("ativa") ? "default" : "destructive"}
                      className="shrink-0"
                    >
                      {empresa.situacao_cadastral}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Abertura</Label>
                <Input
                  value={empresa.data_abertura}
                  onChange={(e) => setEmpresa({ ...empresa, data_abertura: e.target.value })}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNAE Principal</Label>
                <Input
                  value={empresa.cnae_principal}
                  onChange={(e) => setEmpresa({ ...empresa, cnae_principal: e.target.value })}
                  placeholder="Código e descrição do CNAE"
                />
              </div>
              <div className="space-y-2">
                <Label>Natureza Jurídica</Label>
                <Input
                  value={empresa.natureza_juridica}
                  onChange={(e) => setEmpresa({ ...empresa, natureza_juridica: e.target.value })}
                  placeholder="Ex: Empresário Individual"
                />
              </div>
            </div>

            <Button
              onClick={() => saveEmpresa.mutate()}
              disabled={saveEmpresa.isPending || !empresa.cnpj}
            >
              {saveEmpresa.isPending ? "Salvando..." : savedEmpresa ? "Atualizar Empresa" : "Salvar Empresa"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input id="current-password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={changePassword}>Alterar senha</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg text-destructive">Zona de Perigo</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Começar do Zero */}
          <div>
            <p className="text-sm font-medium mb-1">Começar do Zero</p>
            <p className="text-sm text-muted-foreground mb-3">
              Apaga todas as receitas, despesas, clientes, categorias, impostos, metas e dados da empresa. Seu perfil e conta serão mantidos.
            </p>
            <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setConfirmText(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  Começar do Zero
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apagará permanentemente todos os seus dados financeiros. Digite <strong>CONFIRMAR</strong> abaixo para continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder='Digite "CONFIRMAR"'
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "CONFIRMAR" || clearData.isPending}
                    onClick={(e) => { e.preventDefault(); clearData.mutate(); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearData.isPending ? "Apagando..." : "Apagar tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          {/* Excluir conta */}
          <div>
            <p className="text-sm font-medium mb-1">Excluir conta</p>
            <p className="text-sm text-muted-foreground mb-3">Excluir sua conta é irreversível. Todos os seus dados serão apagados.</p>
            <Button variant="destructive">Excluir minha conta</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}