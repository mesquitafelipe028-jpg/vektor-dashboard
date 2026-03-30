import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle, Lock, Zap, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function SubscriptionBanner() {
  const navigate = useNavigate();
  const {
    effectivePlanType,
    isTrial,
    isExpired,
    daysRemainingInTrial,
    checkUserAccess,
  } = useSubscription();

  const [dismissed, setDismissed] = useState(false);
  const [days, setDays] = useState(0);

  // Sincroniza dias e verifica expiração a cada minuto
  useEffect(() => {
    const update = () => {
      setDays(daysRemainingInTrial());
      checkUserAccess();
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [daysRemainingInTrial, checkUserAccess]);

  // Não exibir para PAID
  if (effectivePlanType === "PAID") return null;

  // Expirado sempre aparece (não pode ser dispensado)
  const canDismiss = isTrial && days > 2;
  if (dismissed && canDismiss) return null;

  /* ── Variantes de conteúdo ────────────────────────────────── */
  type Variant = {
    bg: string;
    border: string;
    icon: React.ReactNode;
    message: string;
    sub?: string;
    cta: string;
    ctaStyle: string;
  };

  let variant: Variant;

  if (isExpired) {
    variant = {
      bg: "bg-red-950",
      border: "border-b border-red-500/25",
      icon: <Lock className="h-3.5 w-3.5 shrink-0 text-red-400" />,
      message: "Seu acesso foi limitado.",
      sub: "Novas transações e IA estão bloqueadas.",
      cta: "Ativar acesso completo",
      ctaStyle:
        "bg-red-500 hover:bg-red-400 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]",
    };
  } else if (days <= 1) {
    // Último dia
    variant = {
      bg: "bg-orange-950",
      border: "border-b border-orange-500/25",
      icon: (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-400 animate-pulse" />
      ),
      message: days === 0 ? "Seu trial expira hoje!" : "Último dia de acesso gratuito.",
      sub: "Faça o upgrade para não perder nenhuma funcionalidade.",
      cta: "Desbloquear agora",
      ctaStyle:
        "bg-orange-500 hover:bg-orange-400 text-white font-bold shadow-[0_0_12px_rgba(249,115,22,0.4)]",
    };
  } else {
    // Trial ativo
    variant = {
      bg: "bg-amber-950/70",
      border: "border-b border-amber-500/20",
      icon: <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
      message: `Acesso gratuito: ${days} dia${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}.`,
      sub: undefined,
      cta: "Ver planos",
      ctaStyle:
        "bg-amber-400 hover:bg-amber-300 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    };
  }

  return (
    <div
      className={`w-full ${variant.bg} ${variant.border}`}
      role="banner"
      aria-label="Status do plano"
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 h-10 flex items-center gap-3">
        {/* Ícone + texto */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {variant.icon}
          <p className="text-xs sm:text-sm font-semibold text-white leading-none truncate">
            {variant.message}
            {variant.sub && (
              <span className="hidden sm:inline text-white/60 font-normal ml-1.5">
                {variant.sub}
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/upgrade")}
          className={`shrink-0 flex items-center gap-1.5 px-3 h-6 rounded-md text-xs transition-all duration-150 hover:scale-105 active:scale-95 ${variant.ctaStyle}`}
        >
          <Zap className="h-3 w-3" />
          <span className="hidden xs:inline">{variant.cta}</span>
          <span className="xs:hidden">Upgrade</span>
        </button>

        {/* Fechar (só para trial com +2 dias) */}
        {canDismiss && (
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded text-white/40 hover:text-white/80 transition-colors"
            aria-label="Fechar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
