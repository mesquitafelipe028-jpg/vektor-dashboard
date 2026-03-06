import { useNavigate } from "react-router-dom";
import {
  Users, ArrowLeftRight, Receipt, BarChart3, Target, Activity, Settings, LogOut, Calculator,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { label: "Clientes", icon: Users, path: "/clientes", color: "bg-primary/10 text-primary" },
  { label: "Fluxo de Caixa", icon: ArrowLeftRight, path: "/fluxo-de-caixa", color: "bg-chart-2/10 text-chart-2" },
  { label: "Área Fiscal", icon: Receipt, path: "/impostos", color: "bg-chart-4/10 text-chart-4" },
  { label: "Relatórios", icon: BarChart3, path: "/relatorios", color: "bg-chart-3/10 text-chart-3" },
  { label: "Metas", icon: Target, path: "/metas", color: "bg-chart-1/10 text-chart-1" },
  { label: "Análise", icon: Activity, path: "/analise-financeira", color: "bg-accent text-accent-foreground" },
  { label: "Calculadora", icon: Calculator, path: "/calculadora-investimentos", color: "bg-chart-2/10 text-chart-2" },
  { label: "Configurações", icon: Settings, path: "/configuracoes", color: "bg-muted text-muted-foreground" },
];

export default function More() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mais</h1>

      <div className="grid grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm active:scale-95 transition-transform"
          >
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

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
