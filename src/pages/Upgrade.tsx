import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Check, X, ArrowLeft, Sparkles, Zap, BarChart3,
  Shield, Users, CreditCard, Bot, Infinity, Crown,
  TrendingUp, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { LogoVektor } from "@/components/branding/LogoVektor";

const plans = [
  {
    id: "inteligente",
    name: "Inteligente",
    badge: null,
    price: "R$ 23",
    period: "/mês",
    description: "IA trabalhando por você todos os dias.",
    highlight: false,
    cta: "Assinar agora",
    checkoutUrl: "#checkout-inteligente",
    features: [
      { label: "Assistente IA 24/7", included: true },
      { label: "Registro por texto ou voz", included: true },
      { label: "Insights automáticos", included: true },
      { label: "Previsões financeiras", included: true },
      { label: "Transações ilimitadas", included: true },
      { label: "Dashboard completo", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Cartões ilimitados", included: true },
      { label: "Clientes e cobranças", included: true },
    ],
  },
  {
    id: "essencial",
    name: "Essencial Vitalício",
    badge: "Melhor custo-benefício",
    price: "R$ 67",
    period: "pagamento único",
    description: "Acesso completo para sempre, sem mensalidade.",
    highlight: true,
    cta: "Comprar agora",
    checkoutUrl: "#checkout-essencial",
    features: [
      { label: "Assistente IA 24/7", included: false },
      { label: "Registro por texto ou voz", included: false },
      { label: "Insights automáticos", included: true },
      { label: "Previsões financeiras", included: true },
      { label: "Transações ilimitadas", included: true },
      { label: "Dashboard completo", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Cartões ilimitados", included: true },
      { label: "Clientes e cobranças", included: true },
    ],
  },
];

const aiHighlights = [
  {
    icon: Bot,
    title: "Registre em segundos",
    desc: "Mande uma mensagem simples como 'Uber 23' e a IA categoriza, registra e projeta o impacto no seu saldo.",
  },
  {
    icon: BarChart3,
    title: "Insights automáticos",
    desc: "A IA analisa seus gastos e aponta oportunidades de economia sem você precisar fazer nada.",
  },
  {
    icon: TrendingUp,
    title: "Previsões financeiras",
    desc: "Saiba quanto vai sobrar no fim do mês antes do mês acabar, com base no seu histórico real.",
  },
];

export default function UpgradePage() {
  const navigate = useNavigate();
  const { isPaid, isTrial, daysRemainingInTrial } = useSubscription();

  const days = daysRemainingInTrial();

  return (
    <div className="min-h-[100dvh] bg-[#030605] text-zinc-100 selection:bg-emerald-500/30">
      {/* Fixed blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/8 blur-[150px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-amber-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030605]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <LogoVektor size="sm" />
          {isPaid && (
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Crown className="h-3 w-3 mr-1" /> Plano Ativo
            </Badge>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 relative z-10 max-w-5xl">
        {/* Hero */}
        <motion.div
          className="text-center mb-16 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            INTELIGÊNCIA FINANCEIRA COM IA
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1]">
            Desbloqueie a IA e{" "}
            <span className="text-emerald-500 italic drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              pare de perder dinheiro.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            Registre gastos com uma mensagem, receba insights automáticos e
            tome decisões em segundos.
          </p>

          {isTrial && days > 0 && (
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium">
              <Lock className="h-4 w-4" />
              Seu trial gratuito termina em{" "}
              <strong className="text-amber-200">{days} dia{days !== 1 ? "s" : ""}</strong>.
              Faça o upgrade agora e não perca nenhuma funcionalidade.
            </div>
          )}
        </motion.div>

        {/* AI Highlights */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {aiHighlights.map((h, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-3 hover:border-emerald-500/20 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <h.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white">{h.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 flex flex-col gap-6 transition-all duration-300 ${
                plan.highlight
                  ? "border-amber-400/40 bg-gradient-to-b from-amber-950/30 to-zinc-900/40 shadow-[0_0_60px_rgba(251,191,36,0.08)]"
                  : "border-white/8 bg-zinc-900/30 hover:border-emerald-500/20"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-black bg-amber-400 text-black">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {plan.highlight ? (
                    <Crown className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Zap className="h-5 w-5 text-emerald-500" />
                  )}
                  <h2 className="text-xl font-black text-white">{plan.name}</h2>
                </div>
                <p className="text-zinc-400 text-sm">{plan.description}</p>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm font-medium">{plan.period}</span>
                </div>
                {plan.highlight && (
                  <p className="text-xs text-amber-400/80 font-medium flex items-center gap-1">
                    <Infinity className="h-3.5 w-3.5" /> Acesso vitalício, sem renovações
                  </p>
                )}
              </div>

              <div className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-700 shrink-0" />
                    )}
                    <span className={f.included ? "text-zinc-300" : "text-zinc-600 line-through"}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <a href={plan.checkoutUrl}>
                <Button
                  className={`w-full h-14 font-black text-base hover:scale-[1.02] active:scale-[0.99] transition-transform ${
                    plan.highlight
                      ? "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_25px_rgba(251,191,36,0.3)]"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  }`}
                >
                  {plan.cta}
                </Button>
              </a>
            </div>
          ))}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-zinc-500 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" /> Pagamento seguro
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" /> Cancele quando quiser
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" /> +15.000 usuários
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Suporte 24/7
          </span>
        </motion.div>
      </div>
    </div>
  );
}
