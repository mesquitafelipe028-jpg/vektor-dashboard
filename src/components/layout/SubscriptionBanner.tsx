import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Lock, Zap, Clock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function SubscriptionBanner() {
  const {
    effectivePlanType,
    isTrial,
    isExpired,
    daysRemainingInTrial,
    checkUserAccess,
  } = useSubscription();

  // Verificar expiração quando o componente monta e a cada 10 minutos
  useEffect(() => {
    checkUserAccess();
    const interval = setInterval(checkUserAccess, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkUserAccess]);

  const days = daysRemainingInTrial();
  const isLastDay = days === 1;

  // Não exibir banner para usuários PAID
  if (effectivePlanType === "PAID") return null;

  if (isExpired) {
    return (
      <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-red-950/80 border-b border-red-500/30 text-red-100 text-sm z-40">
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="h-4 w-4 shrink-0 text-red-400" />
          <span className="truncate font-medium">
            🔒 Seu acesso foi limitado. Crie novas transações apenas no plano pago.
          </span>
        </div>
        <Link
          to="/assinaturas"
          className="shrink-0 px-3 py-1 rounded-md bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors"
        >
          Desbloquear agora
        </Link>
      </div>
    );
  }

  if (isTrial) {
    if (isLastDay) {
      return (
        <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-950/80 border-b border-orange-400/30 text-orange-100 text-sm z-40">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400 animate-pulse" />
            <span className="truncate font-medium">
              ⚠️ Último dia de acesso gratuito. Não perca seus dados e funcionalidades!
            </span>
          </div>
          <Link
            to="/assinaturas"
            className="shrink-0 px-3 py-1 rounded-md bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors"
          >
            Ver planos
          </Link>
        </div>
      );
    }

    return (
      <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-950/60 border-b border-amber-500/20 text-amber-100 text-sm z-40">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="truncate font-medium">
            ⏳ Seu acesso gratuito termina em{" "}
            <strong className="text-amber-300">{days} dia{days !== 1 ? "s" : ""}</strong>
            {" "}— A IA só está disponível no plano pago.
          </span>
        </div>
        <Link
          to="/assinaturas"
          className="shrink-0 px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors"
        >
          Desbloquear IA
        </Link>
      </div>
    );
  }

  // FREE (sem trial, sem expiração explícita)
  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-600/30 text-zinc-300 text-sm z-40">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="h-4 w-4 shrink-0 text-yellow-400" />
        <span className="truncate font-medium">
          Você está no plano gratuito. A IA e criação de novas transações estão bloqueadas.
        </span>
      </div>
      <Link
        to="/assinaturas"
        className="shrink-0 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
      >
        Ver planos
      </Link>
    </div>
  );
}
