import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Plus, X, Receipt, UserPlus,
  MoreHorizontal, Users, ArrowLeftRight, BarChart3, FileText, Target, Activity, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { QuickAddModal } from "./QuickAddModal";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Receitas", icon: TrendingUp, path: "/receitas" },
  { label: "Adicionar", icon: Plus, path: "", isFab: true },
  { label: "Despesas", icon: TrendingDown, path: "/despesas" },
  { label: "Mais", icon: MoreHorizontal, path: "", isMore: true },
];

const quickActions = [
  { label: "Adicionar Receita", icon: TrendingUp, path: "/receitas", color: "text-primary" },
  { label: "Adicionar Despesa", icon: Receipt, path: "/despesas", color: "text-destructive" },
  { label: "Adicionar Cliente", icon: UserPlus, path: "/clientes", color: "text-chart-3" },
];

const moreMenuItems = [
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Fluxo de Caixa", icon: ArrowLeftRight, path: "/fluxo-de-caixa" },
  { label: "Área Fiscal", icon: Receipt, path: "/impostos" },
  { label: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { label: "Relatório Mensal", icon: FileText, path: "/relatorio-mensal" },
  { label: "Metas", icon: Target, path: "/metas" },
  { label: "Análise Financeira", icon: Activity, path: "/analise-financeira" },
  { label: "Configurações", icon: Settings, path: "/configuracoes" },
];

export function MobileBottomNav() {
  const [fabOpen, setFabOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = moreMenuItems.some((item) => isActive(item.path));

  const handleLogout = () => {
    setMoreOpen(false);
    setTimeout(async () => {
      await signOut();
      navigate("/login");
    }, 200);
  };

  return (
    <>
      {/* Quick Add Modal */}
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {/* FAB overlay + actions */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[998]"
              onClick={() => setFabOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-3 items-center"
            >
              {/* Quick transaction button */}
              <button
                onClick={() => {
                  setFabOpen(false);
                  setTimeout(() => setQuickAddOpen(true), 200);
                }}
                className="flex items-center gap-3 bg-card border border-border rounded-full px-5 py-3 shadow-lg min-w-[200px]"
              >
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Registro Rápido</span>
              </button>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setFabOpen(false);
                    setTimeout(() => navigate(action.path), 200);
                  }}
                  className="flex items-center gap-3 bg-card border border-border rounded-full px-5 py-3 shadow-lg min-w-[200px]"
                >
                  <action.icon className={cn("h-5 w-5", action.color)} />
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* More drawer */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 flex flex-col gap-1">
            {moreMenuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setMoreOpen(false);
                    setTimeout(() => navigate(item.path), 200);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="my-2 h-px bg-border" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[997] bg-card border-t border-border md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <button
                  key="fab"
                  onClick={() => setFabOpen((v) => !v)}
                  className="relative -mt-5 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
                >
                  <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                    {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                  </motion.div>
                </button>
              );
            }

            if (item.isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors",
                    isMoreActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Mais</span>
                </button>
              );
            }

            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
