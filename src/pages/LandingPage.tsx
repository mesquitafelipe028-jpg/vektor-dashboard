import { motion } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Zap, BarChart3, 
  CreditCard, MessageSquare, Check, X, HelpCircle,
  TrendingUp, Wallet, PieChart, Users, Sparkles,
  Lock, ArrowUpRight, PlayCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LogoVektor } from "@/components/branding/LogoVektor";

export default function LandingPage() {
  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      description: "Ideal para começar.",
      features: [
        "Até 50 transações por mês",
        "Até 2 cartões de crédito",
        "Relatórios básicos",
        "01 importação de extrato",
      ],
      notIncluded: [
        "Assistente IA",
        "Clientes e cobranças",
        "Fluxo de caixa avançado",
      ],
      buttonText: "Começar agora",
      popular: false,
    },
    {
      name: "Inteligente",
      price: "R$ 23",
      period: "/ mês",
      description: "A IA trabalhando por você.",
      features: [
        "Tudo do Essencial",
        "Assistente financeiro com IA",
        "Análise automática de gastos",
        "Previsões financeiras",
        "Insights automáticos",
        "Mentor financeiro 24/7",
      ],
      buttonText: "Escolher Inteligência",
      popular: true,
      highlight: true,
    },
    {
      name: "Essencial",
      price: "R$ 67",
      period: "único",
      description: "Gestão completa vitalícia.",
      features: [
        "Transações ilimitadas",
        "Cartões ilimitados",
        "Fluxo de caixa completo",
        "Clientes e cobranças",
        "Relatórios avançados",
      ],
      notIncluded: [
        "Assistente IA",
      ],
      buttonText: "Comprar agora",
      popular: false,
    },
  ];

  const features = [
    { title: "Dashboard Inteligente", desc: "Visualize seu dinheiro de forma clara e objetiva.", image: "/images/tutorial/dashboard_real.png", icon: BarChart3 },
    { title: "Gestão de Cobranças", desc: "Gerencie clientes e receba em dia com profissionalismo.", image: "/images/tutorial/cobrancas.png", icon: Users },
    { title: "Importação de Extrato", desc: "Economize horas de digitação importando seu extrato OFX.", image: "/images/tutorial/importacao_real.png", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#030605] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-400 font-sans">
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full opacity-50" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#030605]/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <LogoVektor size="sm" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">Recursos</a>
            <a href="#planos" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">Planos</a>
            <a href="#faq" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold hover:text-emerald-400 transition-colors">Entrar</Link>
            <Link to="/cadastro">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 border-none">
                TESTAR GRÁTIS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                CONTROLE FINANCEIRO COM IA
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                Tome decisões com <br />
                <span className="text-emerald-500 italic drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">dados reais</span>, não com achismo.
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                O Vektor é a plataforma completa para MEIs e pequenos empreendedores organizarem receitas, despesas e cartões com inteligência artificial.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
            >
              <Link to="/cadastro">
                <Button size="lg" className="h-16 px-10 text-lg font-black bg-amber-400 hover:bg-amber-500 text-black gap-2 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                  TESTAR AGORA <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="ghost" className="h-16 px-10 text-lg font-bold text-emerald-400 hover:bg-emerald-500/10 gap-2">
                <PlayCircle className="h-5 w-5" /> Ver demonstração
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative group lg:px-10"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-800 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <img 
                  src="/images/tutorial/dashboard_real.png" 
                  alt="Vektor Real Dashboard" 
                  className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <p className="text-zinc-500 font-bold text-sm tracking-widest uppercase mb-8">Utilizado por empreendedores que buscam clareza</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale contrast-125">
            {/* Logo placeholders/icons to simulate partners */}
            <LogoVektor size="sm" />
            <div className="font-black text-2xl">FINTECH_</div>
            <div className="font-black text-2xl">MEI_HUB</div>
            <div className="font-black text-2xl">GESTAO+</div>
            <div className="font-black text-2xl">PRO_FLOW</div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section id="recursos" className="py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Tudo o que você precisa.</h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">Elimine as planilhas confusas e tenha o controle total do seu fluxo de caixa.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              {features.map((f, i) => (
                <div key={i} className="group cursor-default">
                  <div className="flex gap-6 items-start">
                    <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
                      <f.icon className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">{f.title}</h3>
                      <p className="text-zinc-400 leading-relaxed text-lg">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-emerald-500/20 blur-[100px] rounded-full opacity-20" />
              <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-2 overflow-hidden">
                <img 
                  src="/images/tutorial/cobrancas.png" 
                  alt="Recursos Vektor" 
                  className="rounded-xl w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Proof Section */}
      <section className="py-24 bg-emerald-500/5 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Usuários Ativos", val: "+15k" },
              { label: "Transações/mês", val: "200k+" },
              { label: "Avaliação", val: "4.9/5" },
              { label: "Suporte", val: "24/7" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black text-emerald-500 mb-2">{s.val}</div>
                <div className="text-zinc-500 font-bold text-sm uppercase tracking-tighter">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 border-amber-400/30 bg-amber-400/5 text-amber-400 font-bold px-6 py-2">
            PLANOS E PREÇOS
          </Badge>
          <h2 className="text-4xl md:text-7xl font-black mb-20 tracking-tighter">Escolha como quer <br /> <span className="text-emerald-500 underline decoration-emerald-500/30 decoration-8 underline-offset-8">evoluir seu negócio.</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`flex flex-col border-white/10 bg-zinc-900/40 backdrop-blur-sm transition-all duration-500 hover:translate-y-[-10px] ${plan.highlight ? 'border-amber-400/50 ring-1 ring-amber-400/20 shadow-[0_0_50px_rgba(251,191,36,0.1)] scale-105 z-10' : 'hover:border-emerald-500/30'}`}
              >
                <CardHeader className="text-left pt-10">
                  {plan.highlight && <div className="text-amber-400 text-xs font-black uppercase tracking-widest mb-4">Recomendado</div>}
                  <CardTitle className="text-2xl font-black text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-zinc-500 text-lg">{plan.description}</CardDescription>
                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-zinc-500 font-bold">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 text-left space-y-6 py-10">
                  <div className="h-px bg-white/5 w-full" />
                  <div className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex gap-4 items-center text-sm font-medium text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded && plan.notIncluded.map((feature, j) => (
                      <div key={j} className="flex gap-4 items-center text-sm font-medium text-zinc-600">
                        <X className="h-5 w-5 text-zinc-800 shrink-0" />
                        <span className="line-through">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pb-10 pt-4">
                  <Link to="/cadastro" className="w-full">
                    <Button 
                      className={`w-full h-14 font-black text-lg transition-transform active:scale-95 ${plan.highlight ? 'bg-amber-400 hover:bg-amber-500 text-black shadow-lg shadow-amber-400/20' : 'bg-emerald-500 hover:bg-emerald-600 text-black'}`}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="mt-12 text-zinc-500 text-sm font-medium">Sem fidelidade. Cancele quando quiser. Pagamento seguro.</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-zinc-900/20 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row gap-20">
            <div className="w-full md:w-1/3">
              <h2 className="text-4xl font-black mb-6 leading-none">Dúvidas Frequentes</h2>
              <p className="text-zinc-500 font-medium">Tudo o que você precisa saber para começar agora mesmo.</p>
              <Button variant="link" className="text-emerald-500 font-bold p-0 mt-6 h-auto text-lg gap-2">
                Falar com consultor <ArrowUpRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                  { q: "O Vektor é seguro para meus dados?", a: "Absolutamente. Utilizamos criptografia de nível bancário e armazenamento seguro no Supabase. Seus dados são privados e nunca compartilhados." },
                  { q: "Como funciona o período de teste?", a: "Você pode começar no plano Free sem cadastrar cartão de crédito. Use todas as funções básicas e decida se quer evoluir para os planos pagos quando sentir necessidade." },
                  { q: "IA realmente ajuda nas finanças?", a: "Sim, nossa IA categoriza gastos automaticamente, identifica padrões de desperdício e sugere economias personalizadas baseadas no seu fluxo real." },
                  { q: "Trabalho como MEI, serve para mim?", a: "O Vektor foi construído com o MEI em mente. Temos ferramentas de faturamento, controle de clientes e relatórios simplificados para quem empreende sozinho." },
                ].map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border border-white/5 bg-zinc-900/40 rounded-2xl px-6 data-[state=open]:border-emerald-500/30 transition-all">
                    <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-6">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-400 text-lg leading-relaxed pb-6">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/10 blur-[150px] rounded-full scale-150" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-12 md:p-24 text-center text-black shadow-2xl relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="space-y-10 relative z-10">
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">
                Pronto para sair do <br className="hidden md:block" /> escuro financeiro?
              </h2>
              <p className="text-xl md:text-2xl font-bold text-black/80 max-w-2xl mx-auto">
                Comece agora e tenha o controle total da sua empresa em menos de 5 minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/cadastro">
                  <Button size="lg" className="h-20 px-16 text-xl font-black bg-zinc-950 text-emerald-500 hover:bg-zinc-900 rounded-full">
                    CRIAR MINHA CONTA
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-black/70 font-bold">
                  <ShieldCheck className="h-6 w-6" />
                  Sem cartão necessário
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-4">
              <LogoVektor size="sm" />
              <p className="text-zinc-500 font-medium text-center md:text-left">Inteligência financeira para o pequeno empreendedor.</p>
            </div>
            <div className="flex gap-10 text-zinc-400 font-bold text-sm">
              <a href="#" className="hover:text-emerald-500 transition-colors">Instagram</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">Youtube</a>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-600 text-xs font-bold uppercase tracking-widest">
            <p>© 2026 VEKTOR TECNOLOGIA LTDA.</p>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
