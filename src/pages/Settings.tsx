import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2, Search, Loader2, CheckCircle2, AlertCircle, Trash2,
  Sun, Moon, Monitor, User, Palette, Bell, BarChart3, Settings2,
  Info, LogOut, ChevronRight, Lock, Mail, KeyRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { SettingsItem } from "@/components/settings/SettingsItem";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useUserPreferences } from "@/hooks/useUserPreferences";

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
  return parseInt(digits[12]) === calc(digits, w1) && parseInt(digits[13]) === calc(digits, w2);
}

interface EmpresaData {
  cnpj: string; razao_social: string; nome_fantasia: string;
  situacao_cadastral: string; data_abertura: string;
  cnae_principal: string; natureza_juridica: string;
}

const emptyEmpresa: EmpresaData = {
  cnpj: "", razao_social: "", nome_fantasia: "", situacao_cadastral: "",
  data_abertura: "", cnae_principal: "", natureza_juridica: "",
};

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { preferences, updatePreference } = useUserPreferences();

  // Profile
  const [nome, setNome] = useState("");

  // Password
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Company
  const [empresa, setEmpresa] = useState<EmpresaData>(emptyEmpresa);
  const [cnpjInput, setCnpjInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [cnpjFound, setCnpjFound] = useState<boolean | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Reset dialog
  const [confirmText, setConfirmText] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: savedEmpresa } = useQuery({
    queryKey: ["empresa", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("empresas").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => { if (profile) setNome(profile.nome); }, [profile]);

  useEffect(() => {
    if (savedEmpresa) {
      setEmpresa({
        cnpj: savedEmpresa.cnpj || "", razao_social: savedEmpresa.razao_social || "",
        nome_fantasia: savedEmpresa.nome_fantasia || "", situacao_cadastral: savedEmpresa.situacao_cadastral || "",
        data_abertura: savedEmpresa.data_abertura || "", cnae_principal: savedEmpresa.cnae_principal || "",
        natureza_juridica: savedEmpresa.natureza_juridica || "",
      });
      setCnpjInput(formatCnpj(savedEmpresa.cnpj || ""));
      setCnpjFound(true);
    }
  }, [savedEmpresa]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ nome }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success("Perfil atualizado"); },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const saveEmpresa = useMutation({
    mutationFn: async () => {
      const payload = { ...empresa, user_id: user!.id };
      if (savedEmpresa) {
        const { error } = await (supabase as any).from("empresas").update(payload).eq("id", savedEmpresa.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("empresas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["empresa"] }); toast.success("Dados da empresa salvos!"); },
    onError: () => toast.error("Erro ao salvar dados da empresa."),
  });

  const buscarCnpj = async () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (!isValidCnpj(digits)) { toast.error("CNPJ inválido."); return; }
    setSearching(true); setCnpjFound(null);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!resp.ok) { setCnpjFound(false); toast.error("CNPJ não encontrado."); return; }
      const data = await resp.json();
      setEmpresa({
        cnpj: digits, razao_social: data.razao_social || "", nome_fantasia: data.nome_fantasia || "",
        situacao_cadastral: data.descricao_situacao_cadastral || "", data_abertura: data.data_inicio_atividade || "",
        cnae_principal: data.cnae_fiscal_descricao ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : String(data.cnae_fiscal || ""),
        natureza_juridica: data.natureza_juridica || "",
      });
      setCnpjFound(true); toast.success("Dados do CNPJ encontrados!");
    } catch { setCnpjFound(false); toast.error("Erro ao consultar CNPJ."); }
    finally { setSearching(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error("Erro ao alterar senha"); }
    else { toast.success("Senha alterada com sucesso"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordOpen(false); }
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
      queryClient.invalidateQueries(); setEmpresa(emptyEmpresa); setCnpjInput(""); setCnpjFound(null);
      setResetDialogOpen(false); setConfirmText(""); toast.success("Todos os dados foram apagados!");
    },
    onError: () => toast.error("Erro ao limpar dados."),
  });

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  // Search filter
  const q = searchQuery.toLowerCase();
  const match = (...terms: string[]) => !q || terms.some(t => t.toLowerCase().includes(q));

  const showConta = match("conta", "perfil", "nome", "email", "senha", "sair", "logout");
  const showAparencia = match("aparência", "tema", "claro", "escuro", "dark", "light");
  const showEmpresa = match("empresa", "cnpj", "razão social", "nome fantasia");
  const showNotif = match("notificação", "alerta", "vencimento", "recebimento", "lembrete");
  const showFinanceiro = match("financeiro", "moeda", "fechamento", "dia");
  const showSistema = match("sistema", "exportar", "apagar", "excluir", "zero", "conta");
  const showSobre = match("sobre", "versão", "termos", "suporte");

  let sectionIdx = 0;

  return (
    <div className="space-y-4 max-w-2xl pb-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie seus dados pessoais e do negócio</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar configuração..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Conta */}
      {showConta && (
        <SettingsSection icon={User} title="Conta" index={sectionIdx++}>
          <SettingsItem icon={User} title="Nome completo" description="Seu nome de exibição">
            <div className="flex gap-2">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
                Salvar
              </Button>
            </div>
          </SettingsItem>

          <SettingsItem
            icon={Mail}
            title="E-mail"
            description={user?.email ?? "—"}
            rightComponent={<Badge variant="secondary" className="text-xs">Verificado</Badge>}
          />

          <Collapsible open={passwordOpen} onOpenChange={setPasswordOpen}>
            <CollapsibleTrigger asChild>
              <div>
                <SettingsItem
                  icon={KeyRound}
                  title="Alterar senha"
                  description="Atualize sua senha de acesso"
                  onClick={() => setPasswordOpen(!passwordOpen)}
                  rightComponent={<ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${passwordOpen ? "rotate-90" : ""}`} />}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-12 space-y-3 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha atual</Label>
                  <Input id="current-password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar</Label>
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={changePassword}>Alterar senha</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <SettingsItem
            icon={LogOut}
            title="Sair da conta"
            description="Encerrar sessão atual"
            onClick={handleLogout}
            rightComponent={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          />
        </SettingsSection>
      )}

      {/* Aparência */}
      {showAparencia && (
        <SettingsSection icon={Palette} title="Aparência" index={sectionIdx++}>
          <SettingsItem icon={Sun} title="Tema" description="Escolha a aparência do aplicativo">
            <div className="flex gap-2">
              {[
                { value: "system", label: "Sistema", icon: Monitor },
                { value: "light", label: "Claro", icon: Sun },
                { value: "dark", label: "Escuro", icon: Moon },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? "default" : "outline"}
                  className="flex-1 gap-2"
                  size="sm"
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </SettingsItem>
        </SettingsSection>
      )}

      {/* Empresa */}
      {showEmpresa && (
        <SettingsSection icon={Building2} title="Empresa" index={sectionIdx++}>
          <SettingsItem icon={Building2} title="CNPJ" description="Busque os dados da empresa pelo CNPJ">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1"
                />
                <Button onClick={buscarCnpj} disabled={searching || cnpjInput.replace(/\D/g, "").length < 14} variant="secondary" size="sm">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
              </div>
              {cnpjFound === true && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> CNPJ encontrado</div>
              )}
              {cnpjFound === false && (
                <div className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" /> CNPJ não encontrado</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Razão Social</Label>
                  <Input value={empresa.razao_social} onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })} placeholder="Razão social" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome Fantasia</Label>
                  <Input value={empresa.nome_fantasia} onChange={(e) => setEmpresa({ ...empresa, nome_fantasia: e.target.value })} placeholder="Nome fantasia" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Situação Cadastral</Label>
                  <div className="flex items-center gap-2">
                    <Input value={empresa.situacao_cadastral} onChange={(e) => setEmpresa({ ...empresa, situacao_cadastral: e.target.value })} placeholder="Ex: Ativa" className="flex-1" />
                    {empresa.situacao_cadastral && (
                      <Badge variant={empresa.situacao_cadastral.toLowerCase().includes("ativa") ? "default" : "destructive"} className="shrink-0 text-xs">
                        {empresa.situacao_cadastral}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data de Abertura</Label>
                  <Input value={empresa.data_abertura} onChange={(e) => setEmpresa({ ...empresa, data_abertura: e.target.value })} placeholder="YYYY-MM-DD" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CNAE Principal</Label>
                  <Input value={empresa.cnae_principal} onChange={(e) => setEmpresa({ ...empresa, cnae_principal: e.target.value })} placeholder="Código CNAE" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Natureza Jurídica</Label>
                  <Input value={empresa.natureza_juridica} onChange={(e) => setEmpresa({ ...empresa, natureza_juridica: e.target.value })} placeholder="Ex: MEI" />
                </div>
              </div>
              <Button size="sm" onClick={() => saveEmpresa.mutate()} disabled={saveEmpresa.isPending || !empresa.cnpj}>
                {saveEmpresa.isPending ? "Salvando..." : savedEmpresa ? "Atualizar Empresa" : "Salvar Empresa"}
              </Button>
            </div>
          </SettingsItem>
        </SettingsSection>
      )}

      {/* Notificações */}
      {showNotif && (
        <SettingsSection icon={Bell} title="Notificações" index={sectionIdx++}>
          <SettingsItem
            icon={Bell}
            title="Alertas de vencimento"
            description="Receba avisos sobre contas a vencer"
            rightComponent={<Switch checked={preferences.alerta_vencimento} onCheckedChange={(v) => updatePreference("alerta_vencimento", v)} />}
          />
          <SettingsItem
            icon={Bell}
            title="Recebimentos"
            description="Notificação ao registrar um recebimento"
            rightComponent={<Switch checked={preferences.alerta_recebimentos} onCheckedChange={(v) => updatePreference("alerta_recebimentos", v)} />}
          />
          <SettingsItem
            icon={Bell}
            title="Lembretes"
            description="Lembretes periódicos sobre finanças"
            rightComponent={<Switch checked={preferences.alerta_lembretes} onCheckedChange={(v) => updatePreference("alerta_lembretes", v)} />}
          />
        </SettingsSection>
      )}

      {/* Financeiro */}
      {showFinanceiro && (
        <SettingsSection icon={BarChart3} title="Financeiro" index={sectionIdx++}>
          <SettingsItem icon={BarChart3} title="Moeda padrão" description="Moeda utilizada nos relatórios"
            rightComponent={
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <SettingsItem icon={BarChart3} title="Dia de fechamento" description="Dia do mês para fechamento mensal"
            rightComponent={
              <Input
                type="number" min="1" max="31" value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                className="w-16 h-8 text-center"
              />
            }
          />
        </SettingsSection>
      )}

      {/* Sistema */}
      {showSistema && (
        <SettingsSection icon={Settings2} title="Sistema" index={sectionIdx++}>
          <SettingsItem
            icon={BarChart3}
            title="Exportar dados"
            description="Baixe seus dados em formato CSV"
            onClick={() => toast.info("Funcionalidade em breve!")}
            rightComponent={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          />

          <SettingsItem icon={Trash2} title="Começar do zero" description="Apaga todos os dados financeiros. Perfil e conta são mantidos.">
            <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setConfirmText(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Começar do Zero
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apagará permanentemente todos os seus dados financeiros. Digite <strong>CONFIRMAR</strong> abaixo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input placeholder='Digite "CONFIRMAR"' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
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
          </SettingsItem>

          <SettingsItem
            icon={Trash2}
            title="Excluir conta"
            description="Irreversível. Todos os dados serão apagados."
            rightComponent={<Button variant="destructive" size="sm">Excluir</Button>}
          />
        </SettingsSection>
      )}

      {/* Sobre */}
      {showSobre && (
        <SettingsSection icon={Info} title="Sobre" index={sectionIdx++}>
          <SettingsItem icon={Info} title="Versão" rightComponent={<span className="text-sm text-muted-foreground">1.0.0</span>} />
          <SettingsItem
            icon={Info}
            title="Termos de uso"
            onClick={() => toast.info("Em breve!")}
            rightComponent={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          />
          <SettingsItem
            icon={Info}
            title="Suporte"
            description="Entre em contato conosco"
            onClick={() => toast.info("Em breve!")}
            rightComponent={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          />
        </SettingsSection>
      )}
    </div>
  );
}
