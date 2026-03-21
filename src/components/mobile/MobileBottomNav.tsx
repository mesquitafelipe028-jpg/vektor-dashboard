import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Plus, X, Receipt, UserPlus, MoreHorizontal, LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Receitas", icon: TrendingUp, path: "/receitas" },
  { label: "Adicionar", icon: Plus, path: "", isFab: true },
  { label: "Despesas", icon: TrendingDown, path: "/despesas" },
  { label: "Mais", icon: MoreHorizontal, path: "/mais" },
];

const quickActions = [
  { label: "Nova Receita", icon: TrendingUp, path: "/receitas/nova", color: "text-primary" },
  { label: "Nova Despesa", icon: Receipt, path: "/despesas/nova", color: "text-destructive" },
  { label: "+ Investimento", icon: LineChart, path: "/despesas/nova?tipo=investment", color: "text-primary" },
  { label: "Novo Cliente", icon: UserPlus, path: "/clientes/novo", color: "text-primary/70" },
];

export function MobileBottomNav() {
  const [fabOpen, setFabOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[998]"
              onClick={() => setFabOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="fixed left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-3 items-center"
              style={{ bottom: "calc(var(--mobile-nav-height) + var(--safe-area-bottom) + 1.5rem)" }}
            >
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => { setFabOpen(false); setTimeout(() => navigate(action.path), 200); }}
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

      <nav 
        className="fixed bottom-0 left-0 right-0 z-[997] bg-card/95 backdrop-blur-xl border-t border-border/50 md:hidden" 
        style={{ 
          paddingBottom: "var(--safe-area-bottom)",
          height: "calc(var(--mobile-nav-height) + var(--safe-area-bottom))"
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <div key="fab-placeholder" className="relative flex items-center justify-center w-16">
                  <button
                    onClick={() => setFabOpen((v) => !v)}
                    className="absolute -top-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-background active:scale-90 transition-all duration-300"
                    style={{ width: "3.75rem", height: "3.75rem" }}
                  >
                    <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
                    </motion.div>
                  </button>
                </div>
              );
            }

            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-all duration-200",
                  active ? "text-primary scale-110" : "text-muted-foreground/70 hover:text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-semibold tracking-tight", active ? "opacity-100" : "opacity-80")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
