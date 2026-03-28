import { Link } from "react-router-dom";
import { Sparkles, Lock, ArrowRight, Zap, BarChart3, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "ia" | "transaction" | "generic";
}

export function UpgradeModal({
  open,
  onOpenChange,
  reason = "generic",
}: UpgradeModalProps) {
  const content = {
    ia: {
      icon: <Sparkles className="h-10 w-10 text-amber-400" />,
      title: "A IA Financeira é Premium",
      description:
        "A inteligência financeira do Vektor está disponível apenas no plano pago. Registre transações por voz ou texto, obtenha insights automáticos e previsões em segundos.",
      cta: "Desbloquear IA",
    },
    transaction: {
      icon: <Lock className="h-10 w-10 text-red-400" />,
      title: "Limite de Transações Atingido",
      description:
        "Seu período de acesso gratuito expirou. Para continuar registrando receitas e despesas, faça o upgrade para o plano pago.",
      cta: "Continuar usando",
    },
    generic: {
      icon: <Lock className="h-10 w-10 text-primary" />,
      title: "Funcionalidade Premium",
      description:
        "Este recurso está disponível apenas para assinantes do plano pago. Faça o upgrade para ter acesso completo ao Vektor.",
      cta: "Ver planos",
    },
  };

  const c = content[reason];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center gap-4 pt-4">
          <div className="p-4 rounded-full bg-muted/50 border border-border">
            {c.icon}
          </div>
          <div>
            <DialogTitle className="text-xl font-bold font-heading">
              {c.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {c.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Feature highlights */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Incluído no plano pago
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span>IA Financeira 24/7</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <BarChart3 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Insights e previsões automáticas</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Zap className="h-4 w-4 text-blue-400 shrink-0" />
                <span>Transações ilimitadas</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-violet-400 shrink-0" />
                <span>Relatórios avançados</span>
              </div>
            </div>
          </div>

          <Link to="/assinaturas" onClick={() => onOpenChange(false)}>
            <Button className="w-full h-12 font-bold text-base gap-2 bg-emerald-600 hover:bg-emerald-500">
              {c.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
