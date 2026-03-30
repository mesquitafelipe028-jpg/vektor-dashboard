import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, TrendingDown, ArrowLeftRight, Receipt, BarChart3,
  Target, Activity, Settings, LogOut, Calculator, CreditCard, Users, Tag,
  ClipboardList, Clock, Wallet, Briefcase, Upload, HelpCircle, Sparkles, Lock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const menuGroups = [
  {
    label: "Visão Geral",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", color: "bg-primary/10 text-primary" },
      { label: "Vektor IA", icon: Sparkles, path: "https://chatvektorapp.vercel.app", color: "bg-primary/10 text-primary", isVektorIA: true },
      { label: "Fluxo de Caixa", icon: ArrowLeftRight, path: "/fluxo-de-caixa", color: "bg-chart-2/10 text-chart-2" },
      { label: "Timeline", icon: Clock, path: "/timeline", color: "bg-chart-3/10 text-chart-3" },
    ],
  },
  {
    label: "Finanças",
    items: [
      { label: "Receitas", icon: TrendingUp, path: "/receitas", color: "bg-primary/10 text-primary" },
      { label: "Despesas", icon: TrendingDown, path: "/despesas", color: "bg-destructive/10 text-destructive" },
      { label: "Contas", icon: Wallet, path: "/contas", color: "bg-chart-1/10 text-chart-1" },
      { label: "Cartões", icon: CreditCard, path: "/cartoes", color: "bg-chart-1/10 text-chart-1" },
      { label: "Clientes", icon: Users, path: "/clientes", color: "bg-chart-3/10 text-chart-3" },
      { label: "Cobranças", icon: ClipboardList, path: "/contas-a-receber", color: "bg-chart-4/10 text-chart-4" },
    ],
  },
  {
    label: "Investimentos",
    items: [
      { label: "Simulador", icon: Calculator, path: "/calculadora-investimentos", color: "bg-chart-2/10 text-chart-2" },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { label: "Metas", icon: Target, path: "/metas", color: "bg-chart-1/10 text-chart-1" },
      { label: "Projetos", icon: Briefcase, path: "/projetos", color: "bg-chart-4/10 text-chart-4" },
      { label: "Análise", icon: Activity, path: "/analise-financeira", color: "bg-accent text-accent-foreground" },
      { label: "Assinaturas", icon: Receipt, path: "/assinaturas", color: "bg-chart-1/10 text-chart-1" },
      { label: "Relatórios", icon: BarChart3, path: "/relatorios", color: "bg-chart-3/10 text-chart-3" },
    ],
  },
  {
    label: "Fiscal",
    items: [
      { label: "Área Fiscal", icon: Receipt, path: "/impostos", color: "bg-chart-4/10 text-chart-4" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Importar Extrato", icon: Upload, path: "/importar-extrato", color: "bg-muted text-muted-foreground" },
      { label: "Categorias", icon: Tag, path: "/categorias", color: "bg-chart-4/10 text-chart-4" },
      { label: "Configurações", icon: Settings, path: "/configuracoes", color: "bg-muted text-muted-foreground" },
      { label: "Guia Vektor", icon: HelpCircle, path: "/tutorial", color: "bg-primary/10 text-primary" },
    ],
  },
];

export default function More() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isIAEnabled } = useSubscription();

  const unlimitedEmails = ["mesquitafelipe028@gmail.com", "elisiane0708@gmail.com", "demo@vektor.app"];
  const isUserUnlimited = user?.email && unlimitedEmails.includes(user.email.toLowerCase());
  const canAccessIA = isIAEnabled || isUserUnlimited;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mais</h1>

      {menuGroups.map((group) => (
        <div key={group.label} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{group.label}</h2>
          <div className="grid grid-cols-3 gap-3">
            {group.items.map((item: any) => {
              const locked = item.isVektorIA ? !canAccessIA : item.isLocked;

              return (
              <button
                key={item.path}
                onClick={() => {
                  if (locked) {
                    toast.error("Vektor IA disponível no plano Inteligente.", {
                      description: "Faça o upgrade para liberar o assistente financeiro.",
                    });
                  } else if (item.isVektorIA) {
                    window.open(item.path, "_blank");
                  } else {
                    navigate(item.path);
                  }
                }}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm active:scale-95 transition-transform relative overflow-hidden"
              >
                {locked && (
                  <div className="absolute top-1 right-1">
                    <Lock className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
                <div className={`flex items-center justify-center h-12 w-12 rounded-full ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{item.label}</span>
              </button>
            )})}
          </div>
        </div>
      ))}

      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive active:scale-95 transition-transform"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-sm font-medium">Sair</span>
      </button>
    </div>
  );
}
