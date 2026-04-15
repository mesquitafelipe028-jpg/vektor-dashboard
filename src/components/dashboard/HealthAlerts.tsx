import { AlertCircle, CheckCircle2, Info, Target, AlertTriangle, ShieldCheck, ShieldAlert, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export type AlertType = "info" | "success" | "warning" | "danger";

export interface AlertItem {
  id: string;
  icon: any;
  type: AlertType;
  message: string;
  actionRoute?: string;
}

interface HealthAlertsProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
}

const alertStyles = {
  info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700 dark:text-blue-400", iconColor: "text-blue-600" },
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", iconColor: "text-emerald-600" },
  warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-700 dark:text-yellow-400", iconColor: "text-yellow-600" },
  danger: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", iconColor: "text-destructive" },
};

export function HealthAlerts({ alerts, onDismiss }: HealthAlertsProps) {
  const navigate = useNavigate();

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {alerts.map((alert) => {
        const style = alertStyles[alert.type];
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-2",
              style.bg,
              style.border,
              style.text,
              alert.actionRoute ? "cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-95 group" : ""
            )}
            onClick={() => { if (alert.actionRoute) navigate(alert.actionRoute); }}
          >
            <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", style.bg.replace('500/10', '500/20'))}>
              <Icon className={cn("h-4 w-4", style.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-relaxed line-clamp-2">{alert.message}</p>
              {alert.actionRoute && (
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-1 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                  Ver detalhes <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
              className="mt-0.5 ml-2 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-40 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
